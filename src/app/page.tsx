import type { Metadata } from "next";
import { PageMetadata } from "./lib/utils/seoMetadata";
import HomePage from "./home/page";

export const metadata: Metadata = {
  ...PageMetadata.home(),
  alternates: { canonical: "/home" },
  robots: { index: false, follow: true },
};

/**
 * Root page: renders the Home UI. Proxy redirects / → /home and rewrites /home → / so this page serves both.
 */
export default function RootPage() {
  return <HomePage />;
}

