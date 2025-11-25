/**
 * Rate limiter for review flagging
 * Limits users to 10 flags per hour
 */

import { getServerSupabase } from '../supabase/server';

export interface FlagRateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetAt: Date;
  error?: string;
}

export class FlagRateLimiter {
  private static readonly MAX_FLAGS_PER_HOUR = 10;
  private static readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Check if user can flag a review
   */
  static async checkRateLimit(userId: string): Promise<FlagRateLimitResult> {
    try {
      const supabase = await getServerSupabase();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - this.WINDOW_MS);

      // Count flags in the last hour
      const { count, error } = await supabase
        .from('review_flags')
        .select('*', { count: 'exact', head: true })
        .eq('flagged_by', userId)
        .gte('created_at', oneHourAgo.toISOString());

      if (error) {
        console.error('Error checking flag rate limit:', error);
        // Allow on error to avoid blocking legitimate users
        return {
          allowed: true,
          remainingAttempts: this.MAX_FLAGS_PER_HOUR,
          resetAt: new Date(now.getTime() + this.WINDOW_MS),
        };
      }

      const flagCount = count || 0;
      const remainingAttempts = Math.max(0, this.MAX_FLAGS_PER_HOUR - flagCount);
      const allowed = flagCount < this.MAX_FLAGS_PER_HOUR;

      return {
        allowed,
        remainingAttempts,
        resetAt: new Date(now.getTime() + this.WINDOW_MS),
        error: allowed
          ? undefined
          : `Rate limit exceeded. You can flag up to ${this.MAX_FLAGS_PER_HOUR} reviews per hour.`,
      };
    } catch (error) {
      console.error('Error in flag rate limiter:', error);
      // Allow on error to avoid blocking legitimate users
      return {
        allowed: true,
        remainingAttempts: this.MAX_FLAGS_PER_HOUR,
        resetAt: new Date(Date.now() + this.WINDOW_MS),
      };
    }
  }
}

