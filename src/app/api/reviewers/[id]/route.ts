import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBadgeMapping, getBadgePngPath } from '../../../lib/badgeMappings';

/**
 * GET /api/reviewers/[id]
 * Fetches detailed reviewer profile with reviews and stats
 * PUBLIC ENDPOINT - Uses service role for unauthenticated access
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Use service role client for public queries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        username,
        display_name,
        avatar_url,
        reviews_count,
        is_top_reviewer,
        badges_count,
        created_at
      `)
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('[Reviewer Profile] Profile query error:', profileError.message, profileError.code);
      return NextResponse.json(
        { error: 'Reviewer not found', detail: profileError.message },
        { status: 404 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Reviewer not found' },
        { status: 404 }
      );
    }

    // Fetch user's reviews
    console.log('[Reviewer Profile] Fetching reviews for user_id:', userId);
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, business_id, rating, title, content, tags, helpful_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (reviewsError) {
      console.error('[Reviewer Profile] Reviews fetch error:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    console.log('[Reviewer Profile] Found reviews:', reviews?.length || 0);
    console.log('[Reviewer Profile] Sample review data structure:', JSON.stringify(reviews?.[0], null, 2));

    // Business lookup - use service role to bypass RLS but filter for active businesses only
    const businessLookup = new Map<string, any>();
    if (reviews && reviews.length > 0) {
      const bizIds = [...new Set(reviews.map((r: any) => r.business_id).filter(Boolean))];
      console.log('[Reviewer Profile] Business IDs from reviews:', bizIds);
      console.log('[Reviewer Profile] Reviews array:', JSON.stringify(reviews.map(r => ({ id: r.id, business_id: r.business_id })), null, 2));
      
      if (bizIds.length > 0) {
        console.log('[Reviewer Profile] Attempting to fetch businesses for IDs:', bizIds);
        
        // Fetch businesses by ID without status filter first
        const { data: bizRows, error: bizError } = await supabase
          .from('businesses')
          .select('id, name, primary_subcategory_slug, primary_category_slug, status, image_url, uploaded_images')
          .in('id', bizIds);
          
        if (bizError) {
          console.error('[Reviewer Profile] Business lookup error:', bizError);
        } else {
          console.log('[Reviewer Profile] Found businesses:', bizRows?.length || 0);
          console.log('[Reviewer Profile] Business data:', JSON.stringify(bizRows, null, 2));
          
          for (const b of bizRows || []) {
            if (b?.id) {
              businessLookup.set(b.id, b);
              console.log('[Reviewer Profile] Mapped business:', b.id, '→', b.name, `(status: ${b.status})`);
            }
          }
        }
      }
    }
    
    console.log('[Reviewer Profile] Business lookup map size:', businessLookup.size);


    // Fetch review images (separate query)
    const imageLookup = new Map<string, string[]>();
    if (reviews.length > 0) {
      const reviewIds = reviews.map((r: any) => r.id).filter(Boolean);
      if (reviewIds.length > 0) {
        const { data: imgRows } = await supabase
          .from('review_images')
          .select('review_id, image_url')
          .in('review_id', reviewIds);
        for (const img of imgRows || []) {
          if (!img?.review_id) continue;
          if (!imageLookup.has(img.review_id)) imageLookup.set(img.review_id, []);
          imageLookup.get(img.review_id)!.push(img.image_url);
        }
      }
    }

    // Calculate stats
    const avgRating = reviews?.length
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

    const totalLikes = reviews?.reduce((acc, r) => acc + (r.helpful_count || 0), 0) || 0;

    // Fetch user's earned badges (two queries to avoid PostgREST join issues)
    let badges: Array<{ id: string; name: string; icon: string; description: string; earnedDate: string; badge_group?: string }> = [];
    try {
      console.log('[Reviewer Profile] Fetching badges for user_id:', userId);
      const { data: ubRows } = await supabase
        .from('user_badges')
        .select('badge_id, awarded_at')
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false })
        .limit(10);

      console.log('[Reviewer Profile] Found user_badges rows:', ubRows?.length || 0);

      if (ubRows && ubRows.length > 0) {
        const badgeIds = ubRows.map((r: any) => r.badge_id).filter(Boolean);
        console.log('[Reviewer Profile] Badge IDs to lookup:', badgeIds);
        
        const { data: badgeRows, error: badgeError } = await supabase
          .from('badges')
          .select('id, name, description, icon_name, badge_group')
          .in('id', badgeIds);

        if (badgeError) {
          console.error('[Reviewer Profile] Badges lookup error:', badgeError);
        } else {
          console.log('[Reviewer Profile] Found badge definitions:', badgeRows?.length || 0);
        }

        const badgeLookup = new Map<string, any>();
        for (const b of badgeRows || []) {
          if (b?.id) badgeLookup.set(b.id, b);
        }
        const awardedAtMap = new Map<string, string>();
        for (const r of ubRows) {
          if (r?.badge_id) awardedAtMap.set(r.badge_id, r.awarded_at);
        }

        badges = badgeIds
          .map((badgeId: string) => {
            const badge = badgeLookup.get(badgeId);
            if (!badge) {
              console.warn('[Reviewer Profile] Badge definition not found for ID:', badgeId);
              return null;
            }
            const mapping = getBadgeMapping(badge.id);
            const result = {
              id: badge.id,
              name: mapping?.name || badge.name,
              icon: mapping?.pngPath || getBadgePngPath(badge.id),
              description: mapping?.description || badge.description,
              badge_group: badge.badge_group,
              earnedDate: new Date(awardedAtMap.get(badgeId) || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
              })
            };
            console.log('[Reviewer Profile] Processed badge:', result.name, result.id);
            return result;
          })
          .filter(Boolean) as typeof badges;
      }
    } catch (badgeErr) {
      console.warn('[Reviewer Profile] Badge fetch failed (non-fatal):', badgeErr);
    }

    console.log('[Reviewer Profile] Final badges count:', badges.length);

    // Transform reviews
    const transformedReviews = reviews.map((review: any) => {
      // Get business data from lookup map
      const biz = businessLookup.get(review.business_id);
      console.log('[Reviewer Profile] Transforming review:', {
        reviewId: review.id,
        businessId: review.business_id,
        foundBusiness: !!biz,
        businessName: biz?.name || 'NOT_FOUND',
        businessImageUrl: biz?.uploaded_images?.[0] || biz?.image_url || null,
        businessStatus: biz?.status
      });
      
      // Get business image - prioritize uploaded_images array, fallback to image_url
      const businessImageUrl = biz?.uploaded_images && Array.isArray(biz.uploaded_images) && biz.uploaded_images.length > 0 
        ? biz.uploaded_images[0] 
        : biz?.image_url || null;
      
      // Better fallback for business name
      const businessName = biz?.name || 'Unknown Business';
      
      return {
        id: review.id,
        businessId: review.business_id, // Add business ID for linking
        businessName: businessName,
        businessImageUrl: businessImageUrl, // Add business image URL
        businessType: biz?.primary_subcategory_slug || biz?.primary_category_slug || 'Business',
        rating: review.rating,
        title: review.title, // Add review title if it exists
        text: review.content,
        date: new Date(review.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        likes: review.helpful_count || 0,
        tags: review.tags || [],
        images: imageLookup.get(review.id) || []
      };
    });

    // Build reviewer profile
    const reviewerProfile = {
      id: profile.user_id,
      name: profile.display_name || profile.username || 'Anonymous',
      username: profile.username,
      profilePicture: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || 'User')}&background=random`,
      reviewCount: transformedReviews.length, // Use actual reviews count instead of profile.reviews_count
      rating: Math.round(avgRating * 10) / 10,
      badge: profile.is_top_reviewer ? 'top' as const : undefined,
      location: 'Cape Town',
      bio: null,
      memberSince: new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      helpfulVotes: totalLikes,
      impactScore: Math.round((totalLikes * 10) + (transformedReviews.length * 5) + (badges.length * 15)),
      averageRating: Math.round(avgRating * 10) / 10,
      reviews: transformedReviews,
      badges: badges,
      badgesCount: badges.length // Use actual badges count
    };

    console.log('[Reviewer Profile] Final profile summary:', {
      reviewsCount: reviewerProfile.reviewCount,
      badgesCount: reviewerProfile.badgesCount,
      avgRating: reviewerProfile.averageRating,
      hasReviews: reviewerProfile.reviews.length > 0,
      hasBadges: reviewerProfile.badges.length > 0
    });

    return NextResponse.json({
      ok: true,
      reviewer: reviewerProfile
    });

  } catch (error: any) {
    console.error('[Reviewer Profile] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviewer profile', message: error.message },
      { status: 500 }
    );
  }
}
