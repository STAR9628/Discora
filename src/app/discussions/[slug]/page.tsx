import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug } from "@/features/discussions/services/discussion-service";
import { DiscussionRoom } from "@/features/discussions/components/discussion-room";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    highlight?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  let discussionItem = null;

  try {
    discussionItem = await getDiscussionBySlug(slug, supabase);
  } catch (error) {
    console.error("Error generating metadata for discussion:", error);
  }

  return {
    title: discussionItem ? `${discussionItem.room.title} | Discora` : "Discussion | Discora",
    description:
      discussionItem?.room.description ||
      "Browse and participate in structured, open-exploration discussions on Discora.",
  };
}

export default async function DiscussionRoomPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const highlightId = resolvedSearchParams.highlight || null;

  const supabase = await createServerSupabaseClient();
  let discussionItem = null;

  try {
    discussionItem = await getDiscussionBySlug(slug, supabase);
  } catch (error) {
    console.error("Error fetching discussion details:", error);
  }

  if (!discussionItem) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <DiscussionRoom initialData={discussionItem} highlightId={highlightId} />
    </main>
  );
}
