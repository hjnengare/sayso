import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { count: total } = await sb
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: withCoords } = await sb
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  const { count: noCoords } = await sb
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .or('lat.is.null,lng.is.null');

  // Check newest 20 businesses - do they have coords?
  const { data: newest } = await sb
    .from('businesses')
    .select('id, name, lat, lng, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(`Total active: ${total}`);
  console.log(`With coords:  ${withCoords}`);
  console.log(`Without coords: ${noCoords}`);
  console.log('\nNewest 20 businesses:');
  newest?.forEach(b => {
    console.log(`  ${String(b.name).padEnd(40)} lat=${b.lat ?? 'NULL'} lng=${b.lng ?? 'NULL'} | ${String(b.created_at).slice(0, 10)}`);
  });
}

main().catch(console.error);
