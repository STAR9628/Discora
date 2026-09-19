import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getClaimsPaginated, getDiscussionBySlug } from "@/features/discussions/services/discussion-service";
import { DiscussionClaimsSection } from "@/features/discussions/components/discussion-section";
import { isPubliclyVisibleRoom } from "@/lib/seo/public-room";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient()).catch(() => null);
  const title = item?.room.title ? `${item.room.title} | Claims` : "Claims";
  return {
    title,
    description: item?.room.description || "Claims and assertions examined in this discussion.",
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ highlight?: string; addEvidence?: string }>;
}) {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient());
  if (!item) notFound();
  const sp = await searchParams;

  // Public-room SSR: first claims page (same pageSize the section uses) so
  // initial HTML carries real claim content. Gated + fail-open (see root page).
  let initialClaimsPage;
  if (isPubliclyVisibleRoom(item.room)) {
    try {
      initialClaimsPage = await getClaimsPaginated(item.room.id, {
        pageSize: 20,
        overrideClient: await createServerSupabaseClient(),
      });
    } catch {
      // Fall through to client-side fetching.
    }
  }

  return (
    <DiscussionClaimsSection
      roomId={item.room.id}
      highlightId={sp.highlight}
      autoOpenEvidence={sp.addEvidence === "true"}
      initialClaimsPage={initialClaimsPage}
    />
  );
}