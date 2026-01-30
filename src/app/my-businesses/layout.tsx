import type { Metadata } from "next";
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.myBusinesses();

export default function MyBusinessesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
