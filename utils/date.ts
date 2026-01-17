/**
 * Date parsing and formatting utilities for PesaLog
 * Handles various Kenyan financial SMS date formats
 */

/**
 * Parse date from SMS formats
 * Supports:
 * - "17/1/26" (D/M/YY)
 * - "15/01/2026" (DD/MM/YYYY)
 * - "01/15/2026" (MM/DD/YYYY - some bank formats)
 */
export function parseSmsDate(dateStr: string, timeStr?: string): Date {
  // Clean up the strings
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr?.trim() || '';

  // Parse the date parts
  const parts = cleanDate.split('/').map((p) => parseInt(p, 10));

  let day: number;
  let month: number;
  let year: number;

  if (parts.length === 3) {
    // Determine format based on values
    if (parts[2] >= 100) {
      // Full year: DD/MM/YYYY or MM/DD/YYYY
      if (parts[0] > 12) {
        // Must be DD/MM/YYYY
        [day, month, year] = parts;
      } else if (parts[1] > 12) {
        // Must be MM/DD/YYYY
        [month, day, year] = parts;
      } else {
        // Ambiguous - assume DD/MM/YYYY (Kenya standard)
        [day, month, year] = parts;
      }
    } else {
      // Short year: D/M/YY
      [day, month, year] = parts;
      year = year < 50 ? 2000 + year : 1900 + year;
    }
  } else {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  // Parse time if provided
  let hours = 0;
  let minutes = 0;

  if (cleanTime) {
    const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const meridiem = timeMatch[3]?.toUpperCase();

      if (meridiem === 'PM' && hours !== 12) {
        hours += 12;
      } else if (meridiem === 'AM' && hours === 12) {
        hours = 0;
      }
    }
  }

  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Parse date from Till/Buy Goods format (DD-MM-YYYY HH:MM)
 * Example: "03-01-2026 at 16:30"
 */
export function parseTillDate(dateStr: string, timeStr?: string): Date {
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr?.trim() || '';

  // Parse DD-MM-YYYY format
  const parts = cleanDate.split('-').map((p) => parseInt(p, 10));

  if (parts.length !== 3) {
    throw new Error(`Invalid Till date format: ${dateStr}`);
  }

  const [day, month, year] = parts;

  // Parse time (HH:MM format, 24-hour)
  let hours = 0;
  let minutes = 0;

  if (cleanTime) {
    const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    }
  }

  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Parse due date from Fuliza format (DD/MM/YY)
 */
export function parseFulizaDueDate(dueDateStr: string): Date {
  const parts = dueDateStr.split('/').map((p) => parseInt(p, 10));
  if (parts.length !== 3) {
    throw new Error(`Invalid Fuliza due date format: ${dueDateStr}`);
  }

  let [day, month, year] = parts;
  year = year < 50 ? 2000 + year : 1900 + year;

  return new Date(year, month - 1, day, 23, 59, 59);
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string {
  const now = new Date();

  if (format === 'relative') {
    return formatRelativeDate(date, now);
  }

  const options: Intl.DateTimeFormatOptions = {
    short: { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  }[format];

  return date.toLocaleDateString('en-KE', options);
}

/**
 * Format relative date (Today, Yesterday, etc.)
 */
function formatRelativeDate(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return `Today at ${formatTime(date)}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${formatTime(date)}`;
  } else if (diffDays < 7) {
    const dayName = date.toLocaleDateString('en-KE', { weekday: 'long' });
    return `${dayName} at ${formatTime(date)}`;
  } else {
    return formatDate(date, 'medium');
  }
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get start and end of period
 */
export function getPeriodBounds(
  period: 'day' | 'week' | 'month' | 'year',
  baseDate: Date = new Date()
): { start: Date; end: Date } {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = start.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dueDate: Date): boolean {
  return dueDate < new Date();
}

/**
 * Get days until due date
 */
export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
