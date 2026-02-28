/**
 * Input sanitization utilities for user-provided data.
 *
 * SQL injection is handled by Supabase parameterized queries.
 * XSS is handled by React's default escaping.
 * These functions provide defense-in-depth: trimming, HTML stripping,
 * and length capping to keep stored data clean.
 */

/** Strip HTML/script tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/** Trim whitespace and strip HTML tags */
export function sanitizeString(input: string): string {
  return stripHtml(input).trim();
}

/** Sanitize and cap length */
export function sanitizeStringMax(input: string, maxLength: number): string {
  return sanitizeString(input).slice(0, maxLength);
}

/** Sanitize a domain: lowercase, trim, strip protocol/path */
export function sanitizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  // Remove protocol
  domain = domain.replace(/^https?:\/\//, "");
  // Remove www.
  domain = domain.replace(/^www\./, "");
  // Remove trailing slash and any path
  domain = domain.split("/")[0];
  // Strip any remaining HTML
  domain = stripHtml(domain);
  return domain;
}

/** Sanitize a slug: lowercase, trim, replace invalid chars */
export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Sanitize each string in an array */
export function sanitizeStringArray(input: string[]): string[] {
  return input.map((s) => sanitizeString(s)).filter((s) => s.length > 0);
}
