import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDebateBySlug } from "@/features/debates/services/debate-service";
import { DebateRoom } from "@/features/debates/components/debate-room";

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
  let debateData = null;

  try {
    debateData = await getDebateBySlug(slug, supabase);
  } catch (error) {
    console.error("Error generating metadata for debate:", error);
  }

  return {
    title: debateData ? `${debateData.room.title} | Discora Debate` : "Debate | Discora",
    description:
      debateData?.room.description ||
      "Browse and participate in structured debates on Discora.",
  };
}

export default async function DebateRoomPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const highlightId = resolvedSearchParams.highlight || null;

  const supabase = await createServerSupabaseClient();
  let debateData = null;

  try {
    debateData = await getDebateBySlug(slug, supabase);
  } catch (error) {
    console.error("Error fetching debate details:", error);
  }

  if (!debateData) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <DebateRoom initialData={debateData} highlightId={highlightId} />
    </main>
  );
}
