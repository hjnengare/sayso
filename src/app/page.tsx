import type { Metadata } from "next";
import { PageMetadata } from "./lib/utils/seoMetadata";
import HomePage from "./home/page";

export const metadata: Metadata = PageMetadata.home();

/**
 * Root page: renders the Home UI when root is allowed through middleware
 * (e.g. authenticated users and crawler traffic for SEO crawlability).
 */
export default function RootPage() {
  return <HomePage />;
}
