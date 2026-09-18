import { getSiteUrl } from "@/lib/site-url";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate WebSite structured data
 */
export async function getWebSiteSchema(): Promise<object> {
  const siteUrl = await getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Discora",
    url: siteUrl,
    description:
      "A structured discourse platform for discussion, debate, and evidence-based understanding.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate Organization structured data
 */
export async function getOrganizationSchema(): Promise<object> {
  const siteUrl = await getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Discora",
    url: siteUrl,
    logo: `${siteUrl}/discora-mark.png`,
    sameAs: [],
    description:
      "A structured discourse platform for discussion, debate, and evidence-based understanding. Evidence over popularity. Understanding over engagement.",
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function getBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate DiscussionForumPosting structured data for a discussion room
 */
export async function getDiscussionSchema(params: {
  slug: string;
  title: string;
  description: string;
  authorName: string;
  datePublished: string;
  dateModified?: string;
}): Promise<object> {
  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}/discussions/${params.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: params.title,
    description: params.description,
    url,
    author: {
      "@type": "Person",
      name: params.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Discora",
    },
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    interactionStatistic: [],
  };
}

/**
 * Generate Article structured data for a debate room
 */
export async function getDebateSchema(params: {
  slug: string;
  title: string;
  description: string;
  authorName: string;
  datePublished: string;
  dateModified?: string;
}): Promise<object> {
  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}/debates/${params.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    articleSection: "Debate",
    headline: params.title,
    description: params.description,
    url,
    author: {
      "@type": "Person",
      name: params.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Discora",
    },
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
  };
}

/**
 * Generate ProfilePage structured data for a user profile
 */
export async function getProfileSchema(params: {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  joinedAt: string;
}): Promise<object> {
  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}/u/${params.username}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: params.displayName,
      alternateName: `@${params.username}`,
      description: params.bio,
      image: params.avatarUrl,
      url,
      worksFor: {
        "@type": "Organization",
        name: "Discora",
      },
    },
    datePublished: params.joinedAt,
  };
}