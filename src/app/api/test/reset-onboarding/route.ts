import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/test/reset-onboarding
 *
 * Test-only endpoint to reset or set onboarding state.
 * Used by Playwright tests to ensure deterministic test behavior.
 * Dev only — never available in production.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { email, complete = false } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: missing service role key' },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !usersData.users) {
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    const user = usersData.users.find((u: any) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;

    if (complete) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: true,
          onboarding_step: 'complete',
          account_role: 'user',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('[Test API] Profile update error:', profileError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: 'Onboarding marked as complete',
        state: { onboarding_complete: true }
      });

    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: false,
          onboarding_step: 'interests',
          interests_count: 0,
          subcategories_count: 0,
          dealbreakers_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('[Test API] Profile update error:', profileError);
        return NextResponse.json({ error: 'Failed to reset profile' }, { status: 500 });
      }

      await supabase.from('user_interests').delete().eq('user_id', userId);
      await supabase.from('user_subcategories').delete().eq('user_id', userId);
      await supabase.from('user_dealbreakers').delete().eq('user_id', userId);

      return NextResponse.json({
        ok: true,
        message: 'Onboarding reset to incomplete',
        state: { onboarding_complete: false, onboarding_step: 'interests' }
      });
    }

  } catch (error) {
    console.error('[Test API] Reset onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
