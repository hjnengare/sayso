/**
 * Connection Pool Manager for Supabase Clients
 * Implements singleton pattern with connection reuse for better performance
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cache for Supabase clients per request
const clientCache = new WeakMap<Request, SupabaseClient>();

// Global client pool (for non-request-scoped operations)
let globalClient: SupabaseClient | null = null;

/**
 * Get or create a Supabase client for the current request
 * Uses WeakMap to ensure one client per request lifecycle
 */
export async function getPooledSupabaseClient(request?: Request): Promise<SupabaseClient> {
  // If request is provided, use request-scoped caching and read cookies from Request
  if (request) {
    const cached = clientCache.get(request);
    if (cached) {
      return cached;
    }

    // Read cookies from Request headers (for API routes)
    // This ensures we get the actual cookies sent by the browser
    const requestCookies = request.headers.get('cookie') || '';
    const cookieMap = new Map<string, string>();
    
    // Parse cookies from request header (handle URL-encoded values)
    requestCookies.split(';').forEach(cookie => {
      const trimmed = cookie.trim();
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const name = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        if (name && value) {
          // Decode URL-encoded cookie values
          try {
            cookieMap.set(name, decodeURIComponent(value));
          } catch {
            // If decoding fails, use raw value
            cookieMap.set(name, value);
          }
        }
      }
    });

    // Also get cookies from next/headers for setting (API routes can set cookies)
    const cookieStore = await cookies();
    
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Return cookies from both Request and cookieStore
            const allCookies: Array<{ name: string; value: string }> = [];
            
            // First, get cookies from Request (browser-sent cookies)
            cookieMap.forEach((value, name) => {
              allCookies.push({ name, value });
            });
            
            // Then, get cookies from cookieStore (server-set cookies)
            const serverCookies = cookieStore.getAll();
            serverCookies.forEach(cookie => {
              // Don't override Request cookies with server cookies
              if (!cookieMap.has(cookie.name)) {
                allCookies.push({ name: cookie.name, value: cookie.value });
              }
            });
            
            return allCookies;
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                // Set cookie with proper flags for httpOnly, secure, sameSite
                cookieStore.set({ 
                  name, 
                  value, 
                  ...options,
                  // Ensure httpOnly for security (Supabase SSR handles this, but be explicit)
                  httpOnly: options?.httpOnly ?? true,
                  // Secure in production (HTTPS)
                  secure: options?.secure ?? process.env.NODE_ENV === 'production',
                  // SameSite for CSRF protection
                  sameSite: options?.sameSite ?? 'lax',
                });
              } catch (error) {
                // Ignore cookie set errors in Server Components
              }
            });
          },
        },
      }
    );

    clientCache.set(request, client);
    return client;
  }

  // For non-request-scoped operations, use global singleton
  if (!globalClient) {
    const cookieStore = await cookies();
    globalClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {
                // Ignore cookie set errors
              }
            });
          },
        },
      }
    );
  }

  return globalClient;
}

/**
 * Create multiple Supabase clients for parallel operations
 * Useful when you need to execute independent queries simultaneously
 */
export async function createParallelClients(count: number = 2): Promise<SupabaseClient[]> {
  const cookieStore = await cookies();
  const clients: SupabaseClient[] = [];

  for (let i = 0; i < count; i++) {
    clients.push(
      createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                try {
                  cookieStore.set({ name, value, ...options });
                } catch (error) {
                  // Ignore cookie set errors
                }
              });
            },
          },
        }
      )
    );
  }

  return clients;
}

/**
 * Clear the global client cache (useful for testing or memory management)
 */
export function clearClientCache() {
  globalClient = null;
}

