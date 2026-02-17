import { logger } from './logger';

/**
 * Debug logging utility with development guard
 * Uses centralized logger for consistency across the codebase.
 */

/**
 * Log a message only in development mode
 */
export function debugLog(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    logger.debug(message, ...args);
  }
}

/**
 * Group logs only in development mode
 */
export function debugGroup(label: string, callback: () => void): void {
  if (import.meta.env.DEV) {
    console.group(label);
    callback();
    console.groupEnd();
  }
}

/**
 * Deep debug logging - for verbose traces like data URLs, snapshots
 * Enabled via VITE_DEEP_DEBUG env variable or toggled at runtime
 */
const DEEP_DEBUG = import.meta.env.VITE_DEEP_DEBUG === 'true';

export function deepDebugLog(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV && DEEP_DEBUG) {
    logger.debug(message, ...args);
  }
}
