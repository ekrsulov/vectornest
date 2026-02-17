/**
 * DOM Helper Utilities
 * 
 * Shared utilities for DOM manipulation and querying
 */

/**
 * Check if the current device supports touch events.
 * Uses feature detection for 'ontouchstart' in window.
 * Result is cached at module level since touch capability does not change during a session.
 * 
 * @returns true if the device supports touch events
 */
let _isTouchDeviceCached: boolean | null = null;
export function isTouchDevice(): boolean {
  if (_isTouchDeviceCached === null) {
    _isTouchDeviceCached = typeof window !== 'undefined' && 'ontouchstart' in window;
  }
  return _isTouchDeviceCached;
}

/**
 * Check if a text input field is currently focused
 * Used to prevent keyboard shortcuts from triggering while user is typing
 * 
 * @returns true if a text input/textarea is focused
 */
export function isTextFieldFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    isContentEditable
  );
}

/**
 * Returns the center point (in SVG pixel space) of the main canvas element.
 * Falls back to querying the DOM if no element is provided.
 */
export function getCanvasCenter(svg?: SVGSVGElement | null): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null;

  const target = svg ?? (document.querySelector('svg[data-canvas="true"]') as SVGSVGElement | null);
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  return {
    x: rect.width / 2,
    y: rect.height / 2,
  };
}

/**
 * Returns the client rect (in screen pixels) for the main canvas element.
 * Falls back to querying the DOM if no element is provided.
 */
export function getCanvasClientRect(svg?: SVGSVGElement | null): { left: number; top: number; width: number; height: number } | null {
  if (typeof document === 'undefined') return null;

  const target = svg ?? (document.querySelector('svg[data-canvas="true"]') as SVGSVGElement | null);
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}
