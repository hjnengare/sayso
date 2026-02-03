import { cookies, headers } from "next/headers";
import ForYouClient from "./ForYouClient";
import type { Business } from "../components/BusinessCard/BusinessCard";
import type { UserPreferences } from "../hooks/useUserPreferences";

export const dynamic = "force-dynamic";

const EMPTY_PREFERENCES: UserPreferences = {
  interests: [],
  subcategories: [],
  dealbreakers: [],
};

type BusinessesFetchResult = {
  businesses: Business[];
  error: string | null;
};
type PreferencesFetchResult = {
  preferences: UserPreferences;
  ok: boolean;
};

async function getBaseUrl() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (host) {
    const protocol = headerList.get("x-forwarded-proto") ?? "http";
    return `${protocol}://${host}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

async function buildCookieHeader() {
  const cookieStore = await cookies();
  const cookiePairs = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`);
  return cookiePairs.join("; ");
}

async function fetchPreferences(baseUrl: string, cookieHeader: string): Promise<PreferencesFetchResult> {
  try {
    const response = await fetch(`${baseUrl}/api/user/preferences`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return { preferences: EMPTY_PREFERENCES, ok: false };
    }

    const data = await response.json();
    return {
      preferences: {
        interests: data?.interests ?? [],
        subcategories: data?.subcategories ?? [],
        dealbreakers: data?.dealbreakers ?? [],
      },
      ok: true,
    };
  } catch {
    return { preferences: EMPTY_PREFERENCES, ok: false };
  }
}

async function fetchBusinesses(baseUrl: string, cookieHeader: string): Promise<BusinessesFetchResult> {
  try {
    const params = new URLSearchParams({
      limit: "120",
      feed_strategy: "mixed",
    });

    const response = await fetch(`${baseUrl}/api/businesses?${params.toString()}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return { businesses: [], error: `Failed to load businesses (${response.status})` };
    }

    const data = await response.json();
    const businesses = data?.businesses ?? data?.data ?? [];
    return { businesses, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load businesses";
    return { businesses: [], error: message };
  }
}

export default async function ForYouPage() {
  const baseUrl = await getBaseUrl();
  const cookieHeader = await buildCookieHeader();

  const [preferencesResult, businessesResult] = await Promise.all([
    fetchPreferences(baseUrl, cookieHeader),
    fetchBusinesses(baseUrl, cookieHeader),
  ]);

  return (
    <ForYouClient
      initialBusinesses={businessesResult.businesses}
      initialPreferences={preferencesResult.preferences}
      initialPreferencesLoaded={preferencesResult.ok}
      initialError={businessesResult.error}
    />
  );
}
