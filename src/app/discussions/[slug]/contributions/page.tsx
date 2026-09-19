import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import {
  getClaims,
  getDiscussionBySlug,
  getMessagesPaginated,
} from "@/features/discussions/services/discussion-service";
import { DiscussionContributionsSection } from "@/features/discussions/components/discussion-contributions-section";
import { isPubliclyVisibleRoom } from "@/lib/seo/public-room";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient()).catch(() => null);
  const title = item?.room.title ? `${item.room.title} | Contributions` : "Contributions";
  return {
    title,
    description: item?.room.description || "Contributions and timeline messages in this discussion.",
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getDiscussionBySlug(slug, await createServerSupabaseClient());
  if (!item) notFound();

  // Public-room SSR: server-render the first page of messages + claims so
  // crawlers/AI readers see real discourse substance in initial HTML.
  // Private/archived rooms skip prefetching entirely (fail-closed); the
  // server client carries no user session, so RLS confines reads to public
  // rows regardless. Failures fall back to client fetching (page still works).
  let initialMessagesPage;
  let initialClaims;
  if (isPubliclyVisibleRoom(item.room)) {
    const supabaseSSR = await createServerSupabaseClient();
    try {
      const [messagesPage, claims] = await Promise.all([
        getMessagesPaginated(item.room.id, { overrideClient: supabaseSSR }),
        getClaims(item.room.id, undefined, supabaseSSR),
      ]);
      initialMessagesPage = messagesPage;
      initialClaims = claims;
    } catch {
      // Fall through to client-side fetching.
    }
  }

  return (
    <DiscussionContributionsSection
      roomId={item.room.id}
      initialMessagesPage={initialMessagesPage}
      initialClaims={initialClaims}
    />
  );
}