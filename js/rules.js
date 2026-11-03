/**
 * @file rules.js
 * Pure eligibility engine for Haqdar.
 * Zero DOM or network access.
 */

/**
 * Valid operators supported by the rules engine.
 */
export const OPERATORS = Object.freeze({
  EQUALS: 'equals',
  IN: 'in',
  LTE: 'lte',
  GTE: 'gte',
  IS_TRUE: 'is_true',
});

/**
 * Result statuses for scheme eligibility.
 */
export const STATUS = Object.freeze({
  ELIGIBLE: 'ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  NEEDS_CHECK: 'NEEDS_CHECK',
});

/**
 * Checks if an answer value is uncertain (unanswered, not sure, or prefer not to say).
 *
 * @param {*} value - Answer value from user profile.
 * @returns {boolean} True if value is uncertain.
 */
export function isUncertain(value) {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    return (
      normalised === 'not_sure' ||
      normalised === 'not sure' ||
      normalised === 'prefer_not_to_say' ||
      normalised === 'prefer not to say'
    );
  }
  return false;
}

/**
 * Evaluates a single condition against an answer value.
 *
 * @param {*} userValue - Value from the user's answers.
 * @param {string} operator - One of equals, in, lte, gte, is_true.
 * @param {*} targetValue - Threshold or expected value from the scheme criterion.
 * @returns {boolean} True if condition is met, false if it fails.
 */
export function evaluateCondition(userValue, operator, targetValue) {
  switch (operator) {
    case OPERATORS.EQUALS:
      return String(userValue).trim().toLowerCase() === String(targetValue).trim().toLowerCase();

    case OPERATORS.IN:
      if (!Array.isArray(targetValue)) {
        return false;
      }
      return targetValue
        .map((item) => String(item).trim().toLowerCase())
        .includes(String(userValue).trim().toLowerCase());

    case OPERATORS.LTE: {
      if (
        userValue === null ||
        userValue === undefined ||
        userValue === '' ||
        targetValue === null ||
        targetValue === undefined ||
        targetValue === ''
      ) {
        return false;
      }
      const numUser = Number(userValue);
      const numTarget = Number(targetValue);
      if (Number.isNaN(numUser) || Number.isNaN(numTarget)) {
        return false;
      }
      return numUser <= numTarget;
    }

    case OPERATORS.GTE: {
      if (
        userValue === null ||
        userValue === undefined ||
        userValue === '' ||
        targetValue === null ||
        targetValue === undefined ||
        targetValue === ''
      ) {
        return false;
      }
      const numUser = Number(userValue);
      const numTarget = Number(targetValue);
      if (Number.isNaN(numUser) || Number.isNaN(numTarget)) {
        return false;
      }
      return numUser >= numTarget;
    }

    case OPERATORS.IS_TRUE: {
      if (typeof userValue === 'boolean') {
        return userValue === true;
      }
      const normalised = String(userValue).trim().toLowerCase();
      return normalised === 'yes' || normalised === 'true' || normalised === '1';
    }

    default:
      return false;
  }
}

/**
 * Determines whether a scheme's last_verified date is older than 12 months from today.
 *
 * @param {string} lastVerified - ISO date string (YYYY-MM-DD).
 * @param {Date|string} [today] - Reference date (defaults to current date).
 * @returns {boolean} True if verified date is older than 12 months.
 */
export function isStaleDate(lastVerified, today) {
  if (!lastVerified) {
    return false;
  }
  const verifiedDate = new Date(lastVerified);
  if (Number.isNaN(verifiedDate.getTime())) {
    return false;
  }
  const currentDate = today ? new Date(today) : new Date();
  if (Number.isNaN(currentDate.getTime())) {
    return false;
  }

  const cutoff = new Date(currentDate);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return verifiedDate < cutoff;
}

/**
 * Evaluates a single scheme against a set of user answers.
 *
 * @param {Record<string, *>} answers - User answers mapped by field id.
 * @param {object} scheme - Scheme definition object.
 * @param {Date|string} [today] - Reference date for stale verification check.
 * @returns {object} Evaluated scheme with status, failing condition, and stale metadata.
 */
export function evaluateScheme(answers, scheme, today) {
  if (!scheme || typeof scheme !== 'object') {
    return {
      id: 'invalid_scheme',
      name: 'Invalid Scheme',
      status: STATUS.NEEDS_CHECK,
      failing_condition: 'Scheme data is missing or invalid',
      failingCondition: 'Scheme data is missing or invalid',
      is_stale: false,
      isStale: false,
      stale_note: null,
      staleNote: null,
    };
  }

  if (!Array.isArray(scheme.criteria) || scheme.criteria.length === 0) {
    const stale = isStaleDate(scheme.last_verified, today);
    const staleNote = stale
      ? `Rules last checked ${scheme.last_verified}. Confirm on the official page.`
      : null;
    return {
      ...scheme,
      status: STATUS.NEEDS_CHECK,
      failing_condition: 'Scheme criteria are missing or unverified',
      failingCondition: 'Scheme criteria are missing or unverified',
      is_stale: stale,
      isStale: stale,
      stale_note: staleNote,
      staleNote,
    };
  }

  const criteria = scheme.criteria;
  let firstFailingCondition = null;
  let hasUncertainCondition = false;

  for (const criterion of criteria) {
    const field = criterion.field;
    const op = criterion.op || criterion.operator;
    const targetValue = criterion.value;
    const userValue = answers ? answers[field] : undefined;

    if (isUncertain(userValue) || targetValue === null || targetValue === undefined) {
      hasUncertainCondition = true;
      continue;
    }

    const passes = evaluateCondition(userValue, op, targetValue);
    if (!passes) {
      if (!firstFailingCondition) {
        firstFailingCondition = criterion.text || 'Eligibility criteria not met';
      }
    }
  }

  let status = STATUS.ELIGIBLE;
  if (firstFailingCondition !== null) {
    status = STATUS.NOT_ELIGIBLE;
  } else if (hasUncertainCondition) {
    status = STATUS.NEEDS_CHECK;
  }

  const stale = isStaleDate(scheme.last_verified, today);
  const staleNote = stale
    ? `Rules last checked ${scheme.last_verified}. Confirm on the official page.`
    : null;

  return {
    ...scheme,
    status,
    failing_condition: firstFailingCondition,
    failingCondition: firstFailingCondition,
    is_stale: stale,
    isStale: stale,
    stale_note: staleNote,
    staleNote,
  };
}

/**
 * Pure evaluation engine for all schemes.
 * Does not mutate inputs, has zero DOM/network access, and is strictly deterministic.
 *
 * @param {Record<string, *>} answers - User answers mapped by field id.
 * @param {Array<object>} schemes - List of scheme definition objects.
 * @param {Date|string} [today] - Reference date for stale verification check.
 * @returns {Array<object>} Evaluated schemes with status and metadata.
 */
export function evaluateSchemes(answers = {}, schemes = [], today) {
  if (!Array.isArray(schemes)) {
    return [];
  }
  return schemes.map((scheme) => evaluateScheme(answers, scheme, today));
}

