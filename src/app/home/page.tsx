import { Suspense, lazy } from 'react';

export const experimental_ppr = true;
import HomePageSkeleton from './HomePageSkeleton';

const HomeClient = lazy(() => import('./HomeClient').then((m) => ({ default: m.default })));
import Link from 'next/link';
import SchemaMarkup from '../components/SEO/SchemaMarkup';
import { generateWebSiteSchema } from '../lib/utils/schemaMarkup';
import type { Business } from '../components/BusinessCard/BusinessCard';

async function prefetchTrending(): Promise<Business[]> {
  try {
    const host = process.env.VERCEL_URL ?? 'localhost:3000';
    const protocol = process.env.VERCEL_URL ? 'https' : 'http';
    const res = await fetch(`${protocol}://${host}/api/trending?limit=20`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.businesses) ? data.businesses : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const initialTrending = await prefetchTrending();
  return (
    <>
      <SchemaMarkup schemas={[generateWebSiteSchema()]} />
      <nav aria-label="Primary discovery links" className="sr-only">
        <ul>
          <li><Link href="/search">Search Cape Town businesses on Sayso</Link></li>
          <li><Link href="/categories/food-drink">Browse Cape Town restaurants and cafes</Link></li>
          <li><Link href="/events">Explore Cape Town events on Sayso</Link></li>
          <li><Link href="/leaderboard">View Sayso community highlights</Link></li>
        </ul>
      </nav>
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeClient initialTrending={initialTrending} />
      </Suspense>
    </>
  );
}

