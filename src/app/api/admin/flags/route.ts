import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['pending', 'reviewed', 'dismissed']);

/**
 * GET /api/admin/flags?status=pending&limit=50&offset=0
 * Returns flagged reviews with reviewer info for admin moderation.
 */
export const GET = withAdmin(async (
  req: NextRequest,
  { service }
) => {
  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get('status') || 'pending';
  const statusList = statusParam
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => ALLOWED_STATUSES.has(value));
  const statuses = statusList.length > 0 ? statusList : ['pending'];

  const parsedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const parsedOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

  const flagsQuery = service
    .from('review_flags')
    .select(
      `
        id,
        reason,
        details,
        status,
        admin_notes,
        created_at,
        reviewed_at,
        review_id,
        flagged_by
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const queryWithStatus =
    statuses.length === 1
      ? flagsQuery.eq('status', statuses[0])
      : flagsQuery.in('status', statuses);

  const { data: flags, error, count } = await queryWithStatus;

  if (error) {
    console.error('Admin flags fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 });
  }

  const safeFlags = flags ?? [];
  const reviewIds = [...new Set(safeFlags.map((f) => f.review_id).filter(Boolean))];
  const reporterIds = [...new Set(safeFlags.map((f) => f.flagged_by).filter(Boolean))];

  // Fetch related reviews + businesses explicitly to avoid brittle embedded joins.
  const reviewMap: Record<string, {
    id: string;
    content: string | null;
    rating: number | null;
    title: string | null;
    created_at: string;
    business_id: string | null;
    user_id: string;
    businesses: { id: string; name: string; slug: string } | null;
  }> = {};

  if (reviewIds.length > 0) {
    const { data: reviews, error: reviewsError } = await service
      .from('reviews')
      .select('id, content, rating, title, created_at, business_id, user_id')
      .in('id', reviewIds);

    if (reviewsError) {
      console.error('Admin flags reviews fetch error:', reviewsError);
    } else {
      const businessIds = [...new Set((reviews ?? []).map((r) => r.business_id).filter(Boolean))] as string[];
      const businessMap: Record<string, { id: string; name: string; slug: string }> = {};

      if (businessIds.length > 0) {
        const { data: businesses, error: businessesError } = await service
          .from('businesses')
          .select('id, name, slug')
          .in('id', businessIds);

        if (businessesError) {
          console.error('Admin flags businesses fetch error:', businessesError);
        } else {
          for (const business of businesses ?? []) {
            businessMap[business.id] = business;
          }
        }
      }

      for (const review of reviews ?? []) {
        reviewMap[review.id] = {
          ...review,
          businesses: review.business_id ? businessMap[review.business_id] ?? null : null,
        };
      }
    }
  }

  const profileMap: Record<string, {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }> = {};

  if (reporterIds.length > 0) {
    const { data: profiles, error: profilesError } = await service
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .in('user_id', reporterIds);

    if (profilesError) {
      console.error('Admin flags profiles fetch error:', profilesError);
    } else {
      for (const profile of profiles ?? []) {
        profileMap[profile.user_id] = {
          id: profile.user_id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        };
      }
    }
  }

  // Also fetch pending flag counts per review (for queue prioritization).
  let flagCounts: Record<string, number> = {};
  if (reviewIds.length > 0) {
    const { data: counts } = await service
      .from('review_flags')
      .select('review_id')
      .in('review_id', reviewIds)
      .eq('status', 'pending');
    if (counts) {
      flagCounts = counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.review_id] = (acc[row.review_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  const enriched = safeFlags.map((f) => ({
    ...f,
    reviews: reviewMap[f.review_id] ?? null,
    profiles: profileMap[f.flagged_by] ?? null,
    total_flags_on_review: flagCounts[f.review_id] ?? 1,
  }));

  return NextResponse.json({ flags: enriched, total: count ?? 0 });
});
