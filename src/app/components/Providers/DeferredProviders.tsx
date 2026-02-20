"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

/**
 * Lazy-loaded PageTransitionProvider.
 * Code-splits the provider into a separate chunk to reduce initial bundle.
 * RealtimeProvider is mounted statically in layout.tsx so it's always ready.
 */
const PageTransitionProvider = dynamic(
  () =>
    import("./PageTransitionProvider").then((m) => ({
      default: m.default,
    })),
  { ssr: false }
);

interface DeferredProvidersProps {
  children: ReactNode;
}

export default function DeferredProviders({ children }: DeferredProvidersProps) {
  return <PageTransitionProvider>{children}</PageTransitionProvider>;
}
