import { Suspense, lazy } from 'react';

export const experimental_ppr = true;
import HomePageSkeleton from './HomePageSkeleton';

const HomeClient = lazy(() => import('./HomeClient').then((m) => ({ default: m.default })));
import Link from 'next/link';
import SchemaMarkup from '../components/SEO/SchemaMarkup';
import { generateWebSiteSchema } from '../lib/utils/schemaMarkup';

export default function HomePage() {
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
        <HomeClient />
      </Suspense>
    </>
  );
}

