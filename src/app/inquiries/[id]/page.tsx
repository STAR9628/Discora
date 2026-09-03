import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getInquiryById } from "@/features/inquiries/services/inquiry-service";
import { InquiryDetail } from "@/features/inquiries/components/inquiry-detail";
import type { DiscussionClaim, ClaimContextType } from "@/features/discussions/types";

const VALID_CONTEXT_TYPES = new Set<ClaimContextType>([
  "supporting_idea",
  "counterpoint",
  "observation",
  "open_question",
]);

function parseClaimContextType(val: unknown): ClaimContextType {
  if (typeof val === "string" && VALID_CONTEXT_TYPES.has(val as ClaimContextType)) {
    return val as ClaimContextType;
  }
  return "observation";
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  let inquiry = null;
  try {
    const supabase = await createServerSupabaseClient();
    inquiry = await getInquiryById(id, supabase);
  } catch (err) {
    console.error("Error generating metadata for inquiry:", err);
  }

  return {
    title: inquiry ? `Inquiry: ${inquiry.content.slice(0, 50)}... | Discora` : "Inquiry | Discora",
    description: inquiry?.content || "View structured inquiry and responses on Discora.",
  };
}

export default async function InquiryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  let inquiry = null;
  try {
    inquiry = await getInquiryById(id, supabase);
  } catch (err) {
    console.error("Error fetching inquiry:", err);
  }

  if (!inquiry) {
    notFound();
  }

  // Fetch parent claim context
  let parentClaim: DiscussionClaim | null = null;
  try {
    const { data: claimData } = await supabase
      .from("discussion_claims")
      .select("*")
      .eq("id", inquiry.targetClaimId)
      .maybeSingle();

    if (claimData) {
      parentClaim = {
        id: claimData.id,
        roomId: claimData.room_id,
        createdBy: claimData.created_by,
        originMessageId: claimData.origin_message_id,
        questionId: claimData.question_id,
        content: claimData.content,
        claimType: claimData.claim_type,
        contextType: parseClaimContextType(claimData.context_type),
        identityMode: claimData.identity_mode,
        isRetracted: claimData.is_retracted,
        debateSide: claimData.debate_side || null,
        createdAt: claimData.created_at,
        updatedAt: claimData.updated_at,
        username: claimData.username,
        avatarUrl: claimData.avatar_url,
      } as DiscussionClaim;
    }
  } catch (err) {
    console.error("Error fetching parent claim for inquiry:", err);
  }

  // Fetch parent room details
  let roomSlug: string | null = null;
  let roomTitle: string | null = null;
  let roomType: "debate" | "discussion" | null = null;
  try {
    const { data: roomData } = await supabase
      .from("rooms")
      .select("slug, title, room_type")
      .eq("id", inquiry.roomId)
      .maybeSingle();

    if (roomData) {
      roomSlug = roomData.slug;
      roomTitle = roomData.title;
      roomType = roomData.room_type as "debate" | "discussion";
    }
  } catch (err) {
    console.error("Error fetching room details for inquiry:", err);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <InquiryDetail
        inquiry={inquiry}
        parentClaim={parentClaim}
        roomSlug={roomSlug}
        roomTitle={roomTitle}
        roomType={roomType}
      />
    </main>
  );
}
