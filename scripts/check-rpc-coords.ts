import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await sb.rpc('list_businesses_optimized', {
    p_limit: 10,
    p_cursor_id: null,
    p_cursor_created_at: null,
    p_category: null,
    p_location: null,
    p_verified: null,
    p_price_range: null,
    p_badge: null,
    p_min_rating: null,
    p_search: null,
    p_latitude: null,
    p_longitude: null,
    p_radius_km: null,
    p_sort_by: null,
    p_sort_order: null,
  });

  if (error) {
    console.error('RPC error:', error.message);
    return;
  }

  console.log('RPC returned', data?.length, 'rows');
  if (data?.length > 0) {
    console.log('Keys in first row:', Object.keys(data[0]));
    console.log('\nSample (lat/lng/latitude/longitude):');
    (data as Array<Record<string, unknown>>).slice(0, 5).forEach((b) => {
      console.log(`  ${String(b.name).padEnd(40)} lat=${b.lat ?? 'MISSING'} lng=${b.lng ?? 'MISSING'} latitude=${b.latitude ?? 'MISSING'} longitude=${b.longitude ?? 'MISSING'}`);
    });
  }
}

main().catch(console.error);
