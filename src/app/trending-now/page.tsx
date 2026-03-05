"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function TrendingNowPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      router.replace("/trending?viewer=user");
      return;
    }

    router.replace("/trending?guest=true");
  }, [isLoading, router, user]);

  return (
    <main className="min-h-[100dvh] bg-off-white flex items-center justify-center px-4">
      <p
        className="text-sm text-charcoal/70"
        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        Redirecting to trending...
      </p>
    </main>
  );
}
