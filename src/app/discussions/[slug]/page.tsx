import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug } from "@/features/discussions/services/discussion-service";
import { RoomSectionShell } from "@/features/rooms/components/room-section-shell";
import { DiscussionOverviewUnderstanding } from "@/features/discussions/components/discussion-overview-understanding";
import { SaveButton } from "@/features/saves/components/save-button";

type PageProps = {
  params: Promise<{
    slug: string;
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

export default async function DiscussionRoomPage({ params }: PageProps) {
  const { slug } = await params;

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

  if (discussionItem.room.roomType === "debate") {
    redirect(`/debates/${slug}`);
  }

  const sections = [
    ["Claims", "Inspect the room's reasoning and linked support.", "claims"],
    ["Evidence", "Inspect supporting, contradicting, and contextual evidence.", "evidence"],
    ["Questions & Inquiries", "Inspect what remains open or needs clarification.", "questions"],
    ["Contributions", "Read the discussion thread when it adds context.", "contributions"],
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <RoomSectionShell
        roomType="discussion"
        slug={slug}
        title={discussionItem.room.title}
        description={discussionItem.room.description}
        premise={discussionItem.discussion?.openingStatement}
        section="overview"
        headerAction={
          <SaveButton targetType="discussion" targetId={discussionItem.room.id} showLabel />
        }
        beforeNav={
          <DiscussionOverviewUnderstanding
            roomId={discussionItem.room.id}
            slug={slug}
          />
        }
      >
        <section className="grid gap-4 sm:grid-cols-2">
          {sections.map(([title, copy, path]) => (
            <Link
              key={path}
              href={`/discussions/${slug}/${path}`}
              className="rounded-2xl border border-border/70 bg-card/30 p-5 transition-colors hover:bg-card/50"
            >
              <h2 className="font-bold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
              <span className="mt-4 inline-block text-xs font-bold text-primary">
                Inspect {title} →
              </span>
            </Link>
          ))}
        </section>
      </RoomSectionShell>
    </main>
  );
}
