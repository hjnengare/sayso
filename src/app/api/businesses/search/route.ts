import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface BusinessSearchResult {
  id: string;
  name: string;
  category: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  image_url?: string;
  verified: boolean;
  claim_status: 'unclaimed' | 'claimed' | 'pending';
  pending_by_user?: boolean; // true if current user has pending claim
  claimed_by_user?: boolean; // true if current user owns this business
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ businesses: [] }, { status: 200 });
    }

    const supabase = await getServerSupabase();
    
    // Get current user if authenticated
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (error) {
      // User not authenticated, continue without user context
    }

    // Search businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, category, location, address, phone, email, website, image_url, verified')
      .or(`name.ilike.%${query}%, description.ilike.%${query}%, category.ilike.%${query}%`)
      .limit(20);

    if (businessesError) {
      console.error('Error searching businesses:', businessesError);
      return NextResponse.json(
        { error: 'Failed to search businesses' },
        { status: 500 }
      );
    }

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ businesses: [] }, { status: 200 });
    }

    const businessIds = businesses.map(b => b.id);

    // Check claim status for each business
    const results: BusinessSearchResult[] = [];

    if (userId) {
      // Check if user owns any of these businesses
      const { data: ownedBusinesses } = await supabase
        .from('business_owners')
        .select('business_id')
        .eq('user_id', userId)
        .in('business_id', businessIds);

      const ownedBusinessIds = new Set(
        (ownedBusinesses || []).map(o => o.business_id)
      );

      // Check if user has pending requests for any of these businesses
      const { data: pendingRequests } = await supabase
        .from('business_ownership_requests')
        .select('business_id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .in('business_id', businessIds);

      const pendingBusinessIds = new Set(
        (pendingRequests || []).map(r => r.business_id)
      );

      // Check which businesses are claimed by anyone
      const { data: allOwners } = await supabase
        .from('business_owners')
        .select('business_id')
        .in('business_id', businessIds);

      const claimedBusinessIds = new Set(
        (allOwners || []).map(o => o.business_id)
      );

      // Build results with claim status
      for (const business of businesses) {
        const isOwnedByUser = ownedBusinessIds.has(business.id);
        const hasPendingByUser = pendingBusinessIds.has(business.id);
        const isClaimed = claimedBusinessIds.has(business.id);

        let claim_status: 'unclaimed' | 'claimed' | 'pending';
        if (isOwnedByUser) {
          claim_status = 'claimed';
        } else if (hasPendingByUser) {
          claim_status = 'pending';
        } else if (isClaimed) {
          claim_status = 'claimed';
        } else {
          claim_status = 'unclaimed';
        }

        results.push({
          ...business,
          claim_status,
          pending_by_user: hasPendingByUser,
          claimed_by_user: isOwnedByUser,
        });
      }
    } else {
      // User not authenticated - check if businesses are claimed by anyone
      const { data: allOwners } = await supabase
        .from('business_owners')
        .select('business_id')
        .in('business_id', businessIds);

      const claimedBusinessIds = new Set(
        (allOwners || []).map(o => o.business_id)
      );

      // Build results without user-specific status
      for (const business of businesses) {
        results.push({
          ...business,
          claim_status: claimedBusinessIds.has(business.id) ? 'claimed' : 'unclaimed',
          pending_by_user: false,
          claimed_by_user: false,
        });
      }
    }

    return NextResponse.json({ businesses: results }, { status: 200 });
  } catch (error) {
    console.error('Error in business search API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

