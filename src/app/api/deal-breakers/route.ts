import { NextResponse } from "next/server";

// Deal-breakers are a static reference list (no DB table exists).
// Mirrors DEMO_DEAL_BREAKERS in useDealBreakersPage.
const DEAL_BREAKERS = [
  { id: 'trustworthiness', label: 'Trustworthiness', icon: 'shield-checkmark' },
  { id: 'punctuality', label: 'Punctuality', icon: 'time' },
  { id: 'friendliness', label: 'Friendliness', icon: 'happy' },
  { id: 'value-for-money', label: 'Value for Money', icon: 'cash-outline' },
];

export async function GET() {
  return NextResponse.json({
    dealBreakers: DEAL_BREAKERS,
    count: DEAL_BREAKERS.length,
  });
}
