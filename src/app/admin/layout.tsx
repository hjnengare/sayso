"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

const FONT = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const role = user?.profile?.account_role || user?.profile?.role || null;
  const isAdmin = role === "admin";
  const isBusiness = role === "business_owner";

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!user.email_verified) {
      router.replace("/verify-email");
      return;
    }

    if (!isAdmin) {
      router.replace(isBusiness ? "/my-businesses" : "/home");
    }
  }, [isLoading, isAdmin, isBusiness, router, user]);

  if (isLoading || !user || !user.email_verified || !isAdmin) {
    return (
      <div className="min-h-dvh bg-charcoal/5 flex items-center justify-center">
        <div className="flex items-center gap-3 text-charcoal/70" style={{ fontFamily: FONT }}>
          <div className="w-5 h-5 border-2 border-charcoal/20 border-t-charcoal/70 rounded-full animate-spin" />
          <span className="text-sm font-medium">Checking admin access...</span>
        </div>
      </div>
    );
  }

  return <div className="min-h-dvh bg-charcoal/5">{children}</div>;
}
