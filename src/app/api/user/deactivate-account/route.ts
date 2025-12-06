import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Deactivate the user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error deactivating account:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate account. Please contact support.' },
        { status: 500 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in deactivate account:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate account' },
      { status: 500 }
    );
  }
}

