import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const NAVBAR_BG = "#722F37";
const OFF_WHITE = "#F5F0EB";
const SAGE = "#7C9E87";
const CHARCOAL = "#2C2C2C";
const CARD_W = 1200;
const CARD_H = 630;

function pickImage(business: {
  uploaded_images?: string[] | null;
  business_images?: { url: string; is_primary?: boolean; sort_order?: number }[] | null;
  image_url?: string | null;
}): string | null {
  const uploaded = Array.isArray(business.uploaded_images) ? business.uploaded_images : [];
  if (uploaded[0]) return uploaded[0];

  const gallery = Array.isArray(business.business_images) ? business.business_images : [];
  const sorted = [...gallery].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  if (sorted[0]?.url) return sorted[0].url;

  return business.image_url ?? null;
}

function starString(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Use anon key — public business data only, no auth needed.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let business: {
    name: string;
    primary_category_label?: string | null;
    category?: string | null;
    uploaded_images?: string[] | null;
    business_images?: { url: string; is_primary?: boolean; sort_order?: number }[] | null;
    image_url?: string | null;
    business_stats?: { average_rating: number | null; total_reviews: number | null }[] | null;
  } | null = null;

  try {
    // Support both UUID and slug lookups.
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      const { data: slugRow } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", id)
        .eq("status", "active")
        .single();
      if (slugRow?.id) {
        const { data } = await supabase
          .from("businesses")
          .select(
            "name, primary_category_label, category, uploaded_images, business_images(url, is_primary, sort_order), image_url, business_stats(average_rating, total_reviews)"
          )
          .eq("id", slugRow.id)
          .eq("status", "active")
          .single();
        business = data;
      }
    } else {
      const { data } = await supabase
        .from("businesses")
        .select(
          "name, primary_category_label, category, uploaded_images, business_images(url, is_primary, sort_order), image_url, business_stats(average_rating, total_reviews)"
        )
        .eq("id", id)
        .eq("status", "active")
        .single();
      business = data;
    }
  } catch {
    // Fall through to fallback card.
  }

  const name = business?.name ?? "Sayso Business";
  const category =
    business?.primary_category_label ?? business?.category ?? null;
  const photoUrl = business ? pickImage(business) : null;
  const stats = business?.business_stats?.[0] ?? null;
  const rating = stats?.average_rating ?? null;
  const reviewCount = stats?.total_reviews ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: NAVBAR_BG,
          overflow: "hidden",
        }}
      >
        {/* Background photo */}
        {photoUrl && (
          <img
            src={photoUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "brightness(0.55) saturate(0.9)",
            }}
          />
        )}

        {/* Full-card dark gradient for readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.72) 100%)",
          }}
        />

        {/* Top bar — Sayso wordmark */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 52,
            right: 52,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Sayso pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: NAVBAR_BG,
              borderRadius: 999,
              paddingTop: 10,
              paddingBottom: 10,
              paddingLeft: 24,
              paddingRight: 24,
            }}
          >
            <span
              style={{
                color: OFF_WHITE,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              Sayso
            </span>
          </div>

          {/* Cape Town badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(245,240,235,0.15)",
              borderRadius: 999,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 20,
              paddingRight: 20,
              border: `1.5px solid rgba(245,240,235,0.3)`,
            }}
          >
            <span style={{ color: OFF_WHITE, fontSize: 22, opacity: 0.9 }}>
              Cape Town
            </span>
          </div>
        </div>

        {/* Bottom content panel */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "44px 52px 44px 52px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Category chip */}
          {category && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                alignItems: "center",
                backgroundColor: SAGE,
                borderRadius: 999,
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 18,
                paddingRight: 18,
              }}
            >
              <span
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "0.2px",
                }}
              >
                {category}
              </span>
            </div>
          )}

          {/* Business name */}
          <div
            style={{
              color: OFF_WHITE,
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              maxWidth: 900,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {name}
          </div>

          {/* Rating row */}
          {rating !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 4,
              }}
            >
              <span style={{ color: "#F4C542", fontSize: 30, letterSpacing: 2 }}>
                {starString(rating)}
              </span>
              <span
                style={{
                  color: OFF_WHITE,
                  fontSize: 28,
                  fontWeight: 600,
                  opacity: 0.95,
                }}
              >
                {rating.toFixed(1)}
              </span>
              {reviewCount > 0 && (
                <span
                  style={{
                    color: OFF_WHITE,
                    fontSize: 24,
                    opacity: 0.65,
                  }}
                >
                  · {reviewCount.toLocaleString()} review{reviewCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Domain footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <span
              style={{
                color: OFF_WHITE,
                fontSize: 22,
                opacity: 0.5,
                letterSpacing: "0.5px",
              }}
            >
              sayso.co.za
            </span>
            <span
              style={{
                color: OFF_WHITE,
                fontSize: 20,
                opacity: 0.4,
              }}
            >
              Hyper-local reviews &amp; discovery
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: CARD_W,
      height: CARD_H,
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
