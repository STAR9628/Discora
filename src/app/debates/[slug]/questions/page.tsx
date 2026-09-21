import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDebateBySlug } from "@/features/debates/services/debate-service";
import { DebateRoom } from "@/features/debates/components/debate-room";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getDebateBySlug(slug, await createServerSupabaseClient()).catch(() => null);
  const title = item?.room.title ? `${item.room.title} | Questions` : "Questions";
  return {
    title,
    description: item?.room.description || "Inquiries and questions examined in this debate.",
  };
}

export default async function DebateQuestionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getDebateBySlug(slug, await createServerSupabaseClient());
  if (!item) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <DebateRoom initialData={item} initialSection="inquiries" />
    </div>
  );
}
