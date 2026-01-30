import { Metadata } from 'next';
import { PageMetadata } from '../../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.discoverReviews();

export default function DiscoverReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
