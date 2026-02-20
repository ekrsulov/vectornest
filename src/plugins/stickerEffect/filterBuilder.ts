import type { StickerEffectState } from './slice';

/**
 * Build SVG filter definitions for various sticker effects.
 *
 * - **Outline**: feMorphology dilate → flood → composite to create a solid outline behind the element
 * - **Shadow**: feDropShadow-like effect with offset, blur, and color
 * - **Neon**: Multiple layered gaussian blurs with color overlay for a neon glow
 * - **Emboss**: feMorphology + feConvolveMatrix for an embossed edge look
 */
export const buildStickerFilterSvg = (
  filterId: string,
  state: StickerEffectState
): string => {
  const { style } = state;

  switch (style) {
    case 'outline':
      return buildOutlineFilter(filterId, state);
    case 'shadow':
      return buildShadowFilter(filterId, state);
    case 'neon':
      return buildNeonFilter(filterId, state);
    case 'emboss':
      return buildEmbossFilter(filterId, state);
    default:
      return buildOutlineFilter(filterId, state);
  }
};

const buildOutlineFilter = (filterId: string, state: StickerEffectState): string => {
  const { outlineWidth, outlineColor } = state;
  const radius = outlineWidth.toFixed(1);

  return `<filter id="${filterId}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${radius}" result="expanded"/>
  <feFlood flood-color="${outlineColor}" flood-opacity="1" result="outlineColor"/>
  <feComposite in="outlineColor" in2="expanded" operator="in" result="outline"/>
  <feMerge>
    <feMergeNode in="outline"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`;
};

const buildShadowFilter = (filterId: string, state: StickerEffectState): string => {
  const { shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor } = state;

  return `<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${shadowBlur}" result="blur"/>
  <feOffset in="blur" dx="${shadowOffsetX}" dy="${shadowOffsetY}" result="offsetBlur"/>
  <feFlood flood-color="${shadowColor}" flood-opacity="0.6" result="shadowColor"/>
  <feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow"/>
  <feMerge>
    <feMergeNode in="shadow"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`;
};

const buildNeonFilter = (filterId: string, state: StickerEffectState): string => {
  const { neonIntensity, neonColor } = state;
  const blur1 = neonIntensity.toFixed(1);
  const blur2 = (neonIntensity * 2).toFixed(1);
  const blur3 = (neonIntensity * 4).toFixed(1);

  return `<filter id="${filterId}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
  <feFlood flood-color="${neonColor}" flood-opacity="1" result="neonColor"/>
  <feComposite in="neonColor" in2="SourceAlpha" operator="in" result="coloredShape"/>
  <feGaussianBlur in="coloredShape" stdDeviation="${blur1}" result="glow1"/>
  <feGaussianBlur in="coloredShape" stdDeviation="${blur2}" result="glow2"/>
  <feGaussianBlur in="coloredShape" stdDeviation="${blur3}" result="glow3"/>
  <feMerge>
    <feMergeNode in="glow3"/>
    <feMergeNode in="glow2"/>
    <feMergeNode in="glow1"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`;
};

const buildEmbossFilter = (filterId: string, state: StickerEffectState): string => {
  const { outlineWidth } = state;
  const radius = Math.max(0.5, outlineWidth * 0.5).toFixed(1);

  return `<filter id="${filterId}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${radius}" result="dilated"/>
  <feFlood flood-color="#ffffff" flood-opacity="0.3" result="highlight"/>
  <feComposite in="highlight" in2="dilated" operator="in" result="highlightEdge"/>
  <feOffset in="highlightEdge" dx="-1" dy="-1" result="topLight"/>
  <feFlood flood-color="#000000" flood-opacity="0.3" result="shadowFlood"/>
  <feComposite in="shadowFlood" in2="dilated" operator="in" result="shadowEdge"/>
  <feOffset in="shadowEdge" dx="1" dy="1" result="bottomShadow"/>
  <feMerge>
    <feMergeNode in="bottomShadow"/>
    <feMergeNode in="topLight"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`;
};
