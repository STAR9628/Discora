import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import {
  getDebateBySlug,
  getDebateParticipants,
  getClaimsBySide,
} from "@/features/debates/services/debate-service";
import { getEvidenceForRoom, getQuestions } from "@/features/discussions/services/discussion-service";
import { getInquiriesByRoom } from "@/features/inquiries/services/inquiry-service";
import { DebateRoom } from "@/features/debates/components/debate-room";
import { getSiteUrl } from "@/lib/site-url";
import { truncateText } from "@/lib/text";
import { isPubliclyVisibleRoom } from "@/lib/seo/public-room";
import { getBreadcrumbSchema, getDebateSchema } from "@/lib/seo/structured-data";

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

  const siteUrl = await getSiteUrl();
  const isPublicRoom = debateData?.room.visibility === "public";

  if (!debateData || !isPublicRoom) {
    return {
      title: "Debate",
      description: "Browse and participate in structured debates on Discora.",
      metadataBase: new URL(siteUrl),
      robots: { index: false },
    };
  }

  const description =
    truncateText(debateData.room.description || debateData.debate.openingStatement) ||
    "A structured debate on Discora.";

  return {
    title: debateData.room.title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: `/debates/${slug}` },
    openGraph: {
      type: "article",
      title: debateData.room.title,
      description,
      url: `/debates/${slug}`,
      siteName: "Discora",
    },
    other: {
      "script:ld+json": [
        JSON.stringify(
          getBreadcrumbSchema([
            { name: "Home", url: siteUrl },
            { name: "Debates", url: `${siteUrl}/debates` },
            { name: debateData.room.title, url: `${siteUrl}/debates/${slug}` },
          ]),
        ),
        JSON.stringify(
          await getDebateSchema({
            slug,
            title: debateData.room.title,
            description,
            authorName: debateData.room.createdBy,
            datePublished: debateData.room.createdAt,
            dateModified: debateData.room.updatedAt,
          }),
        ),
      ].join(""),
    },
  };
}

export default async function DebateRoomPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const highlightId = resolvedSearchParams.highlight || null;
  // Phase 9D.3: invitation tokens travel via URL fragment (client-side only)
  // and are never passed through SSR props or server-rendered page data.

  const supabase = await createServerSupabaseClient();
  let debateData = null;

  try {
    debateData = await getDebateBySlug(slug, supabase);
  } catch (error) {
    console.error("Error fetching debate details:", error);
  }

  // Public-room SSR: fetch initial lens-gated collections so SSR HTML carries
  // real debate substance (claims, evidence, questions, inquiries, participants).
  // Gated + fail-open; RLS scopes reads to public rows. Never pass private data.
  let initialCollections;
  if (debateData && isPubliclyVisibleRoom(debateData.room)) {
    try {
      const supabaseSSR = await createServerSupabaseClient();
      const [propositionClaims, oppositionClaims, questions, roomEvidence, inquiries, participants] = await Promise.all([
        getClaimsBySide(debateData.room.id, "proposition", supabaseSSR),
        getClaimsBySide(debateData.room.id, "opposition", supabaseSSR),
        getQuestions(debateData.room.id, supabaseSSR),
        getEvidenceForRoom(debateData.room.id, supabaseSSR),
        getInquiriesByRoom(debateData.room.id, supabaseSSR),
        getDebateParticipants(debateData.room.id, supabaseSSR),
      ]);
      initialCollections = {
        claims: [...propositionClaims, ...oppositionClaims],
        questions,
        roomEvidence,
        inquiries,
        participants,
      };
    } catch {
      // Fall through to client-side fetching.
    }
  }

  if (debateData) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 pb-8 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <DebateRoom
          initialData={debateData}
          highlightId={highlightId}
          initialSection="conversation"
          initialCollections={initialCollections}
        />
      </div>
    );
  }

  const { data: gateData } = await supabase.rpc("get_private_room_gate", { p_slug: slug });

  if (gateData && gateData.length > 0) {
    const gateRoom = gateData[0];
    const minimalData = {
      room: {
        id: gateRoom.id,
        title: "Private Debate",
        slug,
        visibility: gateRoom.visibility,
        roomType: gateRoom.room_type,
        status: "open" as const,
        createdBy: "",
        topicId: undefined,
        accessCode: null,
        participantInvitesEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      topic: null,
      debate: {
        id: gateRoom.id,
        propositionTitle: "",
        oppositionTitle: "",
        openingStatement: null,
        status: "active" as const,
        resolution: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        propositionClaimCount: 0,
        oppositionClaimCount: 0,
        propositionParticipantCount: 0,
        oppositionParticipantCount: 0,
        neutralParticipantCount: 0,
        totalClaims: 0,
        totalParticipants: 0,
        totalEvidence: 0,
        lastActivityAt: new Date().toISOString(),
        closesAt: null,
      },
    };

    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 pb-8 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <DebateRoom initialData={minimalData} highlightId={highlightId} gateMode />
      </div>
    );
  }

  notFound();
}