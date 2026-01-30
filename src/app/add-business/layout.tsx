import type { Metadata } from "next";
import { PageMetadata } from '../lib/utils/seoMetadata';

export const metadata: Metadata = PageMetadata.addBusiness();

export default function AddBusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
