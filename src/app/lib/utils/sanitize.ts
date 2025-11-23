/**
 * Client-side content sanitization utility
 * Uses DOMPurify to sanitize user-generated content
 */

// Client-side only - import DOMPurify dynamically
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: return as-is (should already be sanitized)
    return html;
  }

  // Dynamic import for client-side
  const DOMPurify = require('dompurify');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // Strip all HTML tags for text content
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize text content (strip all HTML)
 */
export function sanitizeText(text: string): string {
  if (typeof window === 'undefined') {
    return text;
  }

  const DOMPurify = require('dompurify');
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

