/**
 * Basic content moderation utility
 * Checks for common profanity and inappropriate content
 */

// Common profanity words (in production, use a comprehensive library or API)
const PROFANITY_WORDS = [
  // Add common profanity words here
  // For production, consider using a service like:
  // - Google Cloud Natural Language API
  // - AWS Comprehend
  // - Perspective API
  // - profanity-filter library
];

// Suspicious patterns that might indicate spam
const SPAM_PATTERNS = [
  /(http|https|www\.)[^\s]{10,}/gi, // URLs
  /[A-Z]{10,}/g, // Excessive caps
  /[!]{3,}/g, // Multiple exclamation marks
  /(.)\1{4,}/g, // Repeated characters (e.g., "aaaaaa")
];

export interface ModerationResult {
  isClean: boolean;
  reasons: string[];
  sanitizedContent?: string;
}

export class ContentModerator {
  /**
   * Check if content is appropriate
   */
  static moderate(content: string): ModerationResult {
    const reasons: string[] = [];
    const lowerContent = content.toLowerCase().trim();

    // Check for profanity
    const hasProfanity = PROFANITY_WORDS.some(word => 
      lowerContent.includes(word.toLowerCase())
    );

    if (hasProfanity) {
      reasons.push('Content contains inappropriate language');
    }

    // Check for spam patterns
    const spamChecks = SPAM_PATTERNS.map((pattern, index) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 2) {
        return [
          'Excessive URLs detected',
          'Excessive capitalization',
          'Excessive punctuation',
          'Repeated characters detected',
        ][index];
      }
      return null;
    }).filter(Boolean) as string[];

    reasons.push(...spamChecks);

    // Check content length (should be validated separately, but check here too)
    if (content.trim().length < 10) {
      reasons.push('Content is too short');
    }

    // Basic sanitization - remove excessive whitespace
    const sanitizedContent = content
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim();

    return {
      isClean: reasons.length === 0,
      reasons,
      sanitizedContent: sanitizedContent !== content ? sanitizedContent : undefined,
    };
  }

  /**
   * Check if content contains URLs (for flagging potential spam)
   */
  static containsUrls(content: string): boolean {
    const urlPattern = /(http|https|www\.)[^\s]+/gi;
    return urlPattern.test(content);
  }

  /**
   * Basic profanity check (can be enhanced with external service)
   */
  static hasProfanity(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return PROFANITY_WORDS.some(word => lowerContent.includes(word.toLowerCase()));
  }
}

