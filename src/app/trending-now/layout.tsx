import type { Metadata } from "next";
import { generateSEOMetadata } from "../lib/utils/seoMetadata";

export const metadata: Metadata = generateSEOMetadata({
  title: "Trending redirect | Sayso",
  description: "Redirect helper for trending content.",
  url: "/trending-now",
  noindex: true,
  nofollow: true,
  type: "website",
});

export default function TrendingNowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
