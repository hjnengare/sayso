"use client";

import { useBusinessDistanceLocation } from "../../hooks/useBusinessDistanceLocation";

export default function LocationPermissionBootstrap() {
  // Initialize shared location store on first app load so permission can be
  // requested immediately for first-time visitors.
  useBusinessDistanceLocation();
  return null;
}
