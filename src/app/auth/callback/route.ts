import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token') || requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    
    // Handle specific OAuth errors
    if (error === 'access_denied') {
      return NextResponse.redirect(
        new URL('/auth/auth-code-error?error=Access denied. Please try again.', request.url)
      );
    } else if (error === 'invalid_request') {
      return NextResponse.redirect(
        new URL('/auth/auth-code-error?error=Invalid request. Please try again.', request.url)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=${encodeURIComponent(error_description || error)}`, request.url)
    );
  }

  // Legacy hash fragment (e.g. email confirmation in different browser): tokens are in #access_token=...&refresh_token=...
  // Server never sees the hash, so return HTML that sets session client-side then redirects.
  const typeFromQuery = requestUrl.searchParams.get('type');
  const nextFromQuery = requestUrl.searchParams.get('next') ?? '/';
  if (!code && !token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Confirming…</title></head>
<body>
  <p>Confirming your sign-in…</p>
  <script>
    (function() {
      var SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
      var SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
      var REDIRECT_TYPE = ${JSON.stringify(typeFromQuery || '')};
      var NEXT = ${JSON.stringify(nextFromQuery)};
      var hash = window.location.hash && window.location.hash.substring(1);
      var params = new URLSearchParams(hash || '');
      var access_token = params.get('access_token');
      var refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) {
        window.location.replace('/auth/auth-code-error?error=missing_tokens');
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      script.async = false;
      script.onload = function() {
        var supabase = window.supabase;
        var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        client.auth.setSession({ access_token: access_token, refresh_token: refresh_token })
          .then(function() {
            if (REDIRECT_TYPE === 'recovery' || REDIRECT_TYPE === 'password_recovery') {
              window.location.replace('/reset-password?verified=1');
            } else if (REDIRECT_TYPE === 'email_change' || REDIRECT_TYPE === 'emailchange') {
              window.location.replace('/profile?email_changed=true');
            } else {
              window.location.replace('/verify-email?verified=1');
            }
          })
          .catch(function(err) {
            console.error('Hash session set error:', err);
            window.location.replace('/auth/auth-code-error?error=session_set_failed');
          });
      };
      script.onerror = function() {
        window.location.replace('/auth/auth-code-error?error=script_load');
      };
      document.head.appendChild(script);
    })();
  </script>
</body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (code || token) {
    // Create response first so we can set cookies on it
    let response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: (options?.httpOnly as boolean | undefined) ?? true,
              secure: (options?.secure as boolean | undefined) ?? process.env.NODE_ENV === 'production',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
              path: (options?.path as string | undefined) ?? '/',
            });
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set(name, '', {
              ...options,
              httpOnly: (options?.httpOnly as boolean | undefined) ?? true,
              secure: (options?.secure as boolean | undefined) ?? process.env.NODE_ENV === 'production',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
              path: (options?.path as string | undefined) ?? '/',
              maxAge: 0,
            });
          },
        },
      }
    );

    const { error: exchangeError } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token: token as string,
          type: (type || 'signup') as any,
          email: requestUrl.searchParams.get('email') || undefined,
        });

    if (!exchangeError) {
      // Check if profile exists and get onboarding status
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_step, onboarding_complete, onboarding_completed_at, interests_count, subcategories_count, dealbreakers_count, role, account_role')
          .eq('user_id', user.id)
          .single();

        if (profileError && isSchemaCacheError(profileError)) {
          ({ data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count, role, account_role')
            .eq('user_id', user.id)
            .single());
        }

        if (profileError) {
          console.warn('[Auth Callback] Error fetching profile:', profileError);
        }

        // Check callback type first
        const type = requestUrl.searchParams.get('type');

        // Handle password recovery
        if (type === 'recovery' || type === 'password_recovery') {
          console.log('Password recovery callback - redirecting to reset-password');
          const resetUrl = new URL('/reset-password', request.url);
          resetUrl.searchParams.set('verified', '1');
          // Copy cookies to redirect response
          const redirectResponse = NextResponse.redirect(resetUrl);
          response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie);
          });
          return redirectResponse;
        }

        // Handle email change confirmation
        if (type === 'email_change' || type === 'emailchange') {
          console.log('Email change callback - email change confirmed');
          // Redirect to profile page with success message
          const dest = new URL('/profile', request.url);
          dest.searchParams.set('email_changed', 'true');
          // Copy cookies to redirect response
          const redirectResponse = NextResponse.redirect(dest);
          response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie);
          });
          return redirectResponse;
        }

        // Check if this is an email verification callback
        if (type === 'signup') {
          console.log('Email verification callback - checking verification status');
          // Check if email is actually verified now
          if (user.email_confirmed_at) {
            // CRITICAL: Check user's role to determine redirect destination
            // Priority: user_metadata.account_type (source of truth from registration) > profile role
            // Never send business users to user onboarding (/interests); when role unknown, send to /verify-email so middleware can decide
            const userMetadataAccountType = user.user_metadata?.account_type as string | undefined;
            const profileRole = profile?.role || profile?.account_role;

            let userRole: string | null = null;
            if (userMetadataAccountType === 'business_owner') {
              userRole = 'business_owner';
            } else if (userMetadataAccountType === 'user') {
              userRole = 'user';
            } else if (profileRole === 'business_owner') {
              userRole = 'business_owner';
            } else if (profileRole === 'user') {
              userRole = 'user';
            }
            // When role unknown (no metadata, profile missing or role not set), do NOT assume 'user' — send to /verify-email so middleware can fetch and redirect

            console.log('Email verified - determining redirect:', {
              profileRole: profile?.role,
              account_role: profile?.account_role,
              metadataAccountType: userMetadataAccountType,
              resolvedRole: userRole
            });

            // Sync profile role with user metadata if they don't match (set during registration)
            if (userMetadataAccountType && profile && profile.role !== userMetadataAccountType) {
              console.log('Profile role mismatch - syncing profile with metadata:', {
                currentProfileRole: profile.role,
                metadataAccountType: userMetadataAccountType
              });

              try {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({
                    role: userMetadataAccountType,
                    account_role: userMetadataAccountType,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', user.id);

                if (updateError) {
                  console.error('Failed to sync profile role:', updateError);
                } else {
                  console.log('Successfully synced profile role to:', userMetadataAccountType);
                }
              } catch (syncError) {
                console.error('Error syncing profile role:', syncError);
              }
            }

            if (userRole === 'business_owner') {
              console.log('Email verified - business owner, redirecting to /my-businesses');
              const dest = new URL('/my-businesses', request.url);
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            }
            if (userRole === 'user') {
              console.log('Email verified - personal user, redirecting to interests onboarding');
              const dest = new URL('/interests', request.url);
              dest.searchParams.set('verified', '1');
              dest.searchParams.set('email_verified', 'true');
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            }
            // Role unknown (e.g. profile not yet created or role not set) — send to /verify-email so middleware can fetch status and redirect (avoids sending business to /interests)
            console.log('Email verified - role unknown, redirecting to /verify-email for middleware to decide');
            const verifyDest = new URL('/verify-email', request.url);
            verifyDest.searchParams.set('verified', '1');
            const redirectResponse = NextResponse.redirect(verifyDest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          } else {
            console.log('Email not yet verified - redirecting to verify-email');
            // Email not verified, redirect to verify-email page
            const redirectResponse = NextResponse.redirect(new URL('/verify-email', request.url));
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }
        }

        // Handle Google OAuth and other auth flows
        // Check if this is a new user (first-time Google sign-in)
        const isNewUser = !profile;
        
        if (isNewUser) {
          // New user from Google OAuth - Check if email is tied to business ownership
          console.log('Google OAuth: New user detected, checking for business email tie-in');
          
          // Wait a bit for trigger to potentially create profile
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if this email has any business owners linked to it
          // (In case they registered a business under this email)
          const { data: businessOwners } = await supabase
            .from('business_owners')
            .select('business_id')
            .eq('user_id', user.id)
            .limit(1);
          
          // Also check business_ownership_requests for approved claims
          const { data: ownershipRequests } = await supabase
            .from('business_ownership_requests')
            .select('business_id, status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1);

          const hasBusinessOwnership = (businessOwners && businessOwners.length > 0) || 
                                       (ownershipRequests && ownershipRequests.length > 0);

          if (hasBusinessOwnership) {
            // Email is tied to business ownership - redirect to role selection gate
            console.log('OAuth Email has business ownership tie-in, redirecting to role selection');
            const dest = new URL('/onboarding/select-account-type', request.url);
            dest.searchParams.set('oauth', 'true');
            dest.searchParams.set('business_tied', 'true');
            const redirectResponse = NextResponse.redirect(dest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }

          // New user from Google OAuth - profile should be created by trigger with 'user' role
          // OAuth users get Personal accounts by default
          console.log('Google OAuth: New user detected with no business tie-in, redirecting to interests for personal onboarding');
          
          if (user.email_confirmed_at) {
            // Email is verified (Google emails are auto-verified), redirect to interests for personal onboarding
            const dest = new URL('/interests', request.url);
            dest.searchParams.set('verified', '1');
            dest.searchParams.set('email_verified', 'true');
            // Copy cookies to redirect response
            const redirectResponse = NextResponse.redirect(dest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          } else {
            // Email not verified, redirect to verify-email
            const redirectResponse = NextResponse.redirect(new URL('/verify-email', request.url));
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }
        } else {
          // Existing user - check if business owner for proper redirect
          const userRole = profile?.role || profile?.account_role;
          const isOnboardingComplete = !!profile?.onboarding_completed_at;

          // OAuth guard: If email already owns a business, require explicit role selection
          if (type === 'oauth' && (userRole === 'business_owner' || profile.role === 'both')) {
            const dest = new URL('/onboarding/select-account-type', request.url);
            dest.searchParams.set('mode', 'oauth');
            dest.searchParams.set('existingRole', 'business_owner');
            if (user.email) {
              dest.searchParams.set('email', user.email);
            }

            const redirectResponse = NextResponse.redirect(dest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }
          // Existing user - check onboarding status
          // STRICT: Use onboarding_step as single source of truth
          if (isOnboardingComplete) {
            // User has completed onboarding, redirect based on role
            console.log('[Auth Callback] User completed onboarding, redirecting based on role:', userRole);
            const destination = userRole === 'business_owner' ? '/claim-business' : '/complete';
            const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          } else {
            // User exists but onboarding incomplete - redirect to required step
            if (user.email_confirmed_at) {
              // Business owners skip personal onboarding and go to claim-business
              if (userRole === 'business_owner') {
                console.log('[Auth Callback] Business owner, redirecting to /claim-business');
                const redirectResponse = NextResponse.redirect(new URL('/claim-business', request.url));
                response.cookies.getAll().forEach(cookie => {
                  redirectResponse.cookies.set(cookie);
                });
                return redirectResponse;
              }

              console.log('[Auth Callback] Redirecting to onboarding start:', {
                onboarding_complete: profile?.onboarding_complete,
                onboarding_completed_at: profile?.onboarding_completed_at
              });

              const dest = new URL('/interests', request.url);
              // Copy cookies to redirect response
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            } else {
              // Email not verified, redirect to verify-email
              const redirectResponse = NextResponse.redirect(new URL('/verify-email', request.url));
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            }
          }
        }
      }

      // Default redirect with cookies
      const redirectResponse = NextResponse.redirect(new URL(next, request.url));
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }

    console.error('Code exchange error:', exchangeError);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}

