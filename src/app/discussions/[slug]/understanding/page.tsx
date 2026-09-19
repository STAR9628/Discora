import { notFound } from "next/navigation";
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

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient());
  if (!item) notFound();

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
  if (isPubliclyVisibleRoom(item.room)) {
    try {
      const supabaseSSR = await createServerSupabaseClient();
      const [claims, roomEvidence, questions, relations, inquiryCounts, roomArguments] = await Promise.all([
        getClaims(item.room.id, undefined, supabaseSSR),
        getEvidenceForRoom(item.room.id, supabaseSSR),
        getQuestions(item.room.id, supabaseSSR),
        getClaimRelations(item.room.id, supabaseSSR),
        getInquiryCountsByRoom(item.room.id, supabaseSSR),
        getRoomArguments(item.room.id, supabaseSSR),
      ]);
      initial = { claims, roomEvidence, questions, relations, inquiryCounts, roomArguments };
    } catch {
      // Fall through to client-side fetching.
    }
  }

  return (
    <DiscussionOverviewUnderstanding
      roomId={item.room.id}
      slug={slug}
      initialClaims={initial?.claims}
      initialEvidence={initial?.roomEvidence}
      initialQuestions={initial?.questions}
      initialRelations={initial?.relations}
      initialInquiryCounts={initial?.inquiryCounts}
      initialArguments={initial?.roomArguments}
    />
  );
}