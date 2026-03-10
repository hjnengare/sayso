import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { getCategoryLabelFromBusiness } from "@/app/utils/subcategoryPlaceholders";
import { getInterestIdForSubcategory } from "@/app/lib/onboarding/subcategoryMapping";
import { reRankByContactCompleteness } from "@/app/lib/utils/contactCompleteness";
import { ALGOLIA_INDICES, BusinessHit } from "@/app/lib/algolia/indices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Algolia server-side search ─────────────────────────────────────────────

interface AlgoliaSearchResult {
  results: Array<Record<string, unknown>>;
  reviewerResults: Array<Record<string, unknown>>;
}

async function searchWithAlgolia(
  query: string,
  limit: number,
  offset: number,
  minRating: number | null
): Promise<AlgoliaSearchResult> {
  const { algoliasearch } = await import("algoliasearch");

  const appId = process.env.ALGOLIA_APP_ID;
  const searchKey = process.env.ALGOLIA_SEARCH_KEY;
  if (!appId || !searchKey) throw new Error("Algolia env vars not set");

  const client = algoliasearch(appId, searchKey);

  const numericFilters: string[] = [];
  if (minRating) numericFilters.push(`average_rating >= ${minRating}`);

  const { results } = await client.search({
    requests: [
      {
        indexName: ALGOLIA_INDICES.BUSINESSES,
        query,
        hitsPerPage: limit,
        page: Math.floor(offset / limit),
        ...(numericFilters.length ? { numericFilters } : {}),
      },
      {
        indexName: ALGOLIA_INDICES.REVIEWERS,
        query,
        hitsPerPage: 5,
      },
    ],
  });

  const businessHits = (results[0] as { hits: (BusinessHit & { objectID: string })[] }).hits ?? [];
  const reviewerHits = (results[1] as { hits: Array<{ objectID: string; display_name?: string; username?: string; avatar_url?: string; is_top_reviewer?: boolean; total_reviews?: number }> }).hits ?? [];

  return {
    results: businessHits.map((hit) => ({
      id: hit.objectID,
      slug: hit.slug,
      name: hit.name,
      category: hit.category,
      category_label: hit.category_label || hit.category,
      location: hit.location,
      address: hit.address,
      phone: hit.phone,
      email: hit.email,
      website: hit.website,
      image_url: hit.image_url,
      description: hit.description,
      price_range: hit.price_range,
      verified: hit.verified,
      badge: hit.badge,
      lat: hit._geoloc?.lat ?? null,
      lng: hit._geoloc?.lng ?? null,
      reviews: hit.total_reviews,
      rating: hit.average_rating,
      stats: { average_rating: hit.average_rating },
    })),
    reviewerResults: reviewerHits.map((hit) => ({
      id: hit.objectID,
      display_name: hit.display_name ?? null,
      username: hit.username ?? null,
      avatar_url: hit.avatar_url ?? null,
      is_top_reviewer: hit.is_top_reviewer ?? false,
      total_reviews: hit.total_reviews ?? 0,
    })),
  };
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const minRatingParam = searchParams.get("minRating");
    const offsetParam = searchParams.get("offset") || "0";
    const limitParam = searchParams.get("limit") || "20";

    if (!query) {
      return NextResponse.json({
        results: [],
        meta: {
          query: null,
          minRating: null,
        },
      });
    }

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 5), 50);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
    const minRating = minRatingParam ? parseFloat(minRatingParam) : null;

    // ── Try Algolia first ────────────────────────────────────────────────────
    const algoliaConfigured =
      !!process.env.ALGOLIA_APP_ID &&
      !!process.env.ALGOLIA_SEARCH_KEY;

    if (algoliaConfigured) {
      try {
        const algoliaResults = await searchWithAlgolia(query, limit, offset, minRating);
        return NextResponse.json(
          {
            results: algoliaResults.results,
            reviewerResults: algoliaResults.reviewerResults,
            meta: { query, minRating, total: algoliaResults.results.length, source: "algolia" },
          },
          { status: 200 }
        );
      } catch (algoliaErr) {
        console.warn("[SEARCH] Algolia failed, falling back to Supabase:", algoliaErr);
      }
    }

    // ── Supabase fallback ────────────────────────────────────────────────────
    const supabase = await getServerSupabase();

    // Try intelligent search_businesses RPC first (full-text + fuzzy + aliases)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_businesses",
      {
        q: query,
        p_limit: limit,
        p_offset: offset,
        p_verified_only: false,
        p_location: null,
      }
    );

    let results: Array<Record<string, unknown>>;

    if (rpcError) {
      // Fallback to ILIKE if RPC not available
      console.warn("[SEARCH API] RPC fallback:", rpcError.message);

      const { data, error } = await supabase
        .from("businesses")
        .select(
          `id, slug, name, primary_subcategory_slug, primary_subcategory_label, primary_category_slug, location, address, phone, email,
           website, hours, image_url, description, price_range, verified, badge, lat, lng,
           business_stats (average_rating, total_reviews)`
        )
        .eq("status", "active")
        .or('is_hidden.is.null,is_hidden.eq.false')
        .or('is_system.is.null,is_system.eq.false')
        .or(
          `name.ilike.%${query}%, description.ilike.%${query}%, primary_subcategory_slug.ilike.%${query}%, primary_subcategory_label.ilike.%${query}%, location.ilike.%${query}%`
        )
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Live search error:", error);
        return NextResponse.json(
          { error: "Failed to search businesses" },
          { status: 500 }
        );
      }

      results = (data || []).map((business: Record<string, unknown>) => {
        const stats = business.business_stats as
          | Array<{ average_rating: number; total_reviews: number }>
          | undefined;
        const categoryLabel = getCategoryLabelFromBusiness(business);
        const subInterestId = (business.primary_subcategory_slug as string) ?? (business.sub_interest_id as string) ?? undefined;
        const interestId = (business.primary_category_slug as string) ?? (business.interest_id as string) ?? (subInterestId ? getInterestIdForSubcategory(subInterestId) : undefined);
        return {
          id: business.id,
          slug: business.slug,
          name: business.name,
          category: (business.primary_subcategory_slug as string) ?? (business.category as string) ?? undefined,
          category_label: categoryLabel,
          subInterestId,
          subInterestLabel: categoryLabel !== 'Miscellaneous' ? categoryLabel : undefined,
          interestId: interestId || undefined,
          location: business.location,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website: business.website,
          hours: business.hours,
          image_url: business.image_url,
          description: business.description,
          price_range: business.price_range,
          verified: business.verified,
          badge: business.badge,
          lat: (business.lat as number) ?? null,
          lng: (business.lng as number) ?? null,
          reviews: stats?.[0]?.total_reviews ?? 0,
          rating: stats?.[0]?.average_rating ?? null,
          stats: {
            average_rating: stats?.[0]?.average_rating ?? 0,
          },
        };
      });
    } else {
      // RPC returns relevance-ranked results (includes sub_interest_id)
      results = (rpcData || []).map((business: Record<string, unknown>) => {
        const categoryLabel = getCategoryLabelFromBusiness(business);
        const subInterestId = (business.primary_subcategory_slug as string) ?? (business.sub_interest_id as string) ?? undefined;
        const interestId = (business.primary_category_slug as string) ?? (business.interest_id as string) ?? (subInterestId ? getInterestIdForSubcategory(subInterestId) : undefined);
        return {
          id: business.id,
          slug: business.slug,
          name: business.name,
          category: (business.primary_subcategory_slug as string) ?? (business.category as string) ?? undefined,
          category_label: categoryLabel,
          subInterestId,
          subInterestLabel: categoryLabel !== 'Miscellaneous' ? categoryLabel : undefined,
          interestId: interestId || undefined,
          location: business.location,
          address: business.address,
          phone: business.phone,
          email: business.email,
          website: business.website,
          hours: business.hours,
          image_url: business.image_url,
          description: business.description,
          price_range: business.price_range,
          verified: business.verified,
          badge: business.badge,
          lat: ((business.lat as number) ?? (business.latitude as number) ?? null),
          lng: ((business.lng as number) ?? (business.longitude as number) ?? null),
          reviews:
            (business.total_reviews as number) ??
            (business.review_count as number) ??
            0,
          rating: (business.average_rating as number) ?? null,
          stats: {
            average_rating: (business.average_rating as number) ?? 0,
          },
        };
      });
    }

    // Apply minRating filter if provided
    if (minRating) {
      results = results.filter((business) => {
        const rating = (business.stats as { average_rating: number })
          ?.average_rating;
        return typeof rating === "number" && rating >= minRating;
      });
    }

    const rankedResults = reRankByContactCompleteness(
      results as Array<
        Record<string, unknown> & {
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address?: string | null;
          hours?: unknown;
        }
      >,
      { baseRankWeight: 6 }
    );
    const responseResults = rankedResults.map(({ hours: _hours, ...rest }) => rest);

    return NextResponse.json(
      {
        results: responseResults,
        meta: {
          query,
          minRating,
          total: responseResults.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Live search route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
