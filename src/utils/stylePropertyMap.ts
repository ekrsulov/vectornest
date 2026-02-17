/**
 * Mapping from canonical style property names to the alternative key names
 * that non-path elements may use in their data objects.
 *
 * For example, `fillColor` may be stored as `fill` or `fillColor` depending
 * on the element type.
 */
export const GENERIC_STYLE_PROPERTY_MAP: Record<string, string[]> = {
  fillColor: ['fill', 'fillColor'],
  fillOpacity: ['fillOpacity'],
  strokeColor: ['stroke', 'strokeColor'],
  strokeWidth: ['strokeWidth'],
  strokeOpacity: ['strokeOpacity'],
  strokeLinecap: ['strokeLinecap'],
  strokeLinejoin: ['strokeLinejoin'],
  strokeDasharray: ['strokeDasharray'],
  fillRule: ['fillRule'],
  opacity: ['opacity'],
};

/**
 * Apply a set of style properties to a generic (non-path) element's data,
 * respecting both direct keys and mapped fallback keys.
 *
 * Returns a new data object — the original is not mutated.
 */
export function applyStylesToGenericData(
  data: Record<string, unknown>,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const updated: Record<string, unknown> = { ...data };

  for (const [key, value] of Object.entries(properties)) {
    if (key in updated) {
      updated[key] = value;
      continue;
    }
    const mappedKeys = GENERIC_STYLE_PROPERTY_MAP[key];
    if (!mappedKeys) continue;
    for (const mk of mappedKeys) {
      updated[mk] = value;
    }
  }

  return updated;
}
