/**
 * @file store.js
 * Browser sessionStorage wrapper for Haqdar.
 * Privacy-first: no cookies, no localStorage, no server tracking.
 * Session storage is isolated per browser tab.
 */

const STORAGE_KEYS = Object.freeze({
  ANSWERS: 'haqdar_answers',
  CHECKLIST: 'haqdar_checklist',
});

// Fallback in-memory store if sessionStorage is restricted or disabled
const memoryStore = new Map();

/**
 * Safely reads from sessionStorage.
 *
 * @param {string} key - Storage key.
 * @returns {string|null} String value or null.
 */
function safeGet(key) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch {
    // Fall back to memoryStore
  }
  return memoryStore.get(key) || null;
}

/**
 * Safely writes to sessionStorage.
 *
 * @param {string} key - Storage key.
 * @param {string} value - String value.
 */
function safeSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
      return;
    }
  } catch {
    // Fall back to memoryStore
  }
  memoryStore.set(key, value);
}

/**
 * Safely removes a key from sessionStorage.
 *
 * @param {string} key - Storage key.
 */
function safeRemove(key) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Fall back to memoryStore
  }
  memoryStore.delete(key);
}

/**
 * Retrieves all stored answers.
 *
 * @returns {Record<string, *>} Map of question IDs to answer values.
 */
export function getAnswers() {
  const raw = safeGet(STORAGE_KEYS.ANSWERS);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves a single answer to the stored answers.
 *
 * @param {string} field - Question ID.
 * @param {*} value - Selected value.
 */
export function saveAnswer(field, value) {
  const current = getAnswers();
  current[field] = value;
  safeSet(STORAGE_KEYS.ANSWERS, JSON.stringify(current));
}

/**
 * Removes a single answer from the stored answers.
 *
 * @param {string} field - Question ID.
 */
export function removeAnswer(field) {
  const current = getAnswers();
  delete current[field];
  safeSet(STORAGE_KEYS.ANSWERS, JSON.stringify(current));
}

/**
 * Overwrites all answers.
 *
 * @param {Record<string, *>} answers - Complete answers object.
 */
export function saveAnswers(answers) {
  safeSet(STORAGE_KEYS.ANSWERS, JSON.stringify(answers || {}));
}

/**
 * Retrieves the document checklist state (checked document names).
 *
 * @returns {Record<string, boolean>} Map of document names to checked state.
 */
export function getChecklistState() {
  const raw = safeGet(STORAGE_KEYS.CHECKLIST);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Sets the checked state for a specific document.
 *
 * @param {string} documentName - Name of the document.
 * @param {boolean} isChecked - Checked status.
 */
export function saveChecklistDocument(documentName, isChecked) {
  const current = getChecklistState();
  current[documentName] = Boolean(isChecked);
  safeSet(STORAGE_KEYS.CHECKLIST, JSON.stringify(current));
}

/**
 * Clears all answers and checklist state for the session.
 */
export function clear() {
  safeRemove(STORAGE_KEYS.ANSWERS);
  safeRemove(STORAGE_KEYS.CHECKLIST);
  memoryStore.clear();
}
