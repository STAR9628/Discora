import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug, getQuestionsPaginated } from "@/features/discussions/services/discussion-service";
import { RoomSectionShell } from "@/features/rooms/components/room-section-shell";
import { DiscussionQuestionsSection } from "@/features/discussions/components/discussion-section";
import { isPubliclyVisibleRoom } from "@/lib/seo/public-room";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient());
  if (!item) notFound();

  // Public-room SSR: first questions page (same pageSize the section uses).
  // Gated + fail-open; see the discussion root page for the contract.
  let initialQuestionsPage;
  if (isPubliclyVisibleRoom(item.room)) {
    try {
      initialQuestionsPage = await getQuestionsPaginated(item.room.id, {
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
        section="questions"
      >
        <DiscussionQuestionsSection
          roomId={item.room.id}
          initialQuestionsPage={initialQuestionsPage}
        />
      </RoomSectionShell>
    </main>
  );
}