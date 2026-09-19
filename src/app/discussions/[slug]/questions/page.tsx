import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug, getQuestionsPaginated } from "@/features/discussions/services/discussion-service";
import { DiscussionQuestionsSection } from "@/features/discussions/components/discussion-section";
import { isPubliclyVisibleRoom } from "@/lib/seo/public-room";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient()).catch(() => null);
  const title = item?.room.title ? `${item.room.title} | Questions` : "Questions";
  return {
    title,
    description: item?.room.description || "Questions and open inquiries in this discussion.",
  };
}

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
    <DiscussionQuestionsSection
      roomId={item.room.id}
      initialQuestionsPage={initialQuestionsPage}
    />
  );
}