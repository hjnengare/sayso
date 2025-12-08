import { Suspense } from "react";
import { PageLoader } from "../components/Loader";

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

