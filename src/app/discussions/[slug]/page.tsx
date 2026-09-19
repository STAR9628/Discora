import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/services/supabase/server";
import {
  getClaimRelations,
  getClaims,
  getDiscussionBySlug,
  getEvidenceForRoom,
  getQuestions,
  getRoomArguments,
} from "@/features/discussions/services/discussion-service";
import { getInquiryCountsByRoom } from "@/features/inquiries/services/inquiry-service";
import { DiscussionOverviewUnderstanding } from "@/features/discussions/components/discussion-overview-understanding";
import { isPubliclyVisibleRoom } from "@/lib/seo/public-room";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function truncateText(text?: string | null, length = 160) {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  let discussionItem = null;

  try {
    discussionItem = await getDiscussionBySlug(slug, supabase);
  } catch (error) {
    console.error("Error generating metadata for discussion:", error);
  }

  const isPublicRoom = discussionItem?.room.visibility === "public";

  if (!discussionItem || !isPublicRoom) {
    return {
      title: "Discussion",
      description: "Browse and participate in structured, open-exploration discussions on Discora.",
      robots: { index: false },
    };
  }

  const description =
    truncateText(discussionItem.room.description || discussionItem.discussion?.openingStatement) ||
    "A structured discussion on Discora.";

  return {
    title: `${discussionItem.room.title} | Discora`,
    description,
    openGraph: {
      type: "article",
      title: discussionItem.room.title,
      description,
    },
  };
}

export default async function Page({ params }: PageProps) {
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

  // Public-room SSR: the same SoU inputs the client fetches, executed once on
  // the server so initial HTML carries the deterministic understanding.
  // Gated + fail-open; SoU computation itself is unchanged (pure function).
  let initial:
    | {
        claims: Awaited<ReturnType<typeof getClaims>>;
        roomEvidence: Awaited<ReturnType<typeof getEvidenceForRoom>>;
        questions: Awaited<ReturnType<typeof getQuestions>>;
        relations: Awaited<ReturnType<typeof getClaimRelations>>;
        inquiryCounts: Awaited<ReturnType<typeof getInquiryCountsByRoom>>;
        roomArguments: Awaited<ReturnType<typeof getRoomArguments>>;
      }
    | undefined;
  if (isPubliclyVisibleRoom(discussionItem.room)) {
    try {
      const supabaseSSR = await createServerSupabaseClient();
      const [claims, roomEvidence, questions, relations, inquiryCounts, roomArguments] = await Promise.all([
        getClaims(discussionItem.room.id, undefined, supabaseSSR),
        getEvidenceForRoom(discussionItem.room.id, supabaseSSR),
        getQuestions(discussionItem.room.id, supabaseSSR),
        getClaimRelations(discussionItem.room.id, supabaseSSR),
        getInquiryCountsByRoom(discussionItem.room.id, supabaseSSR),
        getRoomArguments(discussionItem.room.id, supabaseSSR),
      ]);
      initial = { claims, roomEvidence, questions, relations, inquiryCounts, roomArguments };
    } catch {
      // Fall through to client-side fetching.
    }
  }

  const sections = [
    ["Claims", "Inspect the room's reasoning and linked support.", "claims"],
    ["Evidence", "Inspect supporting, contradicting, and contextual evidence.", "evidence"],
    ["Questions & Inquiries", "Inspect what remains open or needs clarification.", "questions"],
    ["Contributions", "Read the discussion thread when it adds context.", "contributions"],
  ];

  return (
    <div className="space-y-6">
      <DiscussionOverviewUnderstanding
        roomId={discussionItem.room.id}
        slug={slug}
        initialClaims={initial?.claims}
        initialEvidence={initial?.roomEvidence}
        initialQuestions={initial?.questions}
        initialRelations={initial?.relations}
        initialInquiryCounts={initial?.inquiryCounts}
        initialArguments={initial?.roomArguments}
      />
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
    </div>
  );
}