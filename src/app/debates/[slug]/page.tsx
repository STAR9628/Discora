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
    invitation?: string;
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
  const invitationToken = resolvedSearchParams.invitation || null;

  const supabase = await createServerSupabaseClient();
  let debateData = null;

  try {
    debateData = await getDebateBySlug(slug, supabase);
  } catch (error) {
    console.error("Error fetching debate details:", error);
  }

  if (debateData) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <DebateRoom initialData={debateData} highlightId={highlightId} invitationToken={invitationToken} />
      </main>
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
      },
    };

    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <DebateRoom initialData={minimalData} highlightId={highlightId} invitationToken={invitationToken} gateMode />
      </main>
    );
  }

  notFound();
}
