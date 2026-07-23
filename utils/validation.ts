// utils/validation.ts
// Generic, domain-agnostic input validation. Domain-specific validation
// (workouts, products, sessions, etc.) lives in consumer repos — usually
// co-located with the repository that needs it. Keeping this file slim is
// load-bearing: every helper here ends up in every consumer.

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  normalizedDate?: string;
}

export interface ValidationConfig {
  allowFutureDates?: boolean;
  maxDaysInPast?: number;
}

const DEFAULT_CONFIG: Required<ValidationConfig> = {
  allowFutureDates: false,
  maxDaysInPast: 365,
};

export function validateDateInput(
  dateString: string,
  config: Partial<ValidationConfig> = {},
): DateValidationResult {
  const validationConfig = { ...DEFAULT_CONFIG, ...config };
  const { allowFutureDates, maxDaysInPast } = validationConfig;

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (!allowFutureDates) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate > now) {
      return { isValid: false, error: 'Date cannot be in the future' };
    }
  }

  const now = new Date();
  const daysInPast = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysInPast > maxDaysInPast) {
    return {
      isValid: false,
      error: `Date is too far in the past (more than ${maxDaysInPast} days)`,
    };
  }

  const normalizedDate = date.toISOString().split('T')[0];

  return { isValid: true, normalizedDate };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateAndSanitize(input: string, maxLength = 1000): ValidationResult {
  const errors: string[] = [];

  if (typeof input !== 'string') {
    return { isValid: false, errors: ['Input must be a string'], warnings: [] };
  }

  if (input.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
  }

  if (input.includes('\0')) {
    errors.push('Input contains null bytes');
  }

  return { isValid: errors.length === 0, errors, warnings: [] };
}

export function formatValidationErrors(result: ValidationResult): string {
  return result.isValid ? '' : result.errors.join(', ');
}

export function formatValidationWarnings(result: ValidationResult): string {
  return result.warnings.length === 0 ? '' : result.warnings.join(', ');
}

/**
 * Normalize a date string to YYYY-MM-DD format for consistent comparisons.
 * Builds the string from local components (NOT toISOString) so users east of
 * UTC don't see their date shifted backwards by a day.
 */
export function normalizeDateToISO(date: string): string | null {
  if (!date || typeof date !== 'string') {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  if (date.includes('T')) {
    const isoDate = date.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate;
    }
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  const y = parsedDate.getFullYear();
  const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const d = String(parsedDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(date1: string, date2: string): boolean {
  const normalized1 = normalizeDateToISO(date1);
  const normalized2 = normalizeDateToISO(date2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

/**
 * Compose multiple validators — short-circuits on the first failure.
 * Useful for repository input validation where several checks must pass.
 */
export function composeValidators(
  ...validators: Array<() => ValidationResult>
): ValidationResult {
  for (const validator of validators) {
    const result = validator();
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true, errors: [], warnings: [] };
}
