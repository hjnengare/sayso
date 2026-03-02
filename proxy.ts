/**
 * Next.js 16 Proxy (formerly Middleware)
 *
 * Consolidates request handling into a single entrypoint:
 * - API CORS handling
 * - Authentication, email verification, and onboarding routing
 */

import { proxy as handleRequest } from './src/proxy';
import { NextResponse, type NextRequest } from 'next/server';

function applyApiCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      return applyApiCorsHeaders(new NextResponse(null, { status: 200 }));
    }

    return applyApiCorsHeaders(NextResponse.next());
  }

  return handleRequest(request);
}

// Config must be a static object (can't be re-exported)
export const config = {
  matcher: [
    '/api/:path*',
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, sitemap.xml, robots.txt
     * - static assets (images)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
