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
          "/discussions/*/contributions",
          "/debates/*/contributions",
          "/discussions/*/claims",
          "/debates/*/claims",
          "/debates/*/arguments",
          "/debates/*/evidence",
          "/debates/*/questions",
          "/debates/*/sources",
          "/debates/*/understanding",
          "/discussions/*/evidence",
          "/discussions/*/questions",
          "/discussions/*/sources",
          "/discussions/*/understanding",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}