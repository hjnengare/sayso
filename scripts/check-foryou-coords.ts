import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await sb.rpc('recommend_for_you_unified', {
    p_interest_ids: [],
    p_sub_interest_ids: [],
    p_dealbreaker_ids: [],
    p_price_ranges: null,
    p_latitude: null,
    p_longitude: null,
    p_limit: 10,
    p_seed: '2026-03-10',
  });

  if (error) {
    console.error('RPC error:', error.message, error.details);
    return;
  }

  console.log('RPC returned', data?.length, 'rows');
  if (data?.length > 0) {
    console.log('\nKeys in first row:', Object.keys(data[0]));
    const hasLat = 'lat' in data[0];
    const hasLatitude = 'latitude' in data[0];
    const hasLng = 'lng' in data[0];
    const hasLongitude = 'longitude' in data[0];
    console.log(`\nlat: ${hasLat}, latitude: ${hasLatitude}, lng: ${hasLng}, longitude: ${hasLongitude}`);
    console.log('\nSample coords:');
    (data as Array<Record<string, unknown>>).slice(0, 5).forEach((b) => {
      console.log(`  ${String(b.name).padEnd(40)} lat=${b.lat ?? 'MISSING'} lng=${b.lng ?? 'MISSING'} latitude=${b.latitude ?? 'MISSING'} longitude=${b.longitude ?? 'MISSING'}`);
    });
  }
}

main().catch(console.error);
