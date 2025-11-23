import { getServerSupabase } from '../supabase/server';

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetAt: Date;
  error?: string;
}

export class ReviewRateLimiter {
  // Max 10 reviews per hour per user
  private static readonly MAX_REVIEWS_PER_HOUR = 10;
  private static readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Check if user can submit a review based on rate limits
   */
  static async checkRateLimit(userId: string): Promise<RateLimitResult> {
    try {
      const supabase = await getServerSupabase();
      
      // Get reviews from the last hour
      const oneHourAgo = new Date(Date.now() - this.WINDOW_MS).toISOString();
      
      const { data: recentReviews, error } = await supabase
        .from('reviews')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking rate limit:', error);
        // On error, allow the request to avoid blocking legitimate users
        // but log the error for monitoring
        return {
          allowed: true,
          remainingAttempts: this.MAX_REVIEWS_PER_HOUR,
          resetAt: new Date(Date.now() + this.WINDOW_MS),
        };
      }

      const reviewCount = recentReviews?.length || 0;
      const remainingAttempts = Math.max(0, this.MAX_REVIEWS_PER_HOUR - reviewCount);
      const allowed = reviewCount < this.MAX_REVIEWS_PER_HOUR;

      // Calculate reset time (1 hour from oldest review in window, or now if no reviews)
      let resetAt: Date;
      if (recentReviews && recentReviews.length > 0 && recentReviews[recentReviews.length - 1]) {
        const oldestReviewTime = new Date(recentReviews[recentReviews.length - 1].created_at);
        resetAt = new Date(oldestReviewTime.getTime() + this.WINDOW_MS);
      } else {
        resetAt = new Date(Date.now() + this.WINDOW_MS);
      }

      if (!allowed) {
        const minutesUntilReset = Math.ceil((resetAt.getTime() - Date.now()) / (60 * 1000));
        return {
          allowed: false,
          remainingAttempts: 0,
          resetAt,
          error: `Rate limit exceeded. You can submit ${this.MAX_REVIEWS_PER_HOUR} reviews per hour. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`,
        };
      }

      return {
        allowed: true,
        remainingAttempts,
        resetAt,
      };
    } catch (error) {
      console.error('Unexpected error in rate limit check:', error);
      // Fail open - allow request on unexpected errors
      return {
        allowed: true,
        remainingAttempts: this.MAX_REVIEWS_PER_HOUR,
        resetAt: new Date(Date.now() + this.WINDOW_MS),
      };
    }
  }
}

