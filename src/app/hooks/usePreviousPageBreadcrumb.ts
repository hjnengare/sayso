"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface UsePreviousPageBreadcrumbOptions {
  fallbackHref: string;
  fallbackLabel?: string;
}

interface PreviousPageBreadcrumb {
  previousHref: string;
  previousLabel: string;
}

const KNOWN_ROUTE_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: "/home", label: "Home" },
  { prefix: "/my-businesses", label: "My Businesses" },
  { prefix: "/events-specials", label: "Events & Specials" },
  { prefix: "/claim-business", label: "Claim Business" },
  { prefix: "/add-business", label: "Add Business" },
  { prefix: "/add-event", label: "Add Event" },
  { prefix: "/add-special", label: "Add Special" },
  { prefix: "/notifications", label: "Notifications" },
  { prefix: "/settings", label: "Settings" },
  { prefix: "/business", label: "Business" },
];

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPathLabel(pathname: string): string {
  const normalizedPath = pathname.split("?")[0].split("#")[0];

  if (normalizedPath === "/" || normalizedPath === "") {
    return "Home";
  }

  const knownRoute = KNOWN_ROUTE_LABELS.find((route) => {
    return (
      normalizedPath === route.prefix ||
      normalizedPath.startsWith(`${route.prefix}/`)
    );
  });
  if (knownRoute) return knownRoute.label;

  const segments = normalizedPath.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "Home";
  return toTitleCase(lastSegment.replace(/[-_]+/g, " "));
}

export function usePreviousPageBreadcrumb({
  fallbackHref,
  fallbackLabel,
}: UsePreviousPageBreadcrumbOptions): PreviousPageBreadcrumb {
  const pathname = usePathname();

  const [previousHref, setPreviousHref] = useState(fallbackHref);
  const [previousLabel, setPreviousLabel] = useState(
    fallbackLabel || formatPathLabel(fallbackHref)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const referrer = document.referrer;
    if (!referrer) return;

    try {
      const refUrl = new URL(referrer);
      if (refUrl.origin !== window.location.origin) return;
      if (refUrl.pathname === pathname) return;

      const nextHref = `${refUrl.pathname}${refUrl.search || ""}`;
      setPreviousHref(nextHref || fallbackHref);
      setPreviousLabel(formatPathLabel(refUrl.pathname));
    } catch {
      // Keep fallback for invalid referrer URLs.
    }
  }, [fallbackHref, pathname]);

  return { previousHref, previousLabel };
}
