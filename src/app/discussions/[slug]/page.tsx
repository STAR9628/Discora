import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import {
  getClaims,
  getDiscussionBySlug,
  getMessagesPaginated,
} from "@/features/discussions/services/discussion-service";
import { DiscussionContributionsSection } from "@/features/discussions/components/discussion-contributions-section";
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

  // Public-room SSR: server-render the first page of messages + claims so
  // crawlers/AI readers see real discourse substance in initial HTML.
  let initialMessagesPage;
  let initialClaims;
  if (isPubliclyVisibleRoom(discussionItem.room)) {
    const supabaseSSR = await createServerSupabaseClient();
    try {
      const [messagesPage, claims] = await Promise.all([
        getMessagesPaginated(discussionItem.room.id, { overrideClient: supabaseSSR }),
        getClaims(discussionItem.room.id, undefined, supabaseSSR),
      ]);
      initialMessagesPage = messagesPage;
      initialClaims = claims;
    } catch {
      // Fall through to client-side fetching.
    }
  }

  return (
    <DiscussionContributionsSection
      roomId={discussionItem.room.id}
      slug={slug}
      openingStatement={discussionItem.discussion?.openingStatement}
      initialMessagesPage={initialMessagesPage}
      initialClaims={initialClaims}
    />
  );
}