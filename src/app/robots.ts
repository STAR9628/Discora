import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/discussions", "/debates", "/search", "/leaderboard", "/u/", "/about", "/terms", "/privacy", "/guidelines", "/grievance"],
        disallow: [
          "/auth/",
          "/settings/",
          "/admin/",
          "/friends/",
          "/inquiries/",
          "/discussions/create",
          "/debates/create",
          "/discussions/[slug]/contributions",
          "/debates/[slug]/contributions",
          "/discussions/[slug]/claims",
          "/debates/[slug]/claims",
          "/debates/[slug]/arguments",
          "/debates/[slug]/evidence",
          "/debates/[slug]/questions",
          "/debates/[slug]/sources",
          "/debates/[slug]/understanding",
          "/discussions/[slug]/evidence",
          "/discussions/[slug]/questions",
          "/discussions/[slug]/sources",
          "/discussions/[slug]/understanding",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}