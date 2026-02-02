/**
 * Next.js Middleware
 * 
 * TEMPORARILY DISABLED for iOS compatibility investigation.
 * The proxy.ts middleware was causing iOS Safari to fail to display the site.
 * 
 * Cross-device email verification still works because:
 * - auth/callback/route.ts handles the token exchange
 * - verify-email/page.tsx handles the UI and redirects
 * 
 * TODO: Re-enable once iOS issues are resolved
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(_request: NextRequest) {
  // Middleware disabled - pass through all requests
  return NextResponse.next();
}

// Only match a dummy path to effectively disable middleware
// while keeping the file in place for future re-enablement
export const config = {
  matcher: [
    // Match nothing - middleware effectively disabled
    '/_disabled_middleware_placeholder',
  ],
};
