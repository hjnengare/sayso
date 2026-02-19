/**
 * Debug: Call For You RPC as a specific user to see what the DB returns.
 * Run: npx tsx scripts/debug-for-you-api.ts
 *
 * Add to .env or .env.local:
 *   DEBUG_FOR_YOU_EMAIL=your@email.com
 *   DEBUG_FOR_YOU_PASSWORD=yourpassword
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
import { createClient } from '@supabase/supabase-js';

const EMAIL = process.env.DEBUG_FOR_YOU_EMAIL;
const PASSWORD = process.env.DEBUG_FOR_YOU_PASSWORD;

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }
  if (!EMAIL || !PASSWORD) {
    console.error('Add DEBUG_FOR_YOU_EMAIL and DEBUG_FOR_YOU_PASSWORD to .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authError) {
    console.error('Login failed:', authError.message);
    process.exit(1);
  }
  console.log('Logged in as:', authData.user?.email, '(id:', authData.user?.id?.slice(0, 8) + '...)');

  // Get user preferences (interests) - same as For You uses
  const { data: prefs } = await supabase.from('user_interests').select('interest_id').eq('user_id', authData.user!.id);
  const interestIds = (prefs ?? []).map((r: any) => r.interest_id);
  const { data: subPrefs } = await supabase.from('user_subcategories').select('subcategory_id').eq('user_id', authData.user!.id);
  const subIds = (subPrefs ?? []).map((r: any) => r.subcategory_id);
  console.log('User interests:', interestIds.length, 'interests,', subIds.length, 'subcategories');

  // Call recommend_for_you_cold_start (same as API) - uses USER's auth = RLS applies
  const { data: coldStart, error: coldError } = await supabase.rpc('recommend_for_you_cold_start', {
    p_interest_ids: interestIds.length ? interestIds : [],
    p_sub_interest_ids: subIds.length ? subIds : [],
    p_price_ranges: null,
    p_latitude: null,
    p_longitude: null,
    p_limit: 100,
    p_seed: 'debug',
  });

  if (coldError) {
    console.error('recommend_for_you_cold_start error:', coldError.message);
    process.exit(1);
  }
  const count = Array.isArray(coldStart) ? coldStart.length : 0;
  console.log('\n--- recommend_for_you_cold_start (as logged-in user) ---');
  console.log('Businesses returned:', count);
  if (count > 0) {
    console.log('First 5:', (coldStart as any[]).slice(0, 5).map((b: any) => ({ name: b?.name, id: b?.id?.slice(0, 8) })));
  }

  // Also check: how many active businesses in DB (with service role would show all)
  const { count: activeCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'active');
  console.log('\nActive businesses in DB (visible to this user via RLS):', activeCount ?? '?');
  console.log('\n--- End ---');
}

main().catch(console.error);
