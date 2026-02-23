import { NextResponse } from "next/server";
import { getServerSupabase } from "@/app/lib/supabase/server";
import {
  mapEventsAndSpecialsRowToEventCard,
  type EventsAndSpecialsRow,
} from "@/app/lib/events/mapEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
const POOL_SIZE = 30; // over-fetch for random selection
const RESULT_SIZE = 5;

export async function GET() {
  try {
    const supabase = await getServerSupabase();

    // SAST-aware cutoff: midnight today in UTC+2 (same logic as main events route)
    const nowUtc = new Date();
    const sastMidnight = new Date(nowUtc);
    sastMidnight.setUTCHours(sastMidnight.getUTCHours() + 2);
    sastMidnight.setUTCHours(0, 0, 0, 0);
    sastMidnight.setUTCHours(sastMidnight.getUTCHours() - 2);
    const bufferStart = sastMidnight.toISOString();

    const { data, error } = await supabase
      .from("events_and_specials")
      .select("id,title,type,business_id,start_date,end_date,location,icon,price,rating")
      .or(`end_date.gte.${bufferStart},and(end_date.is.null,start_date.gte.${bufferStart})`)
      .order("start_date", { ascending: true })
      .limit(POOL_SIZE);

    if (error) throw error;

    const rows = (data ?? []) as EventsAndSpecialsRow[];

    // Shuffle in JS (Supabase JS client has no ORDER BY RANDOM())
    const shuffled = rows.slice().sort(() => Math.random() - 0.5).slice(0, RESULT_SIZE);
    const items = shuffled.map((row) => mapEventsAndSpecialsRowToEventCard(row));

    return NextResponse.json({ items }, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch {
    return NextResponse.json({ items: [] }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
