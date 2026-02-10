import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const rawLimit = Number.parseInt(searchParams.get('limit') ?? '50', 10);
    const rawOffset = Number.parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

    const service = getServiceSupabase();
    let query = service
      .from('business_claims')
      .select(
        `
        id,
        business_id,
        claimant_user_id,
        status,
        method_attempted,
        created_at,
        updated_at,
        submitted_at,
        reviewed_at,
        businesses!inner ( id, name, primary_subcategory_slug, primary_subcategory_label, location, slug )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length) query = query.in('status', statuses);
    }
    if (method) {
      const methods = method.split(',').map((m) => m.trim()).filter(Boolean);
      if (methods.length) query = query.in('method_attempted', methods);
    }
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const { data: rows, error, count } = await query;

    if (error) {
      console.error('Admin claims list error:', error);
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }

    const claims = (rows ?? []).map((c: any) => {
      const business = Array.isArray(c.businesses) ? c.businesses[0] : c.businesses;
      return {
        id: c.id,
        business_id: c.business_id,
        business_name: business?.name ?? null,
        business_slug: business?.slug ?? null,
        claimant_user_id: c.claimant_user_id,
        status: c.status,
        method_attempted: c.method_attempted,
        created_at: c.created_at,
        updated_at: c.updated_at,
        submitted_at: c.submitted_at,
        reviewed_at: c.reviewed_at,
      };
    });

    return NextResponse.json({
      claims,
      total: count ?? claims.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Admin claims list error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
