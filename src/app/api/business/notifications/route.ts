import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ProfileRoleRow = {
  role?: string | null;
  account_role?: string | null;
};

function isBusinessOwnerRole(profile: ProfileRoleRow | null): boolean {
  const role = String(profile?.account_role ?? profile?.role ?? '').toLowerCase().trim();
  return role === 'business_owner';
}

export async function GET(req: NextRequest) {
  const endpoint = '/api/business/notifications';

  try {
    const supabase = await getServerSupabase(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[BusinessNotificationsAPI] Unauthorized request', {
        endpoint,
        status: 401,
        errorCode: authError?.code ?? null,
        errorMessage: authError?.message ?? 'Missing authenticated user',
        hasSession: false,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', user.id)
      .maybeSingle<ProfileRoleRow>();

    if (profileError) {
      console.error('[BusinessNotificationsAPI] Profile lookup failed', {
        endpoint,
        status: 500,
        errorCode: profileError.code ?? null,
        errorMessage: profileError.message,
        hasSession: true,
      });
      return NextResponse.json(
        { error: 'Failed to validate business account' },
        { status: 500 }
      );
    }

    if (!isBusinessOwnerRole(profile)) {
      console.error('[BusinessNotificationsAPI] Forbidden non-business request', {
        endpoint,
        status: 403,
        errorCode: 'FORBIDDEN_ROLE',
        errorMessage: 'Business account required',
        hasSession: true,
      });
      return NextResponse.json(
        { error: 'Business account required' },
        { status: 403 }
      );
    }

    // Safe default until business notifications datasource is wired.
    return NextResponse.json({
      items: [],
      unreadCount: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[BusinessNotificationsAPI] Unexpected error', {
      endpoint,
      status: 500,
      errorCode: 'UNEXPECTED_ERROR',
      errorMessage: message,
      hasSession: null,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
