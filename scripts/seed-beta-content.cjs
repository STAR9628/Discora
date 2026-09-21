const { Client } = require('pg');
const discussions = require('./data/discussions-data.cjs');
const debates = require('./data/debates-data.cjs');

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  });

  await client.connect();
  console.log('Connected to database.');

  // 1. Fetch topics
  const topicsRes = await client.query('SELECT id, slug, name FROM public.topics');
  const topicMap = new Map();
  for (const t of topicsRes.rows) {
    topicMap.set(t.slug, t.id);
  }
  console.log(`Loaded ${topicMap.size} topics from database.`);

  // 2. Fetch existing rooms to identify duplicates / existing content
  const existingRoomsRes = await client.query('SELECT id, title, slug, room_type FROM public.rooms');
  const existingRoomsByTitle = new Map();
  for (const r of existingRoomsRes.rows) {
    existingRoomsByTitle.set(r.title, r);
  }
  console.log(`Existing rooms in DB before seeding: ${existingRoomsRes.rows.length}`);

  let insertedDiscussions = 0;
  let updatedDiscussions = 0;
  let insertedDebates = 0;
  let updatedDebates = 0;

  // 3. Seed Discussions (D01 - D39)
  console.log('\n--- Seeding 39 Locked Discussions ---');
  for (const d of discussions) {
    const topicId = topicMap.get(d.topicSlug);
    if (!topicId) {
      throw new Error(`Topic slug not found: ${d.topicSlug} for discussion ${d.code}`);
    }

    const existing = existingRoomsByTitle.get(d.title);
    if (existing) {
      // Update room & discussion metadata
      await client.query(
        `UPDATE public.rooms SET description = $1, topic_id = $2, visibility = 'public', status = 'open', updated_at = now() WHERE id = $3`,
        [d.description, topicId, existing.id]
      );
      await client.query(
        `INSERT INTO public.discussions (id, opening_statement, summary, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (id) DO UPDATE SET opening_statement = EXCLUDED.opening_statement, summary = EXCLUDED.summary, updated_at = now()`,
        [existing.id, d.openingStatement, d.summary ?? d.description]
      );
      updatedDiscussions++;
    } else {
      // Insert new room (auto_slugify_trigger will generate unique slug)
      const roomRes = await client.query(
        `INSERT INTO public.rooms (title, description, room_type, topic_id, visibility, status, created_by)
         VALUES ($1, $2, 'discussion', $3, 'public', 'open', NULL)
         RETURNING id, slug`,
        [d.title, d.description, topicId]
      );
      const roomId = roomRes.rows[0].id;

      await client.query(
        `INSERT INTO public.discussions (id, opening_statement, summary)
         VALUES ($1, $2, $3)`,
        [roomId, d.openingStatement, d.summary ?? d.description]
      );
      insertedDiscussions++;
    }
  }

  // 4. Seed Debates (B01 - B50)
  console.log('\n--- Seeding 50 Locked Debates ---');
  for (const b of debates) {
    const topicId = topicMap.get(b.topicSlug);
    if (!topicId) {
      throw new Error(`Topic slug not found: ${b.topicSlug} for debate ${b.code}`);
    }

    const existing = existingRoomsByTitle.get(b.title);
    if (existing) {
      await client.query(
        `UPDATE public.rooms SET description = $1, topic_id = $2, visibility = 'public', status = 'open', updated_at = now() WHERE id = $3`,
        [b.description, topicId, existing.id]
      );
      await client.query(
        `INSERT INTO public.debates (id, proposition_title, opposition_title, opening_statement, status, updated_at)
         VALUES ($1, $2, $3, $4, 'active', now())
         ON CONFLICT (id) DO UPDATE SET
           proposition_title = EXCLUDED.proposition_title,
           opposition_title = EXCLUDED.opposition_title,
           opening_statement = EXCLUDED.opening_statement,
           status = 'active',
           updated_at = now()`,
        [existing.id, b.propositionTitle, b.oppositionTitle, b.openingStatement]
      );
      updatedDebates++;
    } else {
      const roomRes = await client.query(
        `INSERT INTO public.rooms (title, description, room_type, topic_id, visibility, status, created_by)
         VALUES ($1, $2, 'debate', $3, 'public', 'open', NULL)
         RETURNING id, slug`,
        [b.title, b.description, topicId]
      );
      const roomId = roomRes.rows[0].id;

      await client.query(
        `INSERT INTO public.debates (id, proposition_title, opposition_title, opening_statement, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [roomId, b.propositionTitle, b.oppositionTitle, b.openingStatement]
      );
      insertedDebates++;
    }
  }

  // 5. Verification & Audit Summary
  console.log('\n================ SEEDING COMPLETE ================');
  console.log(`Discussions: ${insertedDiscussions} inserted, ${updatedDiscussions} updated (Total: ${discussions.length})`);
  console.log(`Debates: ${insertedDebates} inserted, ${updatedDebates} updated (Total: ${debates.length})`);

  const totalDiscussions = await client.query(`SELECT count(*) FROM public.rooms WHERE room_type = 'discussion'`);
  const totalDebates = await client.query(`SELECT count(*) FROM public.rooms WHERE room_type = 'debate'`);
  const totalRooms = await client.query(`SELECT count(*) FROM public.rooms`);

  console.log(`\nDATABASE AUDIT:`);
  console.log(`Total discussion rooms in DB: ${totalDiscussions.rows[0].count}`);
  console.log(`Total debate rooms in DB: ${totalDebates.rows[0].count}`);
  console.log(`Total rooms in DB: ${totalRooms.rows[0].count}`);

  // Check approved content counts
  const approvedDiscInDB = await client.query(
    `SELECT count(*) FROM public.rooms r
     JOIN public.discussions d ON d.id = r.id
     WHERE r.title = ANY($1::text[])`,
    [discussions.map(x => x.title)]
  );
  console.log(`Verified approved discussions present in DB: ${approvedDiscInDB.rows[0].count} / 39`);

  const approvedDebatesInDB = await client.query(
    `SELECT count(*) FROM public.rooms r
     JOIN public.debates b ON b.id = r.id
     WHERE r.title = ANY($1::text[])`,
    [debates.map(x => x.title)]
  );
  console.log(`Verified approved debates present in DB: ${approvedDebatesInDB.rows[0].count} / 50`);

  // Breakdown by category
  const categoryBreakdown = await client.query(`
    SELECT t.name as topic_name, r.room_type, count(*) as count
    FROM public.rooms r
    JOIN public.topics t ON t.id = r.topic_id
    WHERE r.title = ANY($1::text[]) OR r.title = ANY($2::text[])
    GROUP BY t.name, r.room_type
    ORDER BY t.name, r.room_type
  `, [discussions.map(x => x.title), debates.map(x => x.title)]);

  console.log('\nCategory Breakdown of Approved Content:');
  console.table(categoryBreakdown.rows);

  await client.end();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
