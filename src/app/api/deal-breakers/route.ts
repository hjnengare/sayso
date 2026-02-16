import { NextResponse } from "next/server";

// Deal-breakers are a static reference list (no DB table exists).
// Mirrors DEMO_DEAL_BREAKERS in useDealBreakersPage.
// Labels MUST match the exact tag strings used by the
// update_business_stats RPC (see 004_update-business-stats-rpc.sql)
// so that percentile calculations work correctly.
const DEAL_BREAKERS = [
  { id: 'trustworthiness', label: 'Trustworthy', icon: 'shield-checkmark' },
  { id: 'punctuality', label: 'On Time', icon: 'time' },
  { id: 'friendliness', label: 'Friendly', icon: 'happy' },
  { id: 'value-for-money', label: 'Good Value', icon: 'cash-outline' },
];

export async function GET() {
  return NextResponse.json({
    dealBreakers: DEAL_BREAKERS,
    count: DEAL_BREAKERS.length,
  });
}
