/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { generateShortId } from '../../utils/idGenerator';

export type FilterType = 'blur' | 'glow' | 'shadow' | 'wave' | 'custom';

export interface FilterDefinition {
  id: string;
  type: FilterType;
  value: number;
  svg: string;
}

const parseImportedFilterSvg = (svg: string): Element | null => {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
    'image/svg+xml'
  );

  const filter = doc.querySelector('filter');
  return filter;
};

const ImportedFilterElement: React.FC<{ svg: string }> = ({ svg }) => {
  const placeholderRef = React.useRef<SVGGElement>(null);
  const insertedRef = React.useRef<SVGFilterElement | null>(null);
  const parsed = React.useMemo(() => parseImportedFilterSvg(svg), [svg]);

  React.useLayoutEffect(() => {
    const placeholder = placeholderRef.current;
    const parent = placeholder?.parentElement;
    if (!placeholder || !parent || !parsed) {
      return;
    }

    if (insertedRef.current?.parentElement) {
      insertedRef.current.parentElement.removeChild(insertedRef.current);
      insertedRef.current = null;
    }

    const imported = document.importNode(parsed, true) as SVGFilterElement;
    parent.insertBefore(imported, placeholder);
    insertedRef.current = imported;

    return () => {
      if (insertedRef.current?.parentElement) {
        insertedRef.current.parentElement.removeChild(insertedRef.current);
      }
      insertedRef.current = null;
    };
  }, [parsed]);

  return <g ref={placeholderRef} style={{ display: 'none' }} />;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const renderBlur = (id: string, std: number) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation={std.toFixed(2)} />
  </filter>
);

const renderGlow = (id: string, std: number) => (
  <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation={std.toFixed(2)} result="coloredBlur" />
    <feMerge>
      <feMergeNode in="coloredBlur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

const renderShadow = (id: string, std: number, dx: number, dy: number) => (
  <filter id={id} x="-30%" y="-30%" width="180%" height="180%">
    <feDropShadow dx={dx.toFixed(2)} dy={dy.toFixed(2)} stdDeviation={std.toFixed(2)} floodOpacity="0.35" />
  </filter>
);

const renderWave = (id: string, scale: number) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale.toFixed(2)} xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

export const buildFilterDefinition = (type: FilterType, value: number): FilterDefinition => {
  if (type === 'custom') {
    return {
      id: generateShortId('filter-custom'),
      type,
      value,
      svg: '',
    };
  }
  const safeValue = clamp(value, 0, 100);
  const id = `filter-${type}-${Math.round(safeValue * 10)}`;

  if (type === 'blur') {
    const std = (safeValue / 100) * 8 + 1;
    return {
      id,
      type,
      value: safeValue,
      svg: `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${std.toFixed(2)}" /></filter>`
    };
  }

  if (type === 'glow') {
    const std = (safeValue / 100) * 6 + 2;
    return {
      id,
      type,
      value: safeValue,
      svg: `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${std.toFixed(2)}" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    };
  }

  if (type === 'shadow') {
    const std = (safeValue / 100) * 5 + 1.5;
    const dx = (safeValue / 100) * 6;
    const dy = (safeValue / 100) * 6;
    return {
      id,
      type,
      value: safeValue,
      svg: `<filter id="${id}" x="-30%" y="-30%" width="180%" height="180%"><feDropShadow dx="${dx.toFixed(2)}" dy="${dy.toFixed(2)}" stdDeviation="${std.toFixed(2)}" flood-opacity="0.35"/></filter>`
    };
  }

  const scale = (safeValue / 100) * 20 + 5;
  return {
    id,
    type,
    value: safeValue,
    svg: `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale.toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/></filter>`
  };
};

export const serializeFilterDefs = (defs: FilterDefinition[], usedIds: Set<string>): string[] => {
  const selected = usedIds.size > 0 ? defs.filter(def => usedIds.has(def.id)) : defs;
  return selected.map(def => def.svg);
};

export const renderFilterElement = (def: FilterDefinition): React.ReactElement => {
  // For custom filters (including animated imports), render the raw SVG using the SVG parser
  if (def.type === 'custom' || def.svg.includes('<animate') || def.svg.includes('<animateTransform') || def.svg.includes('<set')) {
    return <ImportedFilterElement svg={def.svg} />;
  }
  if (def.type === 'blur') {
    const std = (def.value / 100) * 8 + 1;
    return renderBlur(def.id, std);
  }
  if (def.type === 'glow') {
    const std = (def.value / 100) * 6 + 2;
    return renderGlow(def.id, std);
  }
  if (def.type === 'shadow') {
    const std = (def.value / 100) * 5 + 1.5;
    const dx = (def.value / 100) * 6;
    const dy = (def.value / 100) * 6;
    return renderShadow(def.id, std, dx, dy);
  }
  const scale = (def.value / 100) * 20 + 5;
  return renderWave(def.id, scale);
};
