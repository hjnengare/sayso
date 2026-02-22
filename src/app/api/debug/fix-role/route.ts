import { NextResponse, NextRequest } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { isAdmin } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * ADMIN ONLY: Fix user profile role data
 * Dev/admin only — not available in production.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const supabase = await getServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found', profileError: profileError?.message },
        { status: 404 }
      );
    }

    const { newRole } = await request.json();

    if (!['user', 'business_owner'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid newRole' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        account_role: newRole,
        role: profile.role || newRole,
        email: user.email
      })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile', updateError: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Profile updated: account_role = ${newRole}`,
      profile: {
        user_id: user.id,
        account_role: newRole,
        role: profile.role || newRole
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
