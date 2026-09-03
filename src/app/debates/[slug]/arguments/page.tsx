import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getDebateBySlug } from "@/features/debates/services/debate-service";
import { DebateRoom } from "@/features/debates/components/debate-room";
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ highlight?: string }> }) { const item = await getDebateBySlug((await params).slug, await createServerSupabaseClient()); if (!item) notFound(); return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><DebateRoom initialData={item} initialSection="arguments" highlightId={(await searchParams).highlight} /></main>; }
