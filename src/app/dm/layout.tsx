import { Metadata } from 'next';
import { Suspense } from "react";
import { PageLoader } from "../components/Loader";
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.dm();

export default function DMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageLoader size="lg" variant="wavy" color="sage" />}>
      {children}
    </Suspense>
  );
}

