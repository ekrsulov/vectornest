/**
 * Mask & clip-path utility functions shared across all element renderers.
 *
 * ── VERSIONED RUNTIME IDs ─────────────────────────────────────────────────────────
 * SVG browsers cache mask/clip geometry by the literal `id` attribute of the
 * <mask> or <clipPath> element.  If the id stays the same between renders, the
 * browser returns the stale cached shape even when the internal geometry has
 * changed.  This manifests as the mask/clip appearing "frozen" at its original
 * import position while the element itself moves.
 *
 * The fix is to change the id every time the geometry changes.  We do this by
 * appending a version counter: e.g. "clip-abc" becomes "clip-abc-v1", then
 * "clip-abc-v2", etc.  The element renderer must read the SAME versioned id
 * when setting `clip-path="url(#...)"` or `mask="url(#...)"` attributes.
 *
 * These two helper functions compute the correct versioned id so that both
 * the <mask>/<clipPath> definition and the element referencing it stay in sync.
 *
 * Every element renderer (path, group, image, text, symbols, use, embeddedSvg)
 * MUST call the appropriate helper here instead of using the raw stored id.
 * If a renderer forgets, it will reference the old un-versioned id and the
 * element will appear un-clipped after the first drag.
 *
 * ── COORDINATE SYSTEM BACKGROUND (important for future debugging) ───────────
 * SVG spec: clip-path / mask with `clipPathUnits/maskContentUnits="userSpaceOnUse"`
 * is evaluated in the current user coordinate system at the point where the
 * clip-path/mask property is applied — concretely, the element's OWN local
 * coordinate system (after its own `transform`).
 *
 * This has a critical implication:
 *   • If an element moves by changing its `transform` attribute (e.g. <image>
 *     elements that store position in `data.transformMatrix`), the clip/mask
 *     coordinate system shifts WITH the transform.  The clip/mask automatically
 *     follows the element — no manual origin update needed.
 *
 *   • If an element moves by changing its path/geometry data (e.g. path
 *     elements that store position in subPath coordinates), the clip/mask
 *     coordinate system does NOT shift.  The `originX/originY` fields in
 *     ClipDefinition / MaskDefinition must be updated by the same delta.
 *
 * Failing to respect this rule causes the "double-movement" bug where the
 * clip/mask appears to drift 2× faster than the element.
 * See: clipping/index.tsx `translateDefinitions` and masks/index.tsx for details.
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

/**
 * Get the versioned clip-path runtime ID for SVG clip-path references.
 * Appends a version suffix to the clip ID when a version exists,
 * enabling cache invalidation when clip position changes (mirrors getMaskRuntimeId).
 *
 * @param clipPathId - The instance clip-path ID stored on the element
 * @param clipPathTemplateId - The template clip ID (used as the key in clipVersions)
 * @param clipVersions - Map of clip template IDs to their current version numbers
 * @returns The versioned runtime ID, or the original clipPathId, or undefined
 */
export function getClipRuntimeId(
  clipPathId: string | undefined | null,
  clipPathTemplateId: string | undefined | null,
  clipVersions: Map<string, number> | undefined
): string | undefined {
  if (!clipPathId) return undefined;
  const templateId = clipPathTemplateId ?? clipPathId;
  const version = clipVersions?.get(templateId);
  return version ? `${clipPathId}-v${version}` : clipPathId;
}
