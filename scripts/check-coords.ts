import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await sb
    .from('businesses')
    .select('id, name, lat, lng, location')
    .eq('status', 'active')
    .limit(20);

  if (error) { console.error(error); process.exit(1); }

  const withCoords = data?.filter(b => b.lat != null && b.lng != null).length ?? 0;
  console.log(`With coords: ${withCoords} / ${data?.length} sampled`);
  data?.slice(0, 10).forEach(b => {
    console.log(`  ${String(b.name).padEnd(40)} lat=${b.lat ?? 'NULL'} lng=${b.lng ?? 'NULL'} | "${b.location}"`);
  });

  // Also get total count with coords
  const { count } = await sb
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('lat', 'is', null)
    .not('lng', 'is', null);
  console.log(`\nTotal active businesses with coords: ${count}`);
}

main().catch(console.error);
