import { NextRequest, NextResponse } from "next/server";
import { ALGOLIA_INDICES } from "@/app/lib/algolia/indices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface QuerySuggestion {
  query: string;
  type: "category" | "location";
  count: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const appId = process.env.ALGOLIA_APP_ID;
  const searchKey = process.env.ALGOLIA_SEARCH_KEY;

  if (!appId || !searchKey) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const { algoliasearch } = await import("algoliasearch");
    const client = algoliasearch(appId, searchKey);

    // Query category_label and location facet values in parallel
    const [categoryResult, locationResult] = await Promise.all([
      client.searchForFacetValues({
        indexName: ALGOLIA_INDICES.BUSINESSES,
        facetName: "category_label",
        searchForFacetValuesRequest: { facetQuery: q, maxFacetHits: 5 },
      }),
      client.searchForFacetValues({
        indexName: ALGOLIA_INDICES.BUSINESSES,
        facetName: "location",
        searchForFacetValuesRequest: { facetQuery: q, maxFacetHits: 3 },
      }),
    ]);

    const suggestions: QuerySuggestion[] = [
      ...categoryResult.facetHits.map((hit) => ({
        query: hit.value,
        type: "category" as const,
        count: hit.count,
      })),
      ...locationResult.facetHits.map((hit) => ({
        query: hit.value,
        type: "location" as const,
        count: hit.count,
      })),
    ];

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.warn("[SUGGESTIONS] Algolia facet search failed:", err);
    return NextResponse.json({ suggestions: [] });
  }
}
