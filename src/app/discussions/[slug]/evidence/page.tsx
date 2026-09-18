import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug, getEvidencePaginated } from "@/features/discussions/services/discussion-service";
import { RoomSectionShell } from "@/features/rooms/components/room-section-shell";
import { DiscussionEvidenceSection } from "@/features/discussions/components/discussion-section";
import { isPubliclyVisibleRoom } from "@/lib/seo/public-room";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient());
  if (!item) notFound();
  const sp = await searchParams;

  // Public-room SSR: first evidence page (same pageSize the section uses).
  // Gated + fail-open; see the discussion root page for the contract.
  let initialEvidencePage;
  if (isPubliclyVisibleRoom(item.room)) {
    try {
      initialEvidencePage = await getEvidencePaginated(item.room.id, {
        pageSize: 20,
        overrideClient: await createServerSupabaseClient(),
      });
    } catch {
      // Fall through to client-side fetching.
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <RoomSectionShell
        roomType="discussion"
        slug={slug}
        title={item.room.title}
        description={item.room.description}
        premise={item.discussion?.openingStatement}
        section="evidence"
      >
        <DiscussionEvidenceSection
          roomId={item.room.id}
          highlightId={sp.highlight}
          initialEvidencePage={initialEvidencePage}
        />
      </RoomSectionShell>
    </main>
  );
}