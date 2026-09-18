import type { Metadata } from "next";
import { AboutPageClient } from "@/features/about/components/about-page-client";

export const metadata: Metadata = {
  title: "About Discora — Structured Discussion & Understanding",
  description:
    "Discora is a structured discourse platform that transforms chaotic online discussions into organized, evidence-based conversations. Learn what Discora is, why it exists, and how it works.",
  openGraph: {
    title: "About Discora",
    description:
      "A structured environment for meaningful discussion. Evidence over popularity. Understanding over engagement.",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
