"use client";

import dynamic from "next/dynamic";

// Client-side performance components
const LinkPrefetch = dynamic(() => import("./LinkPrefetch"), {
  ssr: false,
});

const ResourcePreloader = dynamic(() => import("./ResourcePreloader"), {
  ssr: false,
});

const PerformanceMonitor = dynamic(() => import("./PerformanceMonitor"), {
  ssr: false,
});

const LocationPermissionBootstrap = dynamic(
  () => import("../Location/LocationPermissionBootstrap"),
  {
    ssr: false,
  }
);

export default function ClientPerformanceWrapper() {
  return (
    <>
      <LocationPermissionBootstrap />
      <LinkPrefetch />
      <ResourcePreloader />
      <PerformanceMonitor />
    </>
  );
}
