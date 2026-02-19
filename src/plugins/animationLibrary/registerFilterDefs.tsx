import React from 'react';
import type { CanvasElement } from '../../types';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';

// Map of filter ID to its JSX definition
const filterDefinitions: Record<string, () => React.ReactNode> = {
  'filter-glow-400': () => (
    <filter id="filter-glow-400" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4.4" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  ),
  'filter-blur-pulse': () => (
    <filter id="filter-blur-pulse" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0">
        <animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite"
          values="0;4;0" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feGaussianBlur>
    </filter>
  ),
  'filter-glow-pulse': () => (
    <filter id="filter-glow-pulse" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur">
        <animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite"
          values="2;6;2" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feGaussianBlur>
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  ),
  'filter-shadow-pulse': () => (
    <filter id="filter-shadow-pulse" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4">
        <animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite"
          values="2;5;2" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feDropShadow>
    </filter>
  ),
  'filter-grayscale-pulse': () => (
    <filter id="filter-grayscale-pulse" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix type="saturate" values="1">
        <animate attributeName="values" dur="3s" repeatCount="indefinite"
          values="1;0;1" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feColorMatrix>
    </filter>
  ),
  'filter-sepia-pulse': () => (
    <filter id="filter-sepia-pulse" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0">
        <animate attributeName="values" dur="3s" repeatCount="indefinite"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0;0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
          keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feColorMatrix>
    </filter>
  ),
  'filter-hue-rotate': () => (
    <filter id="filter-hue-rotate" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix type="hueRotate" values="0">
        <animate attributeName="values" dur="4s" repeatCount="indefinite"
          values="0;360" calcMode="linear" />
      </feColorMatrix>
    </filter>
  ),
  'filter-brightness-flash': () => (
    <filter id="filter-brightness-flash" x="-10%" y="-10%" width="120%" height="120%">
      <feComponentTransfer>
        <feFuncR type="linear" slope="1">
          <animate attributeName="slope" dur="0.5s" repeatCount="indefinite" values="1;2;1" keyTimes="0;0.5;1" />
        </feFuncR>
        <feFuncG type="linear" slope="1">
          <animate attributeName="slope" dur="0.5s" repeatCount="indefinite" values="1;2;1" keyTimes="0;0.5;1" />
        </feFuncG>
        <feFuncB type="linear" slope="1">
          <animate attributeName="slope" dur="0.5s" repeatCount="indefinite" values="1;2;1" keyTimes="0;0.5;1" />
        </feFuncB>
      </feComponentTransfer>
    </filter>
  ),
  'filter-contrast-pulse': () => (
    <filter id="filter-contrast-pulse" x="-10%" y="-10%" width="120%" height="120%">
      <feComponentTransfer>
        <feFuncR type="linear" slope="1" intercept="0">
          <animate attributeName="slope" dur="2s" repeatCount="indefinite" values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
          <animate attributeName="intercept" dur="2s" repeatCount="indefinite" values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
        </feFuncR>
        <feFuncG type="linear" slope="1" intercept="0">
          <animate attributeName="slope" dur="2s" repeatCount="indefinite" values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
          <animate attributeName="intercept" dur="2s" repeatCount="indefinite" values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
        </feFuncG>
        <feFuncB type="linear" slope="1" intercept="0">
          <animate attributeName="slope" dur="2s" repeatCount="indefinite" values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
          <animate attributeName="intercept" dur="2s" repeatCount="indefinite" values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
        </feFuncB>
      </feComponentTransfer>
    </filter>
  ),
  'filter-invert-flash': () => (
    <filter id="filter-invert-flash" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0">
        <animate attributeName="values" dur="1s" repeatCount="indefinite"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0;-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
          keyTimes="0;0.5;1" calcMode="discrete" />
      </feColorMatrix>
    </filter>
  ),
  'filter-turbulence-ripple': () => (
    <filter id="filter-turbulence-ripple" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves={2} result="turbulence">
        <animate attributeName="baseFrequency" dur="3s" repeatCount="indefinite"
          values="0.02;0.05;0.02" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="5" xChannelSelector="R" yChannelSelector="G">
        <animate attributeName="scale" dur="3s" repeatCount="indefinite"
          values="5;15;5" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feDisplacementMap>
    </filter>
  ),
  'filter-breathing-glow': () => (
    <filter id="filter-breathing-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur">
        <animate attributeName="stdDeviation" dur="4s" repeatCount="indefinite"
          values="3;6;3" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
      </feGaussianBlur>
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  ),
};

// Map of filter ID to its serialized string definition
const filterSerializations: Record<string, string> = {
  'filter-glow-400': '<filter id="filter-glow-400" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4.4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
  'filter-blur-pulse': '<filter id="filter-blur-pulse" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0"><animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite" values="0;4;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feGaussianBlur></filter>',
  'filter-glow-pulse': '<filter id="filter-glow-pulse" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="coloredBlur"><animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite" values="2;6;2" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feGaussianBlur><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
  'filter-shadow-pulse': '<filter id="filter-shadow-pulse" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"><animate attributeName="stdDeviation" dur="2s" repeatCount="indefinite" values="2;5;2" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feDropShadow></filter>',
  'filter-grayscale-pulse': '<filter id="filter-grayscale-pulse" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="saturate" values="1"><animate attributeName="values" dur="3s" repeatCount="indefinite" values="1;0;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feColorMatrix></filter>',
  'filter-sepia-pulse': '<filter id="filter-sepia-pulse" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"><animate attributeName="values" dur="3s" repeatCount="indefinite" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0;0.393 0.769 0.189 0 0  0.349 0.686 0.168 0 0  0.272 0.534 0.131 0 0  0 0 0 1 0;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feColorMatrix></filter>',
  'filter-hue-rotate': '<filter id="filter-hue-rotate" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="hueRotate" values="0"><animate attributeName="values" dur="4s" repeatCount="indefinite" values="0;360" calcMode="linear"/></feColorMatrix></filter>',
  'filter-brightness-flash': '<filter id="filter-brightness-flash" x="-10%" y="-10%" width="120%" height="120%"><feComponentTransfer><feFuncR type="linear" slope="1"><animate attributeName="slope" dur="0.5s" repeatCount="indefinite" values="1;2;1" keyTimes="0;0.5;1"/></feFuncR><feFuncG type="linear" slope="1"><animate attributeName="slope" dur="0.5s" repeatCount="indefinite" values="1;2;1" keyTimes="0;0.5;1"/></feFuncG><feFuncB type="linear" slope="1"><animate attributeName="slope" dur="0.5s" repeatCount="indefinite" values="1;2;1" keyTimes="0;0.5;1"/></feFuncB></feComponentTransfer></filter>',
  'filter-contrast-pulse': '<filter id="filter-contrast-pulse" x="-10%" y="-10%" width="120%" height="120%"><feComponentTransfer><feFuncR type="linear" slope="1" intercept="0"><animate attributeName="slope" dur="2s" repeatCount="indefinite" values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/><animate attributeName="intercept" dur="2s" repeatCount="indefinite" values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feFuncR><feFuncG type="linear" slope="1" intercept="0"><animate attributeName="slope" dur="2s" repeatCount="indefinite" values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/><animate attributeName="intercept" dur="2s" repeatCount="indefinite" values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feFuncG><feFuncB type="linear" slope="1" intercept="0"><animate attributeName="slope" dur="2s" repeatCount="indefinite" values="1;1.5;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/><animate attributeName="intercept" dur="2s" repeatCount="indefinite" values="0;-0.25;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feFuncB></feComponentTransfer></filter>',
  'filter-invert-flash': '<filter id="filter-invert-flash" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"><animate attributeName="values" dur="1s" repeatCount="indefinite" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0;-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" keyTimes="0;0.5;1" calcMode="discrete"/></feColorMatrix></filter>',
  'filter-turbulence-ripple': '<filter id="filter-turbulence-ripple" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="turbulence"><animate attributeName="baseFrequency" dur="3s" repeatCount="indefinite" values="0.02;0.05;0.02" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="turbulence" scale="5" xChannelSelector="R" yChannelSelector="G"><animate attributeName="scale" dur="3s" repeatCount="indefinite" values="5;15;5" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feDisplacementMap></filter>',
  'filter-breathing-glow': '<filter id="filter-breathing-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur"><animate attributeName="stdDeviation" dur="4s" repeatCount="indefinite" values="3;6;3" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"/></feGaussianBlur><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
};

/**
 * Extract filter ID from a value that might be a url(#filter-...) reference
 */
function extractFilterIdFromValue(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const str = String(value);
  if (str.startsWith('url(#filter-') && str.endsWith(')')) {
    const match = str.match(/url\(#(filter-[^)]+)\)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Collect filter IDs used by animations on elements.
 * Scans the animations array for filter references in the 'to' attribute.
 */
function collectFilterIdsFromAnimations(
  elements: CanvasElement[],
  animations: unknown[] | undefined
): Set<string> {
  const usedIds = new Set<string>();

  if (!animations || animations.length === 0) {
    return usedIds;
  }

  // Build element ID set for quick lookup
  const elementIds = new Set(elements.map(el => el.id));

  // Scan animations for filter references
  for (const anim of animations) {
    const animObj = anim as Record<string, unknown>;
    const targetId = animObj.targetElementId as string | undefined;

    // Only count animations targeting existing elements
    if (targetId && !elementIds.has(targetId)) {
      continue;
    }

    // Check 'to' attribute for filter reference
    const toValue = animObj.to as string | number | undefined;
    const filterId = extractFilterIdFromValue(toValue);
    if (filterId && filterDefinitions[filterId]) {
      usedIds.add(filterId);
    }

    // Check 'values' attribute (might contain filter references)
    const valuesValue = animObj.values;
    if (typeof valuesValue === 'string') {
      // Values are separated by semicolons
      for (const part of valuesValue.split(';')) {
        const filterId = extractFilterIdFromValue(part.trim());
        if (filterId && filterDefinitions[filterId]) {
          usedIds.add(filterId);
        }
      }
    }
  }

  return usedIds;
}

/**
 * Register the defs contribution for animation library filters.
 * This is called once at initialization and collects filters from animations.
 */
function registerAnimationFilterDefs(): void {
  defsContributionRegistry.register({
    id: 'animation-library-filters',
    collectUsedIds: (elements) => {
      // Scan animations for filter references
      // Access state through store API since collectUsedIds doesn't receive state
      const state = canvasStoreApi.getState();
      const animations = (state as unknown as { animations?: unknown[] }).animations ?? [];
      return collectFilterIdsFromAnimations(elements, animations);
    },
    renderDefs: (_state, usedIds) => {
      if (usedIds.size === 0) return null;
      const filters: React.ReactNode[] = [];
      for (const id of usedIds) {
        if (filterDefinitions[id]) {
          filters.push(<React.Fragment key={id}>{filterDefinitions[id]()}</React.Fragment>);
        }
      }
      if (filters.length === 0) return null;
      return <>{filters}</>;
    },
    serializeDefs: (_state, usedIds) => {
      if (usedIds.size === 0) return [];
      const defs: string[] = [];
      for (const id of usedIds) {
        if (filterSerializations[id]) {
          defs.push(filterSerializations[id]);
        }
      }
      return defs;
    },
  });
}

// Register the contribution on module load
registerAnimationFilterDefs();
