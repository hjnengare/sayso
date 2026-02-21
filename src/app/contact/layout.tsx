import { Metadata } from 'next';
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.contact();

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
