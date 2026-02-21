import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/**
 * Format a timestamp to a human-readable "time ago" string
 * @param timestamp - ISO string or Date object
 * @returns Formatted string like "2 minutes", "an hour", etc.
 */
export function formatTimeAgo(timestamp: string | Date): string {
  try {
    return dayjs(timestamp).fromNow(true); // true = no "ago" suffix
  } catch {
    return "Recently";
  }
}
