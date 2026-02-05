import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { PageMetadata } from "./lib/utils/seoMetadata";

export const metadata: Metadata = {
  ...PageMetadata.home(),
  alternates: { canonical: "/home" },
  robots: { index: false, follow: true },
};

// Home is a client component; root renders it so /home rewrite and / (after redirect) both show home.
const HomePage = dynamic(() => import("./home/page"), { ssr: false, loading: () => <main className="min-h-screen flex items-center justify-center bg-off-white"><p className="text-charcoal/70">Loading…</p></main> });

/**
 * Root page: renders the Home UI. Proxy redirects / → /home and rewrites /home → / so this page serves both.
 */
export default function RootPage() {
  return <HomePage />;
}
