import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPooledSupabaseClient } from "./pool";

/**
 * Get Supabase client for server-side operations
 * Uses connection pooling for better performance
 * 
 * @param request - Optional request object for request-scoped client caching
 * @returns Supabase client instance
 */
export async function getServerSupabase(request?: Request) {
  // Use pooled client if request is available (better performance)
  if (request) {
    return getPooledSupabaseClient(request);
  }

  // Fallback to standard client creation (for Server Components)
  const cookieStore = await cookies();

  return createServerClient(
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
              cookieStore.set({ 
                name, 
                value, 
                ...options,
                // Ensure proper cookie flags for security
                httpOnly: options?.httpOnly ?? true,
                secure: options?.secure ?? process.env.NODE_ENV === 'production',
                sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
                path: options?.path ?? '/',
              });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          });
        },
      },
    }
  );
}
