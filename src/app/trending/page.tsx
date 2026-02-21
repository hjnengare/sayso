import { Suspense } from "react";
import TrendingClient from "./TrendingClient";
import BusinessGridSkeleton from "../components/Explore/BusinessGridSkeleton";
import type { Business } from "../components/BusinessCard/BusinessCard";

export const revalidate = 30; // match trending API rotation window (15-min buckets, refresh shell every 30s)

async function getInitialTrendingData(): Promise<Business[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/trending?limit=50`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.businesses) ? data.businesses : [];
  } catch {
    return [];
  }
}

export default async function TrendingPage() {
  const initialBusinesses = await getInitialTrendingData();

  return (
    <Suspense fallback={<BusinessGridSkeleton />}>
      <TrendingClient fallbackData={initialBusinesses} />
    </Suspense>
  );
}
