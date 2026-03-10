import type { Metadata } from 'next';
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.messages();

export default function DMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
