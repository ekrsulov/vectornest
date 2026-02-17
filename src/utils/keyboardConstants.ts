/**
 * Shared keyboard key constants
 * 
 * These constants are used for consistent modifier key detection
 * across the application. Both physical keys and virtual key codes
 * are included for cross-browser compatibility.
 */

/** Set of all Shift key identifiers */
export const SHIFT_KEYS = new Set(['Shift', 'ShiftLeft', 'ShiftRight']);

/** Set of all Control key identifiers */
export const CTRL_KEYS = new Set(['Control', 'ControlLeft', 'ControlRight']);

/** Set of all Meta/Command key identifiers */
export const META_KEYS = new Set(['Meta', 'MetaLeft', 'MetaRight']);

/** Set of all Alt/Option key identifiers */
export const ALT_KEYS = new Set(['Alt', 'AltLeft', 'AltRight']);

/**
 * Check if an event key or code matches a modifier key set
 */
export function isModifierKey(event: KeyboardEvent, keySet: Set<string>): boolean {
  return keySet.has(event.key) || keySet.has(event.code);
}
