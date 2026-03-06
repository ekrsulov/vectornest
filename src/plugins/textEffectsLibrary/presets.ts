/**
 * Text Effect preset definitions.
 *
 * All 40 effects from public/textfx.svg plus original filter-only presets.
 * Each preset provides an SVG filter definition for text effects,
 * along with animated preview SVGs faithful to the showcase.
 */

import type { TextEffectPreset, TextEffectCategory } from './types';

export const CATEGORY_LABELS: Record<TextEffectCategory, string> = {
  energy: 'Energy',
  material: 'Material',
  digital: 'Digital',
  print: 'Print',
  shadow: 'Shadow',
  glow: 'Glow',
  outline: 'Outline',
  '3d': '3D',
  distortion: 'Distortion',
  artistic: 'Artistic',
  animated: 'Animated',
};

export const CATEGORY_ORDER: TextEffectCategory[] = [
  'energy',
  'material',
  'digital',
  'print',
  'shadow',
  'glow',
  'outline',
  '3d',
  'distortion',
  'artistic',
  'animated',
];

// ════════════════════════════════════════════════════════════════
// ANIMATED EFFECTS FROM textfx.svg (01–20)
// ════════════════════════════════════════════════════════════════

// ── 01 · ENERGY ─────────────────────────────────────────────────

