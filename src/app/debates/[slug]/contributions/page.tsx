import { redirect } from "next/navigation";

export default async function DebateContributionsRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") query.set(k, v);
    else if (Array.isArray(v)) v.forEach((val) => query.append(k, val));
  }
  const queryString = query.toString();
  redirect(`/debates/${slug}${queryString ? `?${queryString}` : ""}`);
}
