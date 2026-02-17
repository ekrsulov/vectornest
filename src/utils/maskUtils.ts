/**
 * Mask utility functions shared across renderers.
 */

/**
 * Get the versioned mask runtime ID for SVG mask references.
 * Appends a version suffix to the mask ID when a version exists,
 * enabling cache invalidation when mask position changes.
 *
 * @param maskId - The base mask ID
 * @param maskVersions - Map of mask IDs to their current version numbers
 * @returns The versioned runtime ID, or the original maskId, or undefined
 */
export function getMaskRuntimeId(
  maskId: string | undefined | null,
  maskVersions: Map<string, number> | undefined
): string | undefined {
  if (!maskId) return undefined;
  const version = maskVersions?.get(maskId);
  return version ? `${maskId}-v${version}` : maskId;
}
