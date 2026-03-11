"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const BREADCRUMB_TEXT_SELECTOR = 'nav[aria-label="Breadcrumb"] li a, nav[aria-label="Breadcrumb"] li span';

function syncBreadcrumbTitles() {
  if (typeof document === "undefined") {
    return;
  }

  const elements = document.querySelectorAll<HTMLElement>(BREADCRUMB_TEXT_SELECTOR);
  elements.forEach((element) => {
    const text = element.textContent?.trim();
    if (!text || text === "/" || text.length < 2) {
      return;
    }

    if (element.getAttribute("title") !== text) {
      element.setAttribute("title", text);
    }
  });
}

export default function BreadcrumbTitleSync() {
  const pathname = usePathname();

  useEffect(() => {
    syncBreadcrumbTitles();
    const timeout = window.setTimeout(syncBreadcrumbTitles, 200);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return null;
}
