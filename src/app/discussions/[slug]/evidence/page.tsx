import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug } from "@/features/discussions/services/discussion-service";
import { RoomSectionShell } from "@/features/rooms/components/room-section-shell";
import { DiscussionEvidenceSection } from "@/features/discussions/components/discussion-section";
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ highlight?: string }> }) { const { slug } = await params; const item = await getDiscussionBySlug(slug, await createServerSupabaseClient()); if (!item) notFound(); return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><RoomSectionShell roomType="discussion" slug={slug} title={item.room.title} description={item.room.description} premise={item.discussion?.openingStatement} section="evidence"><DiscussionEvidenceSection roomId={item.room.id} highlightId={(await searchParams).highlight} /></RoomSectionShell></main>; }
