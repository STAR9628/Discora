import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug } from "@/features/discussions/services/discussion-service";
import { RoomSourcesTab } from "@/features/discussions/components/room-sources-tab";

export default async function DiscussionSourcesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient());
  if (!item) notFound();

  return <RoomSourcesTab roomId={item.room.id} evidenceLensBasePath={`/discussions/${slug}`} />;
}
