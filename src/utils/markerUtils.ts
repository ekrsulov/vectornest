/**
 * Normalize marker references that may come in as raw IDs, url(#id) strings, or #id fragments.
 * Returns undefined for empty/invalid values.
 */
export const normalizeMarkerId = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;

  let value = raw.trim();
  // Unwrap nested url(...) wrappers if present
  const urlRegex = /^url\(\s*['"]?(.+?)['"]?\s*\)$/i;
  while (urlRegex.test(value)) {
    const match = value.match(urlRegex);
    if (!match) break;
    value = match[1].trim();
  }

  // Strip leading #
  value = value.replace(/^#/, '');

  return value.length ? value : undefined;
};

export const toMarkerUrl = (id?: string): string | undefined => {
  return id ? `url(#${id})` : undefined;
};
