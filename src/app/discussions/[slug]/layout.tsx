import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDiscussionBySlug } from "@/features/discussions/services/discussion-service";
import { DiscussionRoomLayout } from "@/features/discussions/components/discussion-room-layout";
import { getSiteUrl } from "@/lib/site-url";
import { truncateText } from "@/lib/text";
import { getBreadcrumbSchema, getDiscussionSchema } from "@/lib/seo/structured-data";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  let discussionItem = null;

  try {
    discussionItem = await getDiscussionBySlug(slug, supabase);
  } catch (error) {
    console.error("Error generating metadata for discussion:", error);
  }

  const siteUrl = await getSiteUrl();
  const isPublicRoom = discussionItem?.room.visibility === "public";

  if (!discussionItem || !isPublicRoom) {
    return {
      title: "Discussion",
      description: "Browse and participate in structured, open-exploration discussions on Discora.",
      metadataBase: new URL(siteUrl),
      robots: { index: false },
    };
  }

  const description =
    truncateText(discussionItem.room.description || discussionItem.discussion?.openingStatement) ||
    "A structured discussion on Discora.";

  return {
    title: discussionItem.room.title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: `/discussions/${slug}` },
    openGraph: {
      type: "article",
      title: discussionItem.room.title,
      description,
      url: `/discussions/${slug}`,
      siteName: "Discora",
    },
    other: {
      "script:ld+json": [
        JSON.stringify(
          getBreadcrumbSchema([
            { name: "Home", url: siteUrl },
            { name: "Discussions", url: `${siteUrl}/discussions` },
            { name: discussionItem.room.title, url: `${siteUrl}/discussions/${slug}` },
          ]),
        ),
        JSON.stringify(
          await getDiscussionSchema({
            slug,
            title: discussionItem.room.title,
            description,
            authorName: discussionItem.room.createdBy,
            datePublished: discussionItem.room.createdAt,
            dateModified: discussionItem.room.updatedAt,
          }),
        ),
      ].join(""),
    },
  };
}

export default async function DiscussionLayout({ children, params }: LayoutProps) {
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

  return (
    <DiscussionRoomLayout discussionItem={discussionItem}>
      {children}
    </DiscussionRoomLayout>
  );
}