const energy: TextEffectPreset = {
  id: 'tfx-energy',
  label: 'Energy',
  category: 'energy',
  description: 'Animated colour-cycling glow with distortion and shine sweep.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="2" seed="3" result="n"><animate attributeName="baseFrequency" values="0.01 0.05;0.02 0.07;0.01 0.05" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '160%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvEnergyFill" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#60a5fa"><animate attributeName="stop-color" dur="6s" repeatCount="indefinite" values="#60a5fa;#a78bfa;#22d3ee;#60a5fa"/></stop><stop offset="50%" stop-color="#fff"><animate attributeName="offset" dur="4s" repeatCount="indefinite" values="0.25;0.7;0.25"/></stop><stop offset="100%" stop-color="#22d3ee"><animate attributeName="stop-color" dur="6s" repeatCount="indefinite" values="#22d3ee;#60a5fa;#a78bfa;#22d3ee"/></stop><animateTransform attributeName="gradientTransform" type="translate" dur="5s" repeatCount="indefinite" values="-0.3 0;0.3 0;-0.3 0"/></linearGradient>
      <filter id="pvEnergyD" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="2" seed="3" result="n"><animate attributeName="baseFrequency" values="0.01 0.05;0.02 0.07;0.01 0.05" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="pvEnergyG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="15" font-weight="700" fill="url(#pvEnergyFill)" text-anchor="middle" opacity=".24" filter="url(#pvEnergyG)" dominant-baseline="middle">ENERGY</text>
    <text x="34" y="40" font-size="15" font-weight="700" fill="url(#pvEnergyFill)" text-anchor="middle" filter="url(#pvEnergyD)" dominant-baseline="middle">ENERGY</text>
  </svg>`,
};

// ── 02 · NEON ───────────────────────────────────────────────────

const neon: TextEffectPreset = {
  id: 'tfx-neon',
  label: 'Neon',
  category: 'energy',
  description: 'Animated neon sign with flicker and glow.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvNF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#67e8f9"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#a78bfa"/><animateTransform attributeName="gradientTransform" type="translate" dur="4.6s" repeatCount="indefinite" values="-0.4 0;0.4 0;-0.4 0"/></linearGradient>
      <filter id="pvNG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="16" font-weight="700" fill="url(#pvNF)" text-anchor="middle" opacity=".26" filter="url(#pvNG)" dominant-baseline="middle">NEON</text>
    <text x="34" y="40" font-size="16" font-weight="700" fill="url(#pvNF)" text-anchor="middle" filter="url(#pvNG)" dominant-baseline="middle">NEON<animate attributeName="opacity" dur="2.1s" repeatCount="indefinite" values="1;0.88;1;0.78;1"/></text>
  </svg>`,
};

// ── 03 · GLITCH ─────────────────────────────────────────────────

const glitch: TextEffectPreset = {
  id: 'tfx-glitch',
  label: 'Glitch',
  category: 'digital',
  description: 'Animated RGB split glitch with jittering clip regions.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves="1" seed="0" result="noise"><animate attributeName="seed" dur="0.5s" repeatCount="indefinite" values="0;100;50;75;0" calcMode="discrete"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="B"/>`,
  filterAttributes: { x: '-20%', y: '-20%', width: '140%', height: '140%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <clipPath id="pvGT"><rect x="0" y="4" width="68" height="10"><animate attributeName="y" dur="0.9s" repeatCount="indefinite" values="4;14;8;18;4"/></rect></clipPath>
      <clipPath id="pvGM"><rect x="0" y="28" width="68" height="10"><animate attributeName="y" dur="0.7s" repeatCount="indefinite" values="28;36;32;40;28"/></rect></clipPath>
      <clipPath id="pvGB"><rect x="0" y="50" width="68" height="10"><animate attributeName="y" dur="1.1s" repeatCount="indefinite" values="48;56;52;58;48"/></rect></clipPath>
      <filter id="pvGR" x="-20%" y="-20%" width="140%" height="140%"><feOffset dx="-4" dy="0"/></filter>
      <filter id="pvGC" x="-20%" y="-20%" width="140%" height="140%"><feOffset dx="4" dy="0"/></filter>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="#f8fafc" text-anchor="middle" dominant-baseline="middle">GLITCH</text>
    <g clip-path="url(#pvGT)"><text x="34" y="40" font-size="14" font-weight="700" fill="#ff3b5c" text-anchor="middle" dominant-baseline="middle" filter="url(#pvGR)">GLITCH<animateTransform attributeName="transform" type="translate" dur="0.45s" repeatCount="indefinite" values="0 0;-5 0;2 0;-3 0;0 0"/></text></g>
    <g clip-path="url(#pvGM)"><text x="34" y="40" font-size="14" font-weight="700" fill="#22d3ee" text-anchor="middle" dominant-baseline="middle" filter="url(#pvGC)">GLITCH<animateTransform attributeName="transform" type="translate" dur="0.35s" repeatCount="indefinite" values="0 0;5 0;-2 0;3 0;0 0"/></text></g>
    <g clip-path="url(#pvGB)"><text x="34" y="40" font-size="14" font-weight="700" fill="#a78bfa" text-anchor="middle" opacity=".9" dominant-baseline="middle">GLITCH<animateTransform attributeName="transform" type="translate" dur="0.6s" repeatCount="indefinite" values="0 0;-3 0;4 0;-2 0;0 0"/></text></g>
  </svg>`,
};

// ── 04 · FIRE ───────────────────────────────────────────────────

const fire: TextEffectPreset = {
  id: 'tfx-fire',
  label: 'Fire',
  category: 'energy',
  description: 'Animated flame distortion with heat-shimmer.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.018 0.08" numOctaves="2" seed="8" result="n"><animate attributeName="baseFrequency" values="0.018 0.08;0.03 0.14;0.018 0.08" dur="2.2s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>`,
  filterAttributes: { x: '-30%', y: '-60%', width: '160%', height: '220%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvFF" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stop-color="#ff3b00"/><stop offset="38%" stop-color="#ff8a00"/><stop offset="72%" stop-color="#ffe066"/><stop offset="100%" stop-color="#fff7d6"/><animateTransform attributeName="gradientTransform" type="scale" dur="2.3s" repeatCount="indefinite" values="1 1;1 1.12;1 1"/></linearGradient>
      <filter id="pvFW" x="-30%" y="-60%" width="160%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.08" numOctaves="2" seed="8" result="n"><animate attributeName="baseFrequency" values="0.018 0.08;0.03 0.14;0.018 0.08" dur="2.2s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="pvFG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="16" font-weight="700" fill="url(#pvFF)" text-anchor="middle" opacity=".24" filter="url(#pvFG)" dominant-baseline="middle">FIRE</text>
    <text x="34" y="40" font-size="16" font-weight="700" fill="url(#pvFF)" text-anchor="middle" filter="url(#pvFW)" dominant-baseline="middle">FIRE</text>
  </svg>`,
};

// ── 05 · LIQUID METAL ───────────────────────────────────────────

const liquidMetal: TextEffectPreset = {
  id: 'tfx-liquid-metal',
  label: 'Liquid Metal',
  category: 'material',
  description: 'Animated liquid chrome ripple effect.',
  filterContent: `<feTurbulence type="turbulence" baseFrequency="0.01 0.06" numOctaves="1" seed="5" result="t"><animate attributeName="baseFrequency" values="0.01 0.06;0.02 0.08;0.01 0.06" dur="4s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="t" scale="4"/>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '160%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvMF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#5b6470"/><stop offset="20%" stop-color="#dfe6ee"/><stop offset="40%" stop-color="#7c8794"/><stop offset="52%" stop-color="#fff"/><stop offset="66%" stop-color="#8e98a4"/><stop offset="82%" stop-color="#d7dde4"/><stop offset="100%" stop-color="#5d6671"/><animateTransform attributeName="gradientTransform" type="translate" dur="3.8s" repeatCount="indefinite" values="-0.9 0;0.9 0;-0.9 0"/></linearGradient>
      <filter id="pvMR" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="turbulence" baseFrequency="0.01 0.06" numOctaves="1" seed="5" result="t"><animate attributeName="baseFrequency" values="0.01 0.06;0.02 0.08;0.01 0.06" dur="4s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="t" scale="3"/></filter>
    </defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="url(#pvMF)" text-anchor="middle" filter="url(#pvMR)" dominant-baseline="middle">METAL</text>
  </svg>`,
};

// ── 06 · SMOKE ──────────────────────────────────────────────────

const smoke: TextEffectPreset = {
  id: 'tfx-smoke',
  label: 'Smoke',
  category: 'energy',
  description: 'Animated dissolving smoke with turbulence.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.008 0.03" numOctaves="2" seed="10" result="n"><animate attributeName="baseFrequency" values="0.008 0.03;0.012 0.06;0.008 0.03" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/><feGaussianBlur stdDeviation="2"/>`,
  filterAttributes: { x: '-60%', y: '-80%', width: '220%', height: '260%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvSF" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f1f5f9" stop-opacity=".95"/><stop offset="100%" stop-color="#94a3b8" stop-opacity=".75"/></linearGradient>
      <filter id="pvSB" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="pvST" x="-60%" y="-80%" width="220%" height="260%"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.03" numOctaves="2" seed="10" result="n"><animate attributeName="baseFrequency" values="0.008 0.03;0.012 0.06;0.008 0.03" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/><feGaussianBlur stdDeviation="1.5"/></filter>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvSF)" text-anchor="middle" opacity=".22" filter="url(#pvSB)" dominant-baseline="middle">SMOKE</text>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvSF)" text-anchor="middle" filter="url(#pvST)" dominant-baseline="middle">SMOKE<animateTransform attributeName="transform" type="translate" dur="5.5s" repeatCount="indefinite" values="0 0;0 -4;0 0"/></text>
  </svg>`,
};

// ── 07 · REVEAL ─────────────────────────────────────────────────

const reveal: TextEffectPreset = {
  id: 'tfx-reveal',
  label: 'Reveal',
  category: 'animated',
  description: 'Animated wipe reveal with shine sweep.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvRF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fff"/><stop offset="50%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#fff"/><animateTransform attributeName="gradientTransform" type="translate" dur="3s" repeatCount="indefinite" values="-0.5 0;0.5 0;-0.5 0"/></linearGradient>
      <linearGradient id="pvRSG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="42%" stop-color="white" stop-opacity="0"/><stop offset="50%" stop-color="white" stop-opacity="1"/><stop offset="58%" stop-color="white" stop-opacity="0"/><stop offset="100%" stop-color="white" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" dur="2.1s" repeatCount="indefinite" values="-1 0;1 0"/></linearGradient>
      <mask id="pvRM"><rect x="0" y="0" width="0" height="68" fill="white"><animate attributeName="width" dur="3.3s" repeatCount="indefinite" keyTimes="0;0.42;0.78;1" values="0;68;68;0"/></rect></mask>
      <mask id="pvRSM"><rect x="0" y="0" width="68" height="68" fill="url(#pvRSG)"/></mask>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="#334155" text-anchor="middle" opacity=".45" dominant-baseline="middle">REVEAL</text>
    <g mask="url(#pvRM)"><text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvRF)" text-anchor="middle" dominant-baseline="middle">REVEAL</text></g>
    <g mask="url(#pvRSM)"><text x="34" y="40" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" opacity=".95" dominant-baseline="middle">REVEAL</text></g>
  </svg>`,
};

// ── 08 · OUTLINE PULSE ──────────────────────────────────────────

const outlinePulse: TextEffectPreset = {
  id: 'tfx-outline-pulse',
  label: 'Outline Pulse',
  category: 'outline',
  description: 'Animated pulsating outlined text with glow.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvOPS" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#22d3ee"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#a78bfa"/><animateTransform attributeName="gradientTransform" type="translate" dur="4s" repeatCount="indefinite" values="-0.5 0;0.5 0;-0.5 0"/></linearGradient>
      <filter id="pvOPG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="none" stroke="url(#pvOPS)" stroke-width="1.5" text-anchor="middle" filter="url(#pvOPG)" dominant-baseline="middle">PULSE<animate attributeName="stroke-width" dur="2.2s" repeatCount="indefinite" values="1.5;3;1.5"/><animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values="1;0.82;1"/></text>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#fff" fill-opacity=".08" text-anchor="middle" dominant-baseline="middle">PULSE</text>
  </svg>`,
};

// ── 09 · CHROME SCAN ────────────────────────────────────────────

const chromeScan: TextEffectPreset = {
  id: 'tfx-chrome-scan',
  label: 'Chrome Scan',
  category: 'material',
  description: 'Animated chrome gradient with sweeping highlight.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="alpha"/><feSpecularLighting in="alpha" surfaceScale="4" specularConstant="1.1" specularExponent="22" lighting-color="white" result="spec"><fePointLight x="40" y="-50" z="140"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '180%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvCF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#4b5563"/><stop offset="18%" stop-color="#e5e7eb"/><stop offset="38%" stop-color="#6b7280"/><stop offset="52%" stop-color="#fff"/><stop offset="66%" stop-color="#9ca3af"/><stop offset="84%" stop-color="#f3f4f6"/><stop offset="100%" stop-color="#4b5563"/><animateTransform attributeName="gradientTransform" type="translate" dur="3.6s" repeatCount="indefinite" values="-1 0;1 0;-1 0"/></linearGradient>
      <linearGradient id="pvCS" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="46%" stop-color="white" stop-opacity="0"/><stop offset="50%" stop-color="white" stop-opacity="1"/><stop offset="54%" stop-color="white" stop-opacity="0"/><stop offset="100%" stop-color="white" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" dur="2.2s" repeatCount="indefinite" values="-1 0;1 0"/></linearGradient>
      <mask id="pvCM"><rect x="0" y="0" width="68" height="68" fill="url(#pvCS)"/></mask>
    </defs>
    <text x="34" y="40" font-size="12" font-weight="700" fill="url(#pvCF)" text-anchor="middle" dominant-baseline="middle">CHROME</text>
    <g mask="url(#pvCM)"><text x="34" y="40" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" opacity=".95" dominant-baseline="middle">CHROME</text></g>
  </svg>`,
};

// ── 10 · GHOST ECHO ─────────────────────────────────────────────

const ghostEcho: TextEffectPreset = {
  id: 'tfx-ghost-echo',
  label: 'Ghost Echo',
  category: 'animated',
  description: 'Flickering ghost trails with drifting echoes.',
  filterContent: `<feGaussianBlur stdDeviation="3"/>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs><filter id="pvGEB" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter></defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#22d3ee" text-anchor="middle" opacity=".28" filter="url(#pvGEB)" dominant-baseline="middle">GHOST<animateTransform attributeName="transform" type="translate" dur="2.2s" repeatCount="indefinite" values="0 0;-7 -1;-2 0;-8 1;0 0"/><animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values=".18;.32;.18"/></text>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#f472b6" text-anchor="middle" opacity=".24" filter="url(#pvGEB)" dominant-baseline="middle">GHOST<animateTransform attributeName="transform" type="translate" dur="1.8s" repeatCount="indefinite" values="0 0;7 2;3 0;8 -1;0 0"/><animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" values=".14;.3;.14"/></text>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">GHOST<animate attributeName="opacity" dur="1.6s" repeatCount="indefinite" values="1;0.88;1;0.94;1"/></text>
  </svg>`,
};

// ── 11 · SIGNAL ─────────────────────────────────────────────────

const signal: TextEffectPreset = {
  id: 'tfx-signal',
  label: 'Signal',
  category: 'digital',
  description: 'Animated scan-line sweep effect.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvSIF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#34d399"/><stop offset="50%" stop-color="#86efac"/><stop offset="100%" stop-color="#93c5fd"/></linearGradient>
      <pattern id="pvSIP" patternUnits="userSpaceOnUse" width="8" height="8"><animateTransform attributeName="patternTransform" type="translate" dur="0.7s" repeatCount="indefinite" values="0 0;0 8"/><rect x="0" y="0" width="8" height="2" fill="white" fill-opacity=".22"/><rect x="0" y="2" width="8" height="6" fill="white" fill-opacity="0"/></pattern>
      <linearGradient id="pvSIW" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="45%" stop-color="white" stop-opacity="0"/><stop offset="50%" stop-color="white" stop-opacity="1"/><stop offset="55%" stop-color="white" stop-opacity="0"/><stop offset="100%" stop-color="white" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" dur="2s" repeatCount="indefinite" values="-1 0;1 0"/></linearGradient>
      <mask id="pvSIM1"><rect x="0" y="0" width="68" height="68" fill="url(#pvSIP)"/></mask>
      <mask id="pvSIM2"><rect x="0" y="0" width="68" height="68" fill="url(#pvSIW)"/></mask>
    </defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="url(#pvSIF)" text-anchor="middle" dominant-baseline="middle">SIGNAL</text>
    <g mask="url(#pvSIM1)"><text x="34" y="40" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" opacity=".72" dominant-baseline="middle">SIGNAL</text></g>
    <g mask="url(#pvSIM2)"><text x="34" y="40" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" opacity=".95" dominant-baseline="middle">SIGNAL</text></g>
  </svg>`,
};

// ── 12 · CRYSTAL PRISM ──────────────────────────────────────────

const crystalPrism: TextEffectPreset = {
  id: 'tfx-crystal-prism',
  label: 'Crystal Prism',
  category: 'energy',
  description: 'Animated prismatic rainbow with subtle displacement.',
  filterContent: `<feTurbulence type="turbulence" baseFrequency="0.015 0.03" numOctaves="2" seed="7" result="n"><animate attributeName="baseFrequency" values="0.015 0.03;0.025 0.04;0.015 0.03" dur="5s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '160%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvPF" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff"/><stop offset="22%" stop-color="#7dd3fc"/><stop offset="45%" stop-color="#c4b5fd"/><stop offset="70%" stop-color="#86efac"/><stop offset="100%" stop-color="#fff"/><animateTransform attributeName="gradientTransform" type="rotate" dur="10s" repeatCount="indefinite" values="0 .5 .5;360 .5 .5"/></linearGradient>
      <filter id="pvPD" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="turbulence" baseFrequency="0.015 0.03" numOctaves="2" seed="7" result="n"><animate attributeName="baseFrequency" values="0.015 0.03;0.025 0.04;0.015 0.03" dur="5s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="2"/></filter>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvPF)" text-anchor="middle" filter="url(#pvPD)" dominant-baseline="middle">PRISM</text>
    <text x="34" y="40" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" opacity=".1" dominant-baseline="middle">PRISM</text>
  </svg>`,
};

// ── 13 · WARP WAVE ──────────────────────────────────────────────

const warpWave: TextEffectPreset = {
  id: 'tfx-warp-wave',
  label: 'Warp Wave',
  category: 'distortion',
  description: 'Animated wavy distortion with colour shift.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.01 0.08" numOctaves="1" seed="11" result="noise"><animate attributeName="baseFrequency" values="0.01 0.08;0.02 0.12;0.01 0.08" dur="3.2s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="7"/>`,
  filterAttributes: { x: '-30%', y: '-50%', width: '160%', height: '220%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvWF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f472b6"/><stop offset="50%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#38bdf8"/><animateTransform attributeName="gradientTransform" type="translate" dur="4.8s" repeatCount="indefinite" values="-0.6 0;0.6 0;-0.6 0"/></linearGradient>
      <filter id="pvWD" x="-30%" y="-50%" width="160%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.01 0.08" numOctaves="1" seed="11" result="noise"><animate attributeName="baseFrequency" values="0.01 0.08;0.02 0.12;0.01 0.08" dur="3.2s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="4"/></filter>
    </defs>
    <text x="34" y="40" font-size="15" font-weight="700" fill="url(#pvWF)" text-anchor="middle" filter="url(#pvWD)" dominant-baseline="middle">WARP</text>
  </svg>`,
};

// ── 14 · AURORA ─────────────────────────────────────────────────

const aurora: TextEffectPreset = {
  id: 'tfx-aurora',
  label: 'Aurora',
  category: 'energy',
  description: 'Animated aurora borealis gradient glow.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvAF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#22d3ee"/><stop offset="25%" stop-color="#86efac"/><stop offset="50%" stop-color="#fff"/><stop offset="75%" stop-color="#c4b5fd"/><stop offset="100%" stop-color="#38bdf8"/><animateTransform attributeName="gradientTransform" type="translate" dur="5s" repeatCount="indefinite" values="-0.8 0;0.8 0;-0.8 0"/></linearGradient>
      <filter id="pvAG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="url(#pvAF)" text-anchor="middle" opacity=".24" filter="url(#pvAG)" dominant-baseline="middle">AURORA</text>
    <text x="34" y="40" font-size="13" font-weight="700" fill="url(#pvAF)" text-anchor="middle" filter="url(#pvAG)" dominant-baseline="middle">AURORA<animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values="1;0.88;1"/></text>
  </svg>`,
};

// ── 15 · STENCIL CUT ────────────────────────────────────────────

const stencilCut: TextEffectPreset = {
  id: 'tfx-stencil-cut',
  label: 'Stencil Cut',
  category: 'print',
  description: 'Animated bar-mask stencil reveal.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvStF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#94a3b8"/></linearGradient>
      <pattern id="pvStB" patternUnits="userSpaceOnUse" width="12" height="12"><animateTransform attributeName="patternTransform" type="translate" dur="1.3s" repeatCount="indefinite" values="0 0;12 0"/><rect x="0" y="0" width="5" height="12" fill="white"/><rect x="5" y="0" width="7" height="12" fill="black"/></pattern>
      <mask id="pvStM"><rect x="0" y="0" width="68" height="68" fill="url(#pvStB)"/></mask>
    </defs>
    <text x="34" y="40" font-size="12" font-weight="700" fill="#334155" text-anchor="middle" opacity=".45" dominant-baseline="middle">STENCIL</text>
    <g mask="url(#pvStM)"><text x="34" y="40" font-size="12" font-weight="700" fill="url(#pvStF)" text-anchor="middle" dominant-baseline="middle">STENCIL</text></g>
  </svg>`,
};

// ── 16 · EMBER ──────────────────────────────────────────────────

const ember: TextEffectPreset = {
  id: 'tfx-ember',
  label: 'Ember',
  category: 'energy',
  description: 'Animated smoldering ember with heat waves.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="2" seed="4" result="n"><animate attributeName="baseFrequency" values="0.015 0.09;0.03 0.15;0.015 0.09" dur="2.1s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="6"/>`,
  filterAttributes: { x: '-30%', y: '-50%', width: '160%', height: '220%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvEF" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stop-color="#7c2d12"/><stop offset="35%" stop-color="#ea580c"/><stop offset="70%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#fff7ed"/><animateTransform attributeName="gradientTransform" type="scale" dur="2.4s" repeatCount="indefinite" values="1 1;1 1.15;1 1"/></linearGradient>
      <filter id="pvEH" x="-30%" y="-50%" width="160%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="2" seed="4" result="n"><animate attributeName="baseFrequency" values="0.015 0.09;0.03 0.15;0.015 0.09" dur="2.1s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
      <filter id="pvEG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvEF)" text-anchor="middle" opacity=".24" filter="url(#pvEG)" dominant-baseline="middle">EMBER</text>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvEF)" text-anchor="middle" filter="url(#pvEH)" dominant-baseline="middle">EMBER</text>
  </svg>`,
};

// ── 17 · ICE ────────────────────────────────────────────────────

const ice: TextEffectPreset = {
  id: 'tfx-ice',
  label: 'Ice',
  category: 'material',
  description: 'Animated icy crystalline facets.',
  filterContent: `<feTurbulence type="turbulence" baseFrequency="0.02 0.04" numOctaves="1" seed="9" result="t"><animate attributeName="baseFrequency" values="0.02 0.04;0.03 0.05;0.02 0.04" dur="4.5s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="t" scale="3"/>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '160%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvIF" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="35%" stop-color="#7dd3fc"/><stop offset="70%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#fff"/><animateTransform attributeName="gradientTransform" type="rotate" dur="9s" repeatCount="indefinite" values="0 .5 .5;360 .5 .5"/></linearGradient>
      <filter id="pvID" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="turbulence" baseFrequency="0.02 0.04" numOctaves="1" seed="9" result="t"><animate attributeName="baseFrequency" values="0.02 0.04;0.03 0.05;0.02 0.04" dur="4.5s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="t" scale="2"/></filter>
    </defs>
    <text x="34" y="40" font-size="18" font-weight="700" fill="url(#pvIF)" text-anchor="middle" filter="url(#pvID)" dominant-baseline="middle">ICE</text>
    <text x="34" y="40" font-size="18" font-weight="700" fill="#fff" text-anchor="middle" opacity=".12" dominant-baseline="middle">ICE</text>
  </svg>`,
};

// ── 18 · RADAR ──────────────────────────────────────────────────

const radar: TextEffectPreset = {
  id: 'tfx-radar',
  label: 'Radar',
  category: 'digital',
  description: 'Animated radar sweep over green gradient.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvRaF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#14532d"/><stop offset="50%" stop-color="#4ade80"/><stop offset="100%" stop-color="#dcfce7"/></linearGradient>
      <linearGradient id="pvRaS" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="46%" stop-color="white" stop-opacity="0"/><stop offset="50%" stop-color="white" stop-opacity="1"/><stop offset="54%" stop-color="white" stop-opacity="0"/><stop offset="100%" stop-color="white" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" dur="1.8s" repeatCount="indefinite" values="-1 0;1 0"/></linearGradient>
      <mask id="pvRaM"><rect x="0" y="0" width="68" height="68" fill="url(#pvRaS)"/></mask>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvRaF)" text-anchor="middle" dominant-baseline="middle">RADAR</text>
    <g mask="url(#pvRaM)"><text x="34" y="40" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" opacity=".95" dominant-baseline="middle">RADAR</text></g>
  </svg>`,
};

// ── 19 · INK BLEED ──────────────────────────────────────────────

const inkBleed: TextEffectPreset = {
  id: 'tfx-ink-bleed',
  label: 'Ink Bleed',
  category: 'artistic',
  description: 'Animated bleeding ink diffusion.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="12" result="noise"><animate attributeName="baseFrequency" values="0.012 0.05;0.02 0.08;0.012 0.05" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="5"/><feGaussianBlur stdDeviation="1.2"/>`,
  filterAttributes: { x: '-40%', y: '-60%', width: '180%', height: '220%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvIBF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient>
      <filter id="pvIBD" x="-40%" y="-60%" width="180%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="12" result="noise"><animate attributeName="baseFrequency" values="0.012 0.05;0.02 0.08;0.012 0.05" dur="6s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/><feGaussianBlur stdDeviation="0.8"/></filter>
    </defs>
    <text x="34" y="40" font-size="16" font-weight="700" fill="#64748b" text-anchor="middle" opacity=".35" dominant-baseline="middle">INK</text>
    <text x="34" y="40" font-size="16" font-weight="700" fill="url(#pvIBF)" text-anchor="middle" filter="url(#pvIBD)" dominant-baseline="middle">INK</text>
  </svg>`,
};

// ── 20 · HOLOGRAM ───────────────────────────────────────────────

const hologram: TextEffectPreset = {
  id: 'tfx-hologram',
  label: 'Hologram',
  category: 'digital',
  description: 'Animated holographic effect with scan lines and flicker.',
  filterContent: `<feGaussianBlur stdDeviation="3"/>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvHoF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#67e8f9"/><stop offset="30%" stop-color="#fff"/><stop offset="60%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#22d3ee"/><animateTransform attributeName="gradientTransform" type="translate" dur="4.2s" repeatCount="indefinite" values="-0.8 0;0.8 0;-0.8 0"/></linearGradient>
      <pattern id="pvHoL" patternUnits="userSpaceOnUse" width="10" height="10"><animateTransform attributeName="patternTransform" type="translate" dur="0.85s" repeatCount="indefinite" values="0 0;0 10"/><rect x="0" y="0" width="10" height="2" fill="white" fill-opacity=".18"/><rect x="0" y="2" width="10" height="8" fill="white" fill-opacity="0"/></pattern>
      <mask id="pvHoM"><rect x="0" y="0" width="68" height="68" fill="url(#pvHoL)"/></mask>
      <filter id="pvHoB" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
    </defs>
    <text x="34" y="40" font-size="11" font-weight="700" fill="#22d3ee" text-anchor="middle" opacity=".18" filter="url(#pvHoB)" dominant-baseline="middle">HOLO<animateTransform attributeName="transform" type="translate" dur="1.8s" repeatCount="indefinite" values="0 0;0 -3;0 0;0 2;0 0"/></text>
    <text x="34" y="40" font-size="11" font-weight="700" fill="url(#pvHoF)" text-anchor="middle" dominant-baseline="middle">HOLO<animate attributeName="opacity" dur="1.8s" repeatCount="indefinite" values="0.95;0.75;0.95"/></text>
    <g mask="url(#pvHoM)"><text x="34" y="40" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" opacity=".85" dominant-baseline="middle">HOLO</text></g>
  </svg>`,
};

// ════════════════════════════════════════════════════════════════
// STATIC EFFECTS FROM textfx.svg (01–20)
// ════════════════════════════════════════════════════════════════

// ── 01 · SILVER BEVEL ───────────────────────────────────────────

const silverBevel: TextEffectPreset = {
  id: 'tfx-silver-bevel',
  label: 'Silver Bevel',
  category: 'material',
  description: 'Beveled chrome look with specular lighting.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="alpha"/><feSpecularLighting in="alpha" surfaceScale="4" specularConstant="1.1" specularExponent="22" lighting-color="white" result="spec"><fePointLight x="40" y="-50" z="140"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '180%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvSBF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#626c78"/><stop offset="18%" stop-color="#edf2f7"/><stop offset="38%" stop-color="#8a96a3"/><stop offset="52%" stop-color="#fff"/><stop offset="68%" stop-color="#9ca6b2"/><stop offset="84%" stop-color="#e8edf3"/><stop offset="100%" stop-color="#5f6975"/></linearGradient>
      <filter id="pvSBV" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="alpha"/><feSpecularLighting in="alpha" surfaceScale="4" specularConstant="1.1" specularExponent="22" lighting-color="white" result="spec"><fePointLight x="40" y="-50" z="140"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvSBF)" text-anchor="middle" filter="url(#pvSBV)" dominant-baseline="middle">SILVER</text>
  </svg>`,
};

// ── 02 · GOLD FOIL ──────────────────────────────────────────────

const goldFoil: TextEffectPreset = {
  id: 'tfx-gold-foil',
  label: 'Gold Foil',
  category: 'material',
  description: 'Textured gold foil with subtle grain.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2"/>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '160%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvGFF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#5b3a00"/><stop offset="16%" stop-color="#b8860b"/><stop offset="35%" stop-color="#ffd95a"/><stop offset="52%" stop-color="#fff4b5"/><stop offset="70%" stop-color="#d4a316"/><stop offset="86%" stop-color="#f4d35e"/><stop offset="100%" stop-color="#6b4600"/></linearGradient>
      <filter id="pvGFT" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1"/></filter>
    </defs>
    <text x="34" y="40" font-size="15" font-weight="700" fill="url(#pvGFF)" text-anchor="middle" filter="url(#pvGFT)" dominant-baseline="middle">GOLD</text>
  </svg>`,
};

// ── 03 · GLASS FROST ────────────────────────────────────────────

const glassFrost: TextEffectPreset = {
  id: 'tfx-glass-frost',
  label: 'Glass Frost',
  category: 'material',
  description: 'Frosted glass with specular edge lighting.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="a"/><feSpecularLighting in="a" surfaceScale="3" specularConstant="1" specularExponent="18" lighting-color="white" result="spec"><fePointLight x="60" y="-40" z="120"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '180%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvGlF" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff" stop-opacity=".95"/><stop offset="50%" stop-color="#dbeafe" stop-opacity=".75"/><stop offset="100%" stop-color="#bfdbfe" stop-opacity=".6"/></linearGradient>
      <filter id="pvGlE" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="a"/><feSpecularLighting in="a" surfaceScale="3" specularConstant="1" specularExponent="18" lighting-color="white" result="spec"><fePointLight x="60" y="-40" z="120"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvGlF)" fill-opacity=".75" text-anchor="middle" filter="url(#pvGlE)" dominant-baseline="middle">GLASS</text>
  </svg>`,
};

// ── 04 · BLUEPRINT ──────────────────────────────────────────────

const blueprint: TextEffectPreset = {
  id: 'tfx-blueprint',
  label: 'Blueprint',
  category: 'print',
  description: 'Blueprint grid overlay on text.',
  filterContent: `<feFlood flood-color="#60a5fa" flood-opacity="1" result="blueFlood"/><feComposite in="blueFlood" in2="SourceAlpha" operator="in"/>`,
  filterAttributes: { x: '0%', y: '0%', width: '100%', height: '100%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <pattern id="pvBPG" patternUnits="userSpaceOnUse" width="12" height="12"><path d="M0 0H12M0 0V12" stroke="white" stroke-opacity=".32" stroke-width="1"/></pattern>
      <mask id="pvBPM"><rect x="0" y="0" width="68" height="68" fill="url(#pvBPG)"/></mask>
    </defs>
    <text x="34" y="40" font-size="16" font-weight="700" fill="#60a5fa" stroke="#dbeafe" stroke-width=".6" stroke-opacity=".22" text-anchor="middle" dominant-baseline="middle">PLAN</text>
    <g mask="url(#pvBPM)"><text x="34" y="40" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" opacity=".95" dominant-baseline="middle">PLAN</text></g>
  </svg>`,
};

// ── 05 · LETTERPRESS ────────────────────────────────────────────

const letterpress: TextEffectPreset = {
  id: 'tfx-letterpress',
  label: 'Letterpress',
  category: 'print',
  description: 'Debossed letterpress impression.',
  filterContent: `<feOffset dx="0" dy="-1.5" in="SourceAlpha" result="highlight"/><feFlood flood-color="#ffffff" flood-opacity="0.18" result="hiColor"/><feComposite in="hiColor" in2="highlight" operator="in" result="hiLit"/><feOffset dx="0" dy="1.5" in="SourceAlpha" result="shadow"/><feFlood flood-color="#000000" flood-opacity="0.7" result="shColor"/><feComposite in="shColor" in2="shadow" operator="in" result="shLit"/><feMerge><feMergeNode in="shLit"/><feMergeNode in="SourceGraphic"/><feMergeNode in="hiLit"/></feMerge>`,
  filterAttributes: { x: '-5%', y: '-10%', width: '110%', height: '120%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <text x="34" y="43" font-size="14" font-weight="700" fill="#020617" text-anchor="middle" opacity=".7" dominant-baseline="middle">PRESS</text>
    <text x="34" y="39" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" opacity=".16" dominant-baseline="middle">PRESS</text>
    <text x="34" y="40" font-size="14" font-weight="700" fill="#cbd5e1" text-anchor="middle" dominant-baseline="middle">PRESS</text>
  </svg>`,
};

// ── 06 · HALFTONE ───────────────────────────────────────────────

const halftone: TextEffectPreset = {
  id: 'tfx-halftone',
  label: 'Halftone',
  category: 'print',
  description: 'Dot-matrix halftone pattern overlay.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <pattern id="pvHtD" patternUnits="userSpaceOnUse" width="6" height="6"><circle cx="1.5" cy="1.5" r="1.2" fill="white"/><circle cx="4.5" cy="4.5" r=".8" fill="white" fill-opacity=".7"/></pattern>
      <mask id="pvHtM"><rect x="0" y="0" width="68" height="68" fill="url(#pvHtD)"/></mask>
    </defs>
    <text x="34" y="40" font-size="16" font-weight="700" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">DOT</text>
    <g mask="url(#pvHtM)"><text x="34" y="40" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">DOT</text></g>
  </svg>`,
};

// ── 07 · INLINE SHADOW ──────────────────────────────────────────

const inlineShadow: TextEffectPreset = {
  id: 'tfx-inline-shadow',
  label: 'Inline Shadow',
  category: 'outline',
  description: 'Double-stroke inline shadow depth.',
  filterContent: `<feMorphology in="SourceAlpha" operator="dilate" radius="4" result="dilated"/><feFlood flood-color="#111827" flood-opacity="1" result="darkColor"/><feComposite in="darkColor" in2="dilated" operator="in" result="darkOutline"/><feMorphology in="SourceAlpha" operator="dilate" radius="1" result="inner"/><feFlood flood-color="#475569" flood-opacity="1" result="midColor"/><feComposite in="midColor" in2="inner" operator="in" result="midOutline"/><feMerge><feMergeNode in="darkOutline"/><feMergeNode in="midOutline"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-10%', y: '-10%', width: '120%', height: '120%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#e2e8f0" stroke="#111827" stroke-width="4" stroke-linejoin="round" text-anchor="middle" dominant-baseline="middle">INLINE</text>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#f8fafc" stroke="#475569" stroke-width="1.2" stroke-linejoin="round" text-anchor="middle" dominant-baseline="middle">INLINE</text>
  </svg>`,
};

// ── 08 · CHALK ──────────────────────────────────────────────────

const chalkStatic: TextEffectPreset = {
  id: 'tfx-chalk',
  label: 'Chalk',
  category: 'artistic',
  description: 'Chalky rough texture with soft blur.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2"/><feGaussianBlur stdDeviation="0.4"/>`,
  filterAttributes: { x: '-40%', y: '-40%', width: '180%', height: '180%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs><filter id="pvChR" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.5"/><feGaussianBlur stdDeviation="0.3"/></filter></defs>
    <text x="34" y="40" font-size="15" font-weight="700" fill="#f8fafc" fill-opacity=".9" text-anchor="middle" filter="url(#pvChR)" dominant-baseline="middle">CHALK</text>
  </svg>`,
};

// ── 09 · CARBON FIBER ───────────────────────────────────────────

const carbonFiber: TextEffectPreset = {
  id: 'tfx-carbon-fiber',
  label: 'Carbon Fiber',
  category: 'material',
  description: 'Carbon fiber weave pattern fill.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1"/>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '160%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <pattern id="pvCaP" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="#111827"/><rect x="0" y="0" width="4" height="4" fill="#1f2937"/><rect x="4" y="4" width="4" height="4" fill="#1f2937"/><rect x="0" y="4" width="4" height="4" fill="#0b1220"/><rect x="4" y="0" width="4" height="4" fill="#0b1220"/></pattern>
    </defs>
    <text x="34" y="40" font-size="11" font-weight="700" fill="url(#pvCaP)" text-anchor="middle" dominant-baseline="middle">CARBON</text>
  </svg>`,
};

// ── 10 · CUTOUT ─────────────────────────────────────────────────

const cutout: TextEffectPreset = {
  id: 'tfx-cutout',
  label: 'Cutout',
  category: 'print',
  description: 'Paper cutout with sliced portions removed.',
  filterContent: `<feFlood flood-color="#ffffff" flood-opacity="1" result="white"/><feComposite in="white" in2="SourceAlpha" operator="in"/>`,
  filterAttributes: { x: '0%', y: '0%', width: '100%', height: '100%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <mask id="pvCuM"><rect x="0" y="0" width="68" height="68" fill="white"/><rect x="0" y="32" width="68" height="8" fill="black"/><rect x="27" y="0" width="6" height="68" fill="black"/><rect x="42" y="0" width="4" height="68" fill="black"/></mask>
    </defs>
    <g mask="url(#pvCuM)"><text x="34" y="40" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">CUTOUT</text></g>
  </svg>`,
};

// ── 11 · NEON OUTLINE ───────────────────────────────────────────

const neonOutline: TextEffectPreset = {
  id: 'tfx-neon-outline',
  label: 'Neon Outline',
  category: 'outline',
  description: 'Neon outline glow without fill.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvNOS" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#22d3ee"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient>
      <filter id="pvNOG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="12" font-weight="700" fill="none" stroke="url(#pvNOS)" stroke-width="1.4" text-anchor="middle" filter="url(#pvNOG)" dominant-baseline="middle">STATIC</text>
    <text x="34" y="40" font-size="12" font-weight="700" fill="#fff" fill-opacity=".06" text-anchor="middle" dominant-baseline="middle">STATIC</text>
  </svg>`,
};

// ── 12 · STRIPED METAL ──────────────────────────────────────────

const stripedMetal: TextEffectPreset = {
  id: 'tfx-striped-metal',
  label: 'Striped Metal',
  category: 'material',
  description: 'Brushed metal stripe pattern fill.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1"/>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '160%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs><pattern id="pvSmP" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="#9ca3af"/><rect x="0" y="0" width="4" height="8" fill="#d1d5db"/><rect x="4" y="0" width="4" height="8" fill="#6b7280"/></pattern></defs>
    <text x="34" y="40" font-size="14" font-weight="700" fill="url(#pvSmP)" text-anchor="middle" dominant-baseline="middle">STEEL</text>
  </svg>`,
};

// ── 13 · VELVET ─────────────────────────────────────────────────

const velvet: TextEffectPreset = {
  id: 'tfx-velvet',
  label: 'Velvet',
  category: 'material',
  description: 'Rich velvet texture with purple glow.',
  filterContent: `<feGaussianBlur stdDeviation="2.2" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0.08  0 1 0 0 0.03  0 1 0 0 0.2  0 0 0 .55 0" result="tint"/><feMerge><feMergeNode in="tint"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-40%', y: '-40%', width: '180%', height: '180%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvVeF" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4c1d95"/><stop offset="35%" stop-color="#7c3aed"/><stop offset="70%" stop-color="#581c87"/><stop offset="100%" stop-color="#2e1065"/></linearGradient>
      <filter id="pvVeG" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0.08  0 1 0 0 0.03  0 1 0 0 0.2  0 0 0 .55 0" result="tint"/><feMerge><feMergeNode in="tint"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="url(#pvVeF)" text-anchor="middle" filter="url(#pvVeG)" dominant-baseline="middle">VELVET</text>
    <text x="34" y="38" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" opacity=".08" dominant-baseline="middle">VELVET</text>
  </svg>`,
};

// ── 14 · INK STAMP ──────────────────────────────────────────────

const inkStamp: TextEffectPreset = {
  id: 'tfx-ink-stamp',
  label: 'Ink Stamp',
  category: 'print',
  description: 'Worn rubber stamp impression.',
  filterContent: `<feMorphology in="SourceAlpha" operator="dilate" radius="0.8" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="d" in2="n" scale="1.4"/>`,
  filterAttributes: { x: '-40%', y: '-40%', width: '180%', height: '180%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <filter id="pvISB" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2"/></filter>
      <filter id="pvISE" x="-40%" y="-40%" width="180%" height="180%"><feMorphology in="SourceAlpha" operator="dilate" radius="0.4" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="d" in2="n" scale="1"/></filter>
    </defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#ef4444" text-anchor="middle" opacity=".22" filter="url(#pvISB)" dominant-baseline="middle">STAMP</text>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#f87171" text-anchor="middle" filter="url(#pvISE)" dominant-baseline="middle">STAMP</text>
  </svg>`,
};

// ── 15 · CERAMIC ────────────────────────────────────────────────

const ceramic: TextEffectPreset = {
  id: 'tfx-ceramic',
  label: 'Ceramic',
  category: 'material',
  description: 'Glossy ceramic finish with highlight.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="a"/><feSpecularLighting in="a" surfaceScale="3" specularConstant="1" specularExponent="18" lighting-color="white" result="spec"><fePointLight x="60" y="-40" z="120"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode/></feMerge>`,
  filterAttributes: { x: '-30%', y: '-30%', width: '160%', height: '180%' },
  preserveColors: true,
  preserveSourceFill: true,
  forceApplyFilter: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <linearGradient id="pvCeM" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff"/><stop offset="45%" stop-color="#f3f4f6"/><stop offset="100%" stop-color="#d1d5db"/></linearGradient>
      <linearGradient id="pvCeH" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="35%" stop-color="white" stop-opacity=".55"/><stop offset="65%" stop-color="white" stop-opacity=".18"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>
    </defs>
    <text x="34" y="43" font-size="12" font-weight="700" fill="#94a3b8" text-anchor="middle" opacity=".35" dominant-baseline="middle">CERAMIC</text>
    <text x="34" y="40" font-size="12" font-weight="700" fill="url(#pvCeM)" stroke="#fff" stroke-width=".5" stroke-opacity=".16" text-anchor="middle" dominant-baseline="middle">CERAMIC</text>
    <text x="34" y="36" font-size="12" font-weight="700" fill="url(#pvCeH)" text-anchor="middle" opacity=".55" dominant-baseline="middle">CERAMIC</text>
  </svg>`,
};

// ── 16 · XRAY ───────────────────────────────────────────────────

const xray: TextEffectPreset = {
  id: 'tfx-xray',
  label: 'X-Ray',
  category: 'digital',
  description: 'X-ray scan with cyan outline glow.',
  filterContent: `<feGaussianBlur stdDeviation="2" result="g1"/><feColorMatrix in="g1" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.9  0 0 0 0 1  0 0 0 1 0" result="c1"/><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="g2"/><feColorMatrix in="g2" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.8  0 0 0 0 1  0 0 0 .45 0" result="c2"/><feMerge><feMergeNode in="c2"/><feMergeNode in="c1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs><filter id="pvXG" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="g1"/><feColorMatrix in="g1" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.9  0 0 0 0 1  0 0 0 1 0" result="c1"/><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="g2"/><feColorMatrix in="g2" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.8  0 0 0 0 1  0 0 0 .45 0" result="c2"/><feMerge><feMergeNode in="c2"/><feMergeNode in="c1"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <text x="34" y="40" font-size="17" font-weight="700" fill="none" stroke="#67e8f9" stroke-width="1" text-anchor="middle" filter="url(#pvXG)" dominant-baseline="middle">XRAY</text>
  </svg>`,
};

// ── 17 · MOSAIC CLIP ────────────────────────────────────────────

const mosaicClip: TextEffectPreset = {
  id: 'tfx-mosaic-clip',
  label: 'Mosaic Clip',
  category: 'print',
  description: 'Mosaic tile clipping fragments.',
  filterContent: `<feFlood flood-color="#ffffff" flood-opacity="1" result="white"/><feComposite in="white" in2="SourceAlpha" operator="in"/>`,
  filterAttributes: { x: '0%', y: '0%', width: '100%', height: '100%' },
  preserveColors: true,
  preserveSourceFill: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <clipPath id="pvMoC"><rect x="4" y="10" width="18" height="16"/><rect x="15" y="30" width="22" height="16"/><rect x="32" y="12" width="18" height="14"/><rect x="44" y="32" width="20" height="16"/></clipPath>
    </defs>
    <g clip-path="url(#pvMoC)"><text x="34" y="40" font-size="13" font-weight="700" fill="#f8fafc" text-anchor="middle" dominant-baseline="middle">MOSAIC</text></g>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" opacity=".08" dominant-baseline="middle">MOSAIC</text>
  </svg>`,
};

// ── 18 · DUAL TONE ──────────────────────────────────────────────

const dualTone: TextEffectPreset = {
  id: 'tfx-dual-tone',
  label: 'Dual Tone',
  category: 'artistic',
  description: 'Split pink-blue duotone gradient.',
  filterContent: `<feFlood flood-color="#fb7185" flood-opacity="1" result="pink"/><feComposite in="pink" in2="SourceAlpha" operator="in"/>`,
  filterAttributes: { x: '0%', y: '0%', width: '100%', height: '100%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs><linearGradient id="pvDtF" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#fb7185"/><stop offset="50%" stop-color="#fff"/><stop offset="100%" stop-color="#60a5fa"/></linearGradient></defs>
    <text x="34" y="40" font-size="18" font-weight="700" fill="url(#pvDtF)" text-anchor="middle" dominant-baseline="middle">DUO</text>
  </svg>`,
};

// ── 19 · PAPER CUT ──────────────────────────────────────────────

const paperCut: TextEffectPreset = {
  id: 'tfx-paper-cut',
  label: 'Paper Cut',
  category: 'print',
  description: 'Layered paper cutout with shadow offsets.',
  filterContent: `<feOffset dx="1" dy="1" in="SourceAlpha" result="l1"/><feOffset dx="2" dy="2" in="SourceAlpha" result="l2"/><feFlood flood-color="#000000" flood-opacity="0.38" result="sc"/><feComposite in="sc" in2="l2" operator="in" result="s2"/><feFlood flood-color="#cbd5e1" flood-opacity="1" result="mc"/><feComposite in="mc" in2="l1" operator="in" result="m1"/><feMerge><feMergeNode in="s2"/><feMergeNode in="m1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-5%', y: '-5%', width: '115%', height: '115%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <text x="38" y="44" font-size="14" font-weight="700" fill="#020617" text-anchor="middle" opacity=".38" dominant-baseline="middle">PAPER</text>
    <text x="36" y="42" font-size="14" font-weight="700" fill="#cbd5e1" text-anchor="middle" dominant-baseline="middle">PAPER</text>
    <text x="34" y="40" font-size="14" font-weight="700" fill="#f8fafc" text-anchor="middle" dominant-baseline="middle">PAPER</text>
  </svg>`,
};

// ── 20 · SIGNAL STATIC ─────────────────────────────────────────

const signalStatic: TextEffectPreset = {
  id: 'tfx-signal-static',
  label: 'Signal Static',
  category: 'digital',
  description: 'Green signal with static bar overlay.',
  filterContent: `<feGaussianBlur stdDeviation="4" result="g1"/><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="g2"/><feMerge><feMergeNode in="g2"/><feMergeNode in="g1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-50%', y: '-50%', width: '200%', height: '200%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#0d1728"/>
    <defs>
      <pattern id="pvSSP" patternUnits="userSpaceOnUse" width="8" height="8"><rect x="0" y="0" width="8" height="2" fill="white" fill-opacity=".24"/><rect x="0" y="2" width="8" height="6" fill="white" fill-opacity="0"/></pattern>
      <mask id="pvSSM"><rect x="0" y="0" width="68" height="68" fill="url(#pvSSP)"/></mask>
    </defs>
    <text x="34" y="40" font-size="13" font-weight="700" fill="#86efac" text-anchor="middle" dominant-baseline="middle">SIGNAL</text>
    <g mask="url(#pvSSM)"><text x="34" y="40" font-size="13" font-weight="700" fill="#fff" text-anchor="middle" opacity=".85" dominant-baseline="middle">SIGNAL</text></g>
  </svg>`,
};

// ════════════════════════════════════════════════════════════════
// ORIGINAL FILTER-ONLY PRESETS
// ════════════════════════════════════════════════════════════════

// ── Shadow presets ──────────────────────────────────────────────

const dropShadow: TextEffectPreset = {
  id: 'text-fx-drop-shadow',
  label: 'Drop Shadow',
  category: 'shadow',
  description: 'Classic drop shadow behind text.',
  filterContent: `<feDropShadow dx="2" dy="2" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.5"/>`,
  filterAttributes: { x: '-10%', y: '-10%', width: '130%', height: '130%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-ds" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="2" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.5"/></filter></defs><text x="10" y="40" font-size="18" font-weight="bold" fill="#333" filter="url(#pv-ds)">Abc</text></svg>`,
};

const longShadow: TextEffectPreset = {
  id: 'text-fx-long-shadow',
  label: 'Long Shadow',
  category: 'shadow',
  description: 'Extended diagonal shadow for flat design style.',
  filterContent: `<feFlood flood-color="#000000" flood-opacity="0.15" result="shadowColor"/><feOffset dx="1" dy="1" in="SourceAlpha" result="s1"/><feOffset dx="2" dy="2" in="SourceAlpha" result="s2"/><feOffset dx="3" dy="3" in="SourceAlpha" result="s3"/><feOffset dx="4" dy="4" in="SourceAlpha" result="s4"/><feOffset dx="5" dy="5" in="SourceAlpha" result="s5"/><feOffset dx="6" dy="6" in="SourceAlpha" result="s6"/><feMerge><feMergeNode in="s6"/><feMergeNode in="s5"/><feMergeNode in="s4"/><feMergeNode in="s3"/><feMergeNode in="s2"/><feMergeNode in="s1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-5%', y: '-5%', width: '130%', height: '130%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-ls" x="-5%" y="-5%" width="130%" height="130%"><feOffset dx="1" dy="1" in="SourceAlpha" result="s1"/><feOffset dx="2" dy="2" in="SourceAlpha" result="s2"/><feOffset dx="3" dy="3" in="SourceAlpha" result="s3"/><feOffset dx="4" dy="4" in="SourceAlpha" result="s4"/><feOffset dx="5" dy="5" in="SourceAlpha" result="s5"/><feOffset dx="6" dy="6" in="SourceAlpha" result="s6"/><feMerge><feMergeNode in="s6"/><feMergeNode in="s5"/><feMergeNode in="s4"/><feMergeNode in="s3"/><feMergeNode in="s2"/><feMergeNode in="s1"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#e74c3c" filter="url(#pv-ls)">Abc</text></svg>`,
};

const innerShadow: TextEffectPreset = {
  id: 'text-fx-inner-shadow',
  label: 'Inner Shadow',
  category: 'shadow',
  description: 'Inset shadow inside the text shapes.',
  filterContent: `<feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur stdDeviation="1.5" result="blur"/><feOffset dx="1.5" dy="1.5" result="offsetBlur"/><feFlood flood-color="#000000" flood-opacity="0.6" result="color"/><feComposite in2="offsetBlur" operator="in" result="shadow"/><feComposite in2="SourceAlpha" operator="in" result="clipped"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="clipped"/></feMerge>`,
  filterAttributes: { x: '-10%', y: '-10%', width: '120%', height: '120%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-is" x="-10%" y="-10%" width="120%" height="120%"><feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur stdDeviation="1.5" result="blur"/><feOffset dx="1.5" dy="1.5" result="offsetBlur"/><feFlood flood-color="#000" flood-opacity="0.6" result="color"/><feComposite in2="offsetBlur" operator="in" result="shadow"/><feComposite in2="SourceAlpha" operator="in" result="clipped"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="clipped"/></feMerge></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#3498db" filter="url(#pv-is)">Abc</text></svg>`,
};

// ── Glow presets ────────────────────────────────────────────────

const neonGlow: TextEffectPreset = {
  id: 'text-fx-neon-glow',
  label: 'Neon Glow',
  category: 'glow',
  description: 'Vibrant neon sign-style glow.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur1"/><feFlood flood-color="#00ffff" flood-opacity="0.8" result="glowColor"/><feComposite in="glowColor" in2="blur1" operator="in" result="coloredBlur"/><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur2"/><feFlood flood-color="#ffffff" flood-opacity="0.6" result="innerGlow"/><feComposite in="innerGlow" in2="blur2" operator="in" result="innerColoredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="innerColoredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-20%', y: '-20%', width: '140%', height: '140%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#1a1a2e"/><defs><filter id="pv-ng" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur1"/><feFlood flood-color="#00ffff" flood-opacity="0.8" result="glowColor"/><feComposite in="glowColor" in2="blur1" operator="in" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#00ffff" filter="url(#pv-ng)">Abc<animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0.7;1;0.7"/></text></svg>`,
};

const softGlowPreset: TextEffectPreset = {
  id: 'text-fx-soft-glow',
  label: 'Soft Glow',
  category: 'glow',
  description: 'Subtle luminous glow around text.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/><feFlood flood-color="#ffcc00" flood-opacity="0.5" result="glowColor"/><feComposite in="glowColor" in2="blur" operator="in" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-15%', y: '-15%', width: '130%', height: '130%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-sg" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/><feFlood flood-color="#ffcc00" flood-opacity="0.5" result="glowColor"/><feComposite in="glowColor" in2="blur" operator="in" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#ff9900" filter="url(#pv-sg)">Abc</text></svg>`,
};

const fireGlow: TextEffectPreset = {
  id: 'text-fx-fire-glow',
  label: 'Fire Glow',
  category: 'glow',
  description: 'Warm fire-like glow effect.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur1"/><feFlood flood-color="#ff4500" flood-opacity="0.6" result="fire1"/><feComposite in="fire1" in2="blur1" operator="in" result="fireBl1"/><feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur2"/><feFlood flood-color="#ff8c00" flood-opacity="0.3" result="fire2"/><feComposite in="fire2" in2="blur2" operator="in" result="fireBl2"/><feMerge><feMergeNode in="fireBl2"/><feMergeNode in="fireBl1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-25%', y: '-25%', width: '150%', height: '150%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#1a0a00"/><defs><filter id="pv-fg" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur1"/><feFlood flood-color="#ff4500" flood-opacity="0.6" result="fire1"/><feComposite in="fire1" in2="blur1" operator="in" result="fireBl1"/><feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur2"/><feFlood flood-color="#ff8c00" flood-opacity="0.3" result="fire2"/><feComposite in="fire2" in2="blur2" operator="in" result="fireBl2"/><feMerge><feMergeNode in="fireBl2"/><feMergeNode in="fireBl1"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="42" font-size="18" font-weight="bold" fill="#ff6600" filter="url(#pv-fg)">Abc<animate attributeName="opacity" dur="0.3s" repeatCount="indefinite" values="0.85;1;0.9;1;0.85"/></text></svg>`,
};

// ── Outline presets ─────────────────────────────────────────────

const strokeOutline: TextEffectPreset = {
  id: 'text-fx-stroke-outline',
  label: 'Stroke Outline',
  category: 'outline',
  description: 'Bold outline around text characters.',
  filterContent: `<feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated"/><feFlood flood-color="#000000" flood-opacity="1" result="outlineColor"/><feComposite in="outlineColor" in2="dilated" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-5%', y: '-5%', width: '110%', height: '110%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-so" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated"/><feFlood flood-color="#000" flood-opacity="1" result="outlineColor"/><feComposite in="outlineColor" in2="dilated" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#fff" filter="url(#pv-so)">Abc</text></svg>`,
};

const doubleOutline: TextEffectPreset = {
  id: 'text-fx-double-outline',
  label: 'Double Outline',
  category: 'outline',
  description: 'Two layered outlines for depth.',
  filterContent: `<feMorphology in="SourceAlpha" operator="dilate" radius="3" result="outer"/><feFlood flood-color="#2c3e50" flood-opacity="1" result="outerColor"/><feComposite in="outerColor" in2="outer" operator="in" result="outerOutline"/><feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="inner"/><feFlood flood-color="#ecf0f1" flood-opacity="1" result="innerColor"/><feComposite in="innerColor" in2="inner" operator="in" result="innerOutline"/><feMerge><feMergeNode in="outerOutline"/><feMergeNode in="innerOutline"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-8%', y: '-8%', width: '116%', height: '116%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-do" x="-8%" y="-8%" width="116%" height="116%"><feMorphology in="SourceAlpha" operator="dilate" radius="3" result="outer"/><feFlood flood-color="#2c3e50" flood-opacity="1" result="outerColor"/><feComposite in="outerColor" in2="outer" operator="in" result="outerOutline"/><feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="inner"/><feFlood flood-color="#ecf0f1" flood-opacity="1" result="innerColor"/><feComposite in="innerColor" in2="inner" operator="in" result="innerOutline"/><feMerge><feMergeNode in="outerOutline"/><feMergeNode in="innerOutline"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="6" y="40" font-size="18" font-weight="bold" fill="#e74c3c" filter="url(#pv-do)">Abc</text></svg>`,
};

// ── 3D presets ──────────────────────────────────────────────────

const extruded3d: TextEffectPreset = {
  id: 'text-fx-extruded-3d',
  label: 'Extruded 3D',
  category: '3d',
  description: 'Extruded letterpress-style depth effect.',
  filterContent: `<feOffset dx="1" dy="1" in="SourceAlpha" result="l1"/><feOffset dx="2" dy="2" in="SourceAlpha" result="l2"/><feOffset dx="3" dy="3" in="SourceAlpha" result="l3"/><feFlood flood-color="#8B4513" flood-opacity="0.8" result="extColor"/><feComposite in="extColor" in2="l3" operator="in" result="e3"/><feComposite in="extColor" in2="l2" operator="in" result="e2"/><feComposite in="extColor" in2="l1" operator="in" result="e1"/><feMerge><feMergeNode in="e3"/><feMergeNode in="e2"/><feMergeNode in="e1"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-5%', y: '-5%', width: '120%', height: '120%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-e3d" x="-5%" y="-5%" width="120%" height="120%"><feOffset dx="1" dy="1" in="SourceAlpha" result="l1"/><feOffset dx="2" dy="2" in="SourceAlpha" result="l2"/><feOffset dx="3" dy="3" in="SourceAlpha" result="l3"/><feFlood flood-color="#8B4513" flood-opacity="0.8" result="extColor"/><feComposite in="extColor" in2="l3" operator="in" result="e3"/><feComposite in="extColor" in2="l2" operator="in" result="e2"/><feComposite in="extColor" in2="l1" operator="in" result="e1"/><feMerge><feMergeNode in="e3"/><feMergeNode in="e2"/><feMergeNode in="e1"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="38" font-size="18" font-weight="bold" fill="#D2691E" filter="url(#pv-e3d)">Abc</text></svg>`,
};

const emboss3d: TextEffectPreset = {
  id: 'text-fx-emboss-3d',
  label: 'Emboss',
  category: '3d',
  description: 'Raised emboss effect with lighting.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/><feSpecularLighting in="blur" surfaceScale="5" specularConstant="0.75" specularExponent="20" lighting-color="#ffffff" result="spec"><feDistantLight azimuth="235" elevation="45"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in" result="lit"/><feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>`,
  filterAttributes: { x: '-5%', y: '-5%', width: '110%', height: '110%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-em" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/><feSpecularLighting in="blur" surfaceScale="5" specularConstant="0.75" specularExponent="20" lighting-color="#fff" result="spec"><feDistantLight azimuth="235" elevation="45"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in" result="lit"/><feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#7f8c8d" filter="url(#pv-em)">Abc</text></svg>`,
};

const retro3d: TextEffectPreset = {
  id: 'text-fx-retro-3d',
  label: 'Retro 3D',
  category: '3d',
  description: 'Classic red/blue 3D anaglyph effect.',
  filterContent: `<feOffset dx="-2" dy="0" in="SourceGraphic" result="red"/><feColorMatrix in="red" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redOnly"/><feOffset dx="2" dy="0" in="SourceGraphic" result="cyan"/><feColorMatrix in="cyan" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyanOnly"/><feBlend in="redOnly" in2="cyanOnly" mode="screen"/>`,
  filterAttributes: { x: '-10%', y: '-5%', width: '120%', height: '110%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-r3d" x="-10%" y="-5%" width="120%" height="110%"><feOffset dx="-2" dy="0" in="SourceGraphic" result="red"/><feColorMatrix in="red" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redOnly"/><feOffset dx="2" dy="0" in="SourceGraphic" result="cyan"/><feColorMatrix in="cyan" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyanOnly"/><feBlend in="redOnly" in2="cyanOnly" mode="screen"/></filter></defs><text x="10" y="40" font-size="18" font-weight="bold" fill="#fff" filter="url(#pv-r3d)">Abc</text></svg>`,
};

// ── Distortion presets ──────────────────────────────────────────

const waveDistort: TextEffectPreset = {
  id: 'text-fx-wave-distort',
  label: 'Wave',
  category: 'distortion',
  description: 'Rippling wave distortion on text.',
  filterContent: `<feTurbulence type="turbulence" baseFrequency="0.015 0.08" numOctaves="2" seed="3" result="turbulence"/><feDisplacementMap in="SourceGraphic" in2="turbulence" scale="8" xChannelSelector="R" yChannelSelector="G"/>`,
  filterAttributes: { x: '-10%', y: '-10%', width: '120%', height: '120%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-wd" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="turbulence" baseFrequency="0.015 0.08" numOctaves="2" seed="3" result="turbulence"><animate attributeName="seed" dur="4s" repeatCount="indefinite" values="1;10;1"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="turbulence" scale="8" xChannelSelector="R" yChannelSelector="G"/></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#2196f3" filter="url(#pv-wd)">Abc</text></svg>`,
};

const glitchDistort: TextEffectPreset = {
  id: 'text-fx-glitch',
  label: 'Glitch Distort',
  category: 'distortion',
  description: 'Digital glitch / data corruption effect.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves="1" seed="0" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="B"/>`,
  filterAttributes: { x: '-10%', y: '-10%', width: '120%', height: '120%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-gl" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves="1" result="noise"><animate attributeName="seed" dur="0.5s" repeatCount="indefinite" values="0;100;50;75;0" calcMode="discrete"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="B"/></filter></defs><text x="10" y="40" font-size="18" font-weight="bold" fill="#00ff00" filter="url(#pv-gl)">Abc</text></svg>`,
};

const meltDistort: TextEffectPreset = {
  id: 'text-fx-melt',
  label: 'Melt',
  category: 'distortion',
  description: 'Melting / dripping text effect.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.04 0.01" numOctaves="3" seed="2" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G"/>`,
  filterAttributes: { x: '-10%', y: '-10%', width: '120%', height: '130%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-ml" x="-10%" y="-10%" width="120%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.04 0.01" numOctaves="3" seed="2" result="noise"><animate attributeName="seed" dur="3s" repeatCount="indefinite" values="2;8;2"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G"/></filter></defs><text x="8" y="38" font-size="18" font-weight="bold" fill="#9b59b6" filter="url(#pv-ml)">Abc</text></svg>`,
};

// ── Artistic presets ────────────────────────────────────────────

const sketch: TextEffectPreset = {
  id: 'text-fx-sketch',
  label: 'Sketch',
  category: 'artistic',
  description: 'Hand-drawn sketch look.',
  filterContent: `<feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" seed="1" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced"/><feMorphology in="displaced" operator="erode" radius="0.3" result="thin"/><feGaussianBlur in="thin" stdDeviation="0.3"/>`,
  filterAttributes: { x: '-5%', y: '-5%', width: '110%', height: '110%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-sk" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" seed="1" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="displaced"/><feMorphology in="displaced" operator="erode" radius="0.3" result="thin"/><feGaussianBlur in="thin" stdDeviation="0.3"/></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#2c3e50" filter="url(#pv-sk)">Abc</text></svg>`,
};

const vintage: TextEffectPreset = {
  id: 'text-fx-vintage',
  label: 'Vintage',
  category: 'artistic',
  description: 'Aged vintage letterpress style.',
  filterContent: `<feColorMatrix type="matrix" values="0.9 0.1 0.1 0 0.05  0.1 0.8 0.1 0 0.02  0.05 0.1 0.6 0 0  0 0 0 1 0" result="sepia"/><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="5" result="grain"/><feColorMatrix in="grain" type="saturate" values="0" result="grayGrain"/><feBlend in="sepia" in2="grayGrain" mode="multiply"/>`,
  filterAttributes: { x: '0%', y: '0%', width: '100%', height: '100%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-vi" x="0%" y="0%" width="100%" height="100%"><feColorMatrix type="matrix" values="0.9 0.1 0.1 0 0.05  0.1 0.8 0.1 0 0.02  0.05 0.1 0.6 0 0  0 0 0 1 0" result="sepia"/><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="5" result="grain"/><feColorMatrix in="grain" type="saturate" values="0" result="grayGrain"/><feBlend in="sepia" in2="grayGrain" mode="multiply"/></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#8B4513" filter="url(#pv-vi)">Abc</text></svg>`,
};

const chalkClassic: TextEffectPreset = {
  id: 'text-fx-chalk',
  label: 'Chalk Classic',
  category: 'artistic',
  description: 'Chalkboard-style text.',
  filterContent: `<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" seed="7" result="chalk"/><feColorMatrix in="chalk" type="saturate" values="0" result="grayCh"/><feComposite in="SourceGraphic" in2="grayCh" operator="in" result="chalked"/><feGaussianBlur in="chalked" stdDeviation="0.2"/>`,
  filterAttributes: { x: '-2%', y: '-2%', width: '104%', height: '104%' },
  preserveColors: true,
  preserveSourceFill: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#2d5016" rx="3"/><defs><filter id="pv-ch" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" seed="7" result="chalk"/><feColorMatrix in="chalk" type="saturate" values="0" result="grayCh"/><feComposite in="SourceGraphic" in2="grayCh" operator="in" result="chalked"/><feGaussianBlur in="chalked" stdDeviation="0.2"/></filter></defs><text x="8" y="42" font-size="18" font-weight="bold" fill="#fff" filter="url(#pv-ch)">Abc</text></svg>`,
};

// ── Animated presets ────────────────────────────────────────────

const pulseScale: TextEffectPreset = {
  id: 'text-fx-pulse',
  label: 'Pulse',
  category: 'animated',
  description: 'Rhythmic pulsating scale animation.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/><feFlood flood-color="#e91e63" flood-opacity="0.4" result="glowColor"/><feComposite in="glowColor" in2="blur" operator="in" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-15%', y: '-15%', width: '130%', height: '130%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-pu" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/><feFlood flood-color="#e91e63" flood-opacity="0.4" result="glowColor"/><feComposite in="glowColor" in2="blur" operator="in" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="34" y="40" font-size="16" font-weight="bold" fill="#e91e63" text-anchor="middle" filter="url(#pv-pu)">Abc<animateTransform attributeName="transform" type="scale" dur="1.2s" repeatCount="indefinite" values="1;1.12;1" additive="sum"/></text></svg>`,
};

const flickerEffect: TextEffectPreset = {
  id: 'text-fx-flicker',
  label: 'Flicker',
  category: 'animated',
  description: 'Flickering neon sign effect.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/><feFlood flood-color="#ff00ff" flood-opacity="0.7" result="glowColor"/><feComposite in="glowColor" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-20%', y: '-20%', width: '140%', height: '140%' },
  preserveColors: true,
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="#111122"/><defs><filter id="pv-fl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/><feFlood flood-color="#ff00ff" flood-opacity="0.7" result="glowColor"/><feComposite in="glowColor" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#ff00ff" filter="url(#pv-fl)">Abc<animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="1;1;0.3;1;1;0.1;1;1;1;0.4;1" calcMode="discrete" keyTimes="0;0.1;0.12;0.14;0.4;0.42;0.44;0.6;0.8;0.82;1"/></text></svg>`,
};

const scanLines: TextEffectPreset = {
  id: 'text-fx-scanlines',
  label: 'Scanlines',
  category: 'animated',
  description: 'CRT monitor scanline effect.',
  filterContent: `<feTurbulence type="turbulence" baseFrequency="0 0.7" numOctaves="1" seed="0" result="lines"/><feColorMatrix in="lines" type="saturate" values="0" result="grayLines"/><feComponentTransfer in="grayLines"><feFuncA type="discrete" tableValues="0 1 0 1"/></feComponentTransfer><feComposite in="SourceGraphic" operator="in"/>`,
  filterAttributes: { x: '0%', y: '0%', width: '100%', height: '100%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-sc" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0 0.7" numOctaves="1" seed="0" result="lines"/><feColorMatrix in="lines" type="saturate" values="0" result="grayLines"/><feComponentTransfer in="grayLines"><feFuncA type="discrete" tableValues="0 1 0 1"/></feComponentTransfer><feComposite in="SourceGraphic" operator="in"/></filter></defs><text x="8" y="40" font-family="monospace" font-size="16" font-weight="bold" fill="#00ff00" filter="url(#pv-sc)">Abc<animate attributeName="opacity" dur="0.08s" repeatCount="indefinite" values="0.95;1;0.95"/></text></svg>`,
};

const breathe: TextEffectPreset = {
  id: 'text-fx-breathe',
  label: 'Breathe',
  category: 'animated',
  description: 'Gentle breathing opacity animation.',
  filterContent: `<feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/><feFlood flood-color="#4fc3f7" flood-opacity="0.4" result="g"/><feComposite in="g" in2="blur" operator="in" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge>`,
  filterAttributes: { x: '-10%', y: '-10%', width: '120%', height: '120%' },
  previewSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><defs><filter id="pv-br" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/><feFlood flood-color="#4fc3f7" flood-opacity="0.4" result="g"/><feComposite in="g" in2="blur" operator="in" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><text x="8" y="40" font-size="18" font-weight="bold" fill="#4fc3f7" filter="url(#pv-br)">Abc<animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0.4;1;0.4"/></text></svg>`,
};

// ── Export ───────────────────────────────────────────────────────

export const TEXT_EFFECT_PRESETS: TextEffectPreset[] = [
  // textfx.svg — animated
  energy,
  neon,
  glitch,
  fire,
  liquidMetal,
  smoke,
  reveal,
  outlinePulse,
  chromeScan,
  ghostEcho,
  signal,
  crystalPrism,
  warpWave,
  aurora,
  stencilCut,
  ember,
  ice,
  radar,
  inkBleed,
  hologram,
  // textfx.svg — static
  silverBevel,
  goldFoil,
  glassFrost,
  blueprint,
  letterpress,
  halftone,
  inlineShadow,
  chalkStatic,
  carbonFiber,
  cutout,
  neonOutline,
  stripedMetal,
  velvet,
  inkStamp,
  ceramic,
  xray,
  mosaicClip,
  dualTone,
  paperCut,
  signalStatic,
  // Original filter presets
  dropShadow,
  longShadow,
  innerShadow,
  neonGlow,
  softGlowPreset,
  fireGlow,
  strokeOutline,
  doubleOutline,
  extruded3d,
  emboss3d,
  retro3d,
  waveDistort,
  glitchDistort,
  meltDistort,
  sketch,
  vintage,
  chalkClassic,
  pulseScale,
  flickerEffect,
  scanLines,
  breathe,
];
