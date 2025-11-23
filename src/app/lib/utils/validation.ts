/**
 * Validation utilities for review content
 */

export const REVIEW_CONSTRAINTS = {
  CONTENT_MAX_LENGTH: 5000,
  CONTENT_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 200,
  TITLE_MIN_LENGTH: 0, // Optional
  TAGS_MAX_COUNT: 10,
  TAG_MAX_LENGTH: 50,
} as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ReviewValidator {
  /**
   * Validate review content
   */
  static validateContent(content: string | null | undefined): ValidationResult {
    const errors: string[] = [];

    if (!content || typeof content !== 'string') {
      errors.push('Review content is required');
      return { isValid: false, errors };
    }

    const trimmed = content.trim();

    if (trimmed.length === 0) {
      errors.push('Review content cannot be empty');
    }

    if (trimmed.length < REVIEW_CONSTRAINTS.CONTENT_MIN_LENGTH) {
      errors.push(`Review content must be at least ${REVIEW_CONSTRAINTS.CONTENT_MIN_LENGTH} characters`);
    }

    if (trimmed.length > REVIEW_CONSTRAINTS.CONTENT_MAX_LENGTH) {
      errors.push(`Review content cannot exceed ${REVIEW_CONSTRAINTS.CONTENT_MAX_LENGTH} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate review title
   */
  static validateTitle(title: string | null | undefined): ValidationResult {
    const errors: string[] = [];

    // Title is optional, so empty/null is valid
    if (!title || title.trim().length === 0) {
      return { isValid: true, errors: [] };
    }

    const trimmed = title.trim();

    if (trimmed.length > REVIEW_CONSTRAINTS.TITLE_MAX_LENGTH) {
      errors.push(`Review title cannot exceed ${REVIEW_CONSTRAINTS.TITLE_MAX_LENGTH} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate tags
   */
  static validateTags(tags: string[]): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(tags)) {
      errors.push('Tags must be an array');
      return { isValid: false, errors };
    }

    if (tags.length > REVIEW_CONSTRAINTS.TAGS_MAX_COUNT) {
      errors.push(`Cannot have more than ${REVIEW_CONSTRAINTS.TAGS_MAX_COUNT} tags`);
    }

    tags.forEach((tag, index) => {
      if (typeof tag !== 'string') {
        errors.push(`Tag at index ${index} must be a string`);
      } else if (tag.trim().length === 0) {
        errors.push(`Tag at index ${index} cannot be empty`);
      } else if (tag.trim().length > REVIEW_CONSTRAINTS.TAG_MAX_LENGTH) {
        errors.push(`Tag at index ${index} cannot exceed ${REVIEW_CONSTRAINTS.TAG_MAX_LENGTH} characters`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate rating
   */
  static validateRating(rating: number | null | undefined): ValidationResult {
    const errors: string[] = [];

    if (rating === null || rating === undefined) {
      errors.push('Rating is required');
      return { isValid: false, errors };
    }

    const numRating = typeof rating === 'string' ? parseInt(rating, 10) : rating;

    if (Number.isNaN(numRating)) {
      errors.push('Rating must be a number');
    } else if (numRating < 1 || numRating > 5) {
      errors.push('Rating must be between 1 and 5');
    } else if (!Number.isInteger(numRating)) {
      errors.push('Rating must be a whole number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate entire review data
   */
  static validateReviewData(data: {
    content: string | null | undefined;
    title?: string | null | undefined;
    rating: number | null | undefined;
    tags?: string[];
  }): ValidationResult {
    const allErrors: string[] = [];

    const contentResult = this.validateContent(data.content);
    allErrors.push(...contentResult.errors);

    if (data.title !== undefined) {
      const titleResult = this.validateTitle(data.title);
      allErrors.push(...titleResult.errors);
    }

    const ratingResult = this.validateRating(data.rating);
    allErrors.push(...ratingResult.errors);

    if (data.tags && Array.isArray(data.tags)) {
      const tagsResult = this.validateTags(data.tags);
      allErrors.push(...tagsResult.errors);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }
}

