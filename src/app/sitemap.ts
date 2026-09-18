import { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

async function getPublicDiscussions(): Promise<{ slug: string; updatedAt: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("rooms")
    .select("slug, updated_at")
    .eq("room_type", "discussion")
    .eq("visibility", "public")
    .neq("status", "archived");
  return (data || []).map((d) => ({ slug: d.slug, updatedAt: d.updated_at }));
}

async function getPublicDebates(): Promise<{ slug: string; updatedAt: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("rooms")
    .select("slug, updated_at")
    .eq("room_type", "debate")
    .eq("visibility", "public")
    .neq("status", "archived");
  return (data || []).map((d) => ({ slug: d.slug, updatedAt: d.updated_at }));
}

async function getPublicProfiles(): Promise<{ username: string; updatedAt: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, updated_at")
    .not("username", "is", null);
  return (data || []).map((d) => ({ username: d.username, updatedAt: d.updated_at }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const [discussions, debates, profiles] = await Promise.all([
    getPublicDiscussions(),
    getPublicDebates(),
    getPublicProfiles(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/discussions`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/debates`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/guidelines`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/grievance`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const discussionRoutes: MetadataRoute.Sitemap = discussions.map((d) => ({
    url: `${siteUrl}/discussions/${d.slug}`,
    lastModified: new Date(d.updatedAt),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const debateRoutes: MetadataRoute.Sitemap = debates.map((d) => ({
    url: `${siteUrl}/debates/${d.slug}`,
    lastModified: new Date(d.updatedAt),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const profileRoutes: MetadataRoute.Sitemap = profiles.map((p) => ({
    url: `${siteUrl}/u/${p.username}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...discussionRoutes, ...debateRoutes, ...profileRoutes];
}