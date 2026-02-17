import { Layers } from 'lucide-react';
import type {
  PluginDefinition,
  PluginSliceFactory,
  SvgDefsEditor,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { isMonoColor, transformMonoColor } from '../../utils/colorModeSyncUtils';
import { createSymbolsSlice, type SymbolDefinition, type SymbolPluginSlice } from './slice';
import { SymbolsPanel } from './SymbolsPanel';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import type { CanvasElement } from '../../types';
import type { CanvasElementRenderer, CanvasRenderContext } from '../../canvas/renderers/CanvasRendererRegistry';
import type { ElementContribution } from '../../utils/elementContributionRegistry';
import type { SymbolInstanceElement, SymbolInstanceData, Matrix } from './types';
import { commandsToString } from '../../utils/pathParserUtils';
import { parsePathD } from '../../utils/pathParserUtils';
import { measurePath } from '../../utils/measurementUtils';
import { generateShortId } from '../../utils/idGenerator';
import { useSymbolPlacementHook } from './hooks/useSymbolPlacementHook';
import { importUse } from './importer';
import { Box, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { registerStateKeys } from '../../store/persistenceRegistry';
import type React from 'react';

registerStateKeys('symbols', ['symbols'], 'persist');
import { useCanvasStore } from '../../store/canvasStore';
import type { WireframePluginSlice } from '../wireframe/slice';
import { renderAnimationsForElement } from '../animationSystem/renderAnimations';
import type { AnimationState, SVGAnimation } from '../animationSystem/types';
import { getInitialAnimationAttributes } from '../animationSystem/renderAnimations';
import { serializeAnimation } from '../animationSystem';
import type { AnimationPluginSlice } from '../animationSystem/types';
import { ensureChainDelays } from '../animationSystem/chainUtils';
import './importContribution';

const symbolsSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createSymbolsSlice(set, get, api),
});

/**
 * Strip animation elements from a node's innerHTML.
 * Animations are imported separately by the animation system.
 */
const stripAnimationsFromContent = (node: Element): string => {
  const clone = node.cloneNode(true) as Element;
  const animationSelectors = 'animate, animateTransform, animateMotion, animateColor, set';
  clone.querySelectorAll(animationSelectors).forEach((el) => el.remove());
  return clone.innerHTML;
};

/**
 * Helper to parse and manipulate symbol rawContent
 */
const parseSymbolContent = (rawContent: string): Document | null => {
  if (typeof DOMParser === 'undefined') return null;
  const parser = new DOMParser();
  // Wrap in a container to handle multiple root elements
  const doc = parser.parseFromString(`<root>${rawContent}</root>`, 'application/xml');
  if (doc.querySelector('parsererror')) return null;
  return doc;
};

const serializeSymbolContent = (doc: Document): string => {
  const root = doc.querySelector('root');
  if (!root) return '';
  // Get innerHTML without the wrapper
  return Array.from(root.childNodes)
    .map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const serializer = new XMLSerializer();
        return serializer.serializeToString(node);
      }
      return node.textContent ?? '';
    })
    .join('\n      ');
};

const findChildElementByIndex = (doc: Document, childIndex: number): Element | null => {
  const root = doc.querySelector('root');
  if (!root) return null;
  const elements = Array.from(root.children);
  return elements[childIndex] ?? null;
};

/**
 * Injects animations into symbol rawContent for child elements
 * Returns the modified rawContent with animations appended to target elements
 * @param idPrefix - Optional prefix to add to animation IDs (useful for preview to avoid conflicts)
 */
export const injectAnimationsIntoSymbolContent = (
  rawContent: string,
  symbolId: string,
  animations: SVGAnimation[],
  chainDelays: Map<string, number>,
  animationState?: AnimationState,
  idPrefix?: string
): string => {
  // Only inject if animations should render
  const allowRender = animationState
    ? (animationState.isPlaying || animationState.hasPlayed || animationState.isWorkspaceOpen)
    : true;
  if (!allowRender) return rawContent;

  // Find animations targeting this symbol's children
  const symbolAnimations = animations.filter((anim) =>
    anim.symbolTargetId === symbolId && anim.symbolChildIndex !== undefined
  );
  if (symbolAnimations.length === 0) return rawContent;

  // Group animations by child index
  const animsByChild = new Map<number, SVGAnimation[]>();
  symbolAnimations.forEach((anim) => {
    const idx = anim.symbolChildIndex!;
    if (!animsByChild.has(idx)) {
      animsByChild.set(idx, []);
    }
    animsByChild.get(idx)!.push(anim);
  });

  // Parse content
  const doc = parseSymbolContent(rawContent);
  if (!doc) return rawContent;

  // Inject animations into each target element
  animsByChild.forEach((anims, childIndex) => {
    const targetElement = findChildElementByIndex(doc, childIndex);
    if (!targetElement) return;

    // Serialize each animation and append to the target element
    anims.forEach((anim) => {
      // If idPrefix is provided, create a modified animation with prefixed ID
      const animToSerialize = idPrefix && anim.id 
        ? { ...anim, id: `${idPrefix}${anim.id}` }
        : anim;
      const animHtml = serializeAnimation(animToSerialize, chainDelays);
      if (animHtml) {
        // Parse the animation HTML and append to target
        const animDoc = new DOMParser().parseFromString(`<root>${animHtml}</root>`, 'application/xml');
        const animElement = animDoc.querySelector('root')?.firstElementChild;
        if (animElement) {
          const imported = doc.importNode(animElement, true);
          targetElement.appendChild(imported);
        }
      }
    });
  });

  return serializeSymbolContent(doc);
};

/**
 * Defs editor for symbol elements in the structure panel
 */
const symbolDefsEditor: SvgDefsEditor<CanvasStore> = {
  id: 'symbols-editor',
  appliesTo: (node) => {
    if (!node.isDefs || !node.defsOwnerId) return false;
    // Match symbol elements or their children (path, use, circle, rect, etc.)
    if (node.tagName === 'symbol') return true;
    // Check if parent is a symbol by looking at defsOwnerId
    const ownerId = node.defsOwnerId;
    return ownerId?.startsWith('symbol-') || false;
  },
  mapAttributeNameToDataKey: (name, current) => {
    const normalized = name.toLowerCase();
    const map: Record<string, string> = {
      'viewbox': 'viewBox',
      'preserveaspectratio': 'preserveAspectRatio',
      'preserve-aspect-ratio': 'preserveAspectRatio',
    };
    const mapped = map[normalized];
    if (mapped) return mapped;
    const camel = normalized.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
    if (camel in current) return camel;
    return normalized;
  },
  update: ({ store, node, attrName, rawValue }) => {
    const symbolState = store as unknown as SymbolPluginSlice;
    // Get symbol ID from defsOwnerId (format: "symbol-<id>")
    const defsOwnerId = node.defsOwnerId ?? node.idAttribute;
    const symbolId = defsOwnerId?.replace(/^symbol-/, '') ?? defsOwnerId;
    const symbol = (symbolState.symbols ?? []).find((s) => s.id === symbolId);
    const updateSymbol = symbolState.updateSymbol;
    if (!symbol || !updateSymbol) return false;

    // Handle symbol-level attributes
    if (node.tagName === 'symbol') {
      const dataKey = symbolDefsEditor.mapAttributeNameToDataKey?.(attrName, symbol as unknown as Record<string, unknown>) ?? attrName;
      if (dataKey === 'name') {
        updateSymbol(symbol.id, { name: rawValue });
        return true;
      }
      // For viewBox and other symbol attributes, update the symbol directly if applicable
      if (dataKey === 'viewBox') {
        const parts = rawValue.split(/\s+/).map(parseFloat);
        if (parts.length === 4 && parts.every((p) => Number.isFinite(p))) {
          updateSymbol(symbol.id, {
            bounds: {
              minX: parts[0],
              minY: parts[1],
              width: parts[2],
              height: parts[3],
            },
          });
          return true;
        }
      }
      return false;
    }

    // Handle child element attributes (circle, path, etc. inside symbol rawContent)
    if (symbol.rawContent && node.childIndex !== undefined) {
      const doc = parseSymbolContent(symbol.rawContent);
      if (!doc) return false;

      const childEl = findChildElementByIndex(doc, node.childIndex);
      if (!childEl) return false;

      childEl.setAttribute(attrName, rawValue);
      const newContent = serializeSymbolContent(doc);
      updateSymbol(symbol.id, { rawContent: newContent });
      return true;
    }

    return false;
  },
  updateChild: ({ store, node, attrName, rawValue }) => {
    // Delegate to update for child elements
    return symbolDefsEditor.update({ store, node, attrName, rawValue });
  },
  addChild: ({ store, node, position }) => {
    const symbolState = store as unknown as SymbolPluginSlice;
    const defsOwnerId = node.defsOwnerId ?? node.idAttribute;
    const symbolId = defsOwnerId?.replace(/^symbol-/, '') ?? defsOwnerId;
    const symbol = (symbolState.symbols ?? []).find((s) => s.id === symbolId);
    const updateSymbol = symbolState.updateSymbol;
    if (!symbol || !updateSymbol || !symbol.rawContent) return false;

    const doc = parseSymbolContent(symbol.rawContent);
    if (!doc) return false;

    const root = doc.querySelector('root');
    if (!root) return false;

    // Create a new default element (circle)
    const newElement = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    newElement.setAttribute('r', '10');
    newElement.setAttribute('fill', '#cccccc');

    const elements = Array.from(root.children);
    const insertAt = position ?? elements.length;
    if (insertAt >= elements.length) {
      root.appendChild(newElement);
    } else {
      root.insertBefore(newElement, elements[insertAt]);
    }

    const newContent = serializeSymbolContent(doc);
    updateSymbol(symbol.id, { rawContent: newContent });
    return true;
  },
  removeChild: ({ store, node }) => {
    const symbolState = store as unknown as SymbolPluginSlice;
    const defsOwnerId = node.defsOwnerId ?? node.idAttribute;
    const symbolId = defsOwnerId?.replace(/^symbol-/, '') ?? defsOwnerId;
    const symbol = (symbolState.symbols ?? []).find((s) => s.id === symbolId);
    const updateSymbol = symbolState.updateSymbol;
    if (!symbol || !updateSymbol) return false;

    // If trying to remove the symbol itself
    if (node.tagName === 'symbol') {
      symbolState.removeSymbol?.(symbol.id);
      return true;
    }

    // Remove child element from rawContent
    if (symbol.rawContent && node.childIndex !== undefined) {
      const doc = parseSymbolContent(symbol.rawContent);
      if (!doc) return false;

      const childEl = findChildElementByIndex(doc, node.childIndex);
      if (!childEl) return false;

      childEl.parentNode?.removeChild(childEl);
      const newContent = serializeSymbolContent(doc);
      updateSymbol(symbol.id, { rawContent: newContent });
      return true;
    }

    return false;
  },
  addAttribute: ({ store, node, attrName, rawValue }) => {
    return symbolDefsEditor.update({ store, node, attrName, rawValue });
  },
  removeAttribute: ({ store, node, attrName }) => {
    const symbolState = store as unknown as SymbolPluginSlice;
    const defsOwnerId = node.defsOwnerId ?? node.idAttribute;
    const symbolId = defsOwnerId?.replace(/^symbol-/, '') ?? defsOwnerId;
    const symbol = (symbolState.symbols ?? []).find((s) => s.id === symbolId);
    const updateSymbol = symbolState.updateSymbol;
    if (!symbol || !updateSymbol) return false;

    // Remove attribute from child element in rawContent
    if (symbol.rawContent && node.childIndex !== undefined) {
      const doc = parseSymbolContent(symbol.rawContent);
      if (!doc) return false;

      const childEl = findChildElementByIndex(doc, node.childIndex);
      if (!childEl) return false;

      childEl.removeAttribute(attrName);
      const newContent = serializeSymbolContent(doc);
      updateSymbol(symbol.id, { rawContent: newContent });
      return true;
    }

    return false;
  },
  revisionSelector: (state) => (state as unknown as SymbolPluginSlice).symbols,
};

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const collectSymbolUsage = (elements: CanvasElement[]): Set<string> => {
  const usage = new Set<string>();
  elements.forEach((element) => {
    if (element.type !== 'symbolInstance') return;
    const data = element.data as SymbolInstanceData;
    if (data.symbolId) {
      usage.add(data.symbolId);
    }
  });
  return usage;
};

const renderSymbolNode = (
  symbol: SymbolDefinition,
  animations?: SVGAnimation[],
  chainDelays?: Map<string, number>,
  animationState?: AnimationState
) => {
  if (symbol.rawContent) {
    // Inject animations for child elements if available
    const content = (animations && chainDelays)
      ? injectAnimationsIntoSymbolContent(symbol.rawContent, symbol.id, animations, chainDelays, animationState)
      : symbol.rawContent;
    
    return (
      <symbol
        key={symbol.id}
        id={`symbol-${symbol.id}`}
        viewBox={`${symbol.bounds.minX} ${symbol.bounds.minY} ${symbol.bounds.width} ${symbol.bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  const pathD = commandsToString(symbol.pathData.subPaths.flat());
  const padding = 0; // Removed padding to avoid scaling issues
  const pd = symbol.pathData;

  return (
    <symbol
      key={symbol.id}
      id={`symbol-${symbol.id}`}
      viewBox={`${symbol.bounds.minX - padding} ${symbol.bounds.minY - padding} ${Math.max(symbol.bounds.width, 1) + 2 * padding} ${Math.max(symbol.bounds.height, 1) + 2 * padding}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
    >
      <path
        d={pathD}
        fill={pd.fillColor ?? 'none'}
        fillOpacity={pd.fillOpacity ?? 1}
        stroke={pd.strokeColor ?? 'none'}
        strokeWidth={pd.strokeWidth ?? 1}
        strokeOpacity={pd.strokeOpacity ?? 1}
      />
    </symbol>
  );
};

defsContributionRegistry.register({
  id: 'symbols',
  collectUsedIds: collectSymbolUsage,
  renderDefs: (state, usedIds) => {
    const symbolState = state as CanvasStore & SymbolPluginSlice;
    const symbols = symbolState.symbols ?? [];
    const filtered = symbols.filter((symbol) => usedIds.has(symbol.id));
    if (!filtered.length) return null;
    
    // Get animations for symbol children
    const animState = state as CanvasStore & AnimationPluginSlice;
    const animations = animState.animations ?? [];
    const chainDelays = animState.animationState?.chainDelays ? ensureChainDelays(animState.animationState.chainDelays) : new Map();
    const animationState = animState.animationState;
    
    return <>{filtered.map((s) => renderSymbolNode(s, animations, chainDelays, animationState))}</>;
  },
  serializeDefs: (state, usedIds) => {
    const symbolState = state as CanvasStore & SymbolPluginSlice;
    const symbols = symbolState.symbols ?? [];
    const filtered = symbols.filter((symbol) => usedIds.has(symbol.id));
    if (!filtered.length) return [];
    
    // Get animations for symbol children
    const animState = state as CanvasStore & AnimationPluginSlice;
    const animations = animState.animations ?? [];
    const chainDelays = animState.animationState?.chainDelays ? ensureChainDelays(animState.animationState.chainDelays) : new Map();
    const animationState = animState.animationState;
    
    return filtered
      .map((symbol) => {
        if (symbol.rawContent) {
          // Inject animations for child elements
          const content = injectAnimationsIntoSymbolContent(symbol.rawContent, symbol.id, animations, chainDelays, animationState);
          return `<symbol id="symbol-${symbol.id}" viewBox="${symbol.bounds.minX} ${symbol.bounds.minY} ${symbol.bounds.width} ${symbol.bounds.height}" preserveAspectRatio="xMidYMid meet" overflow="visible">${content}</symbol>`;
        }
        const pathD = commandsToString(symbol.pathData.subPaths.flat());
        const padding = 0;
        const pd = symbol.pathData;
        const attrs = [
          `d="${escapeAttr(pathD)}"`,
          `fill="${escapeAttr(pd.fillColor ?? 'none')}"`,
          `stroke="${escapeAttr(pd.strokeColor ?? 'none')}"`,
          `stroke-width="${pd.strokeWidth ?? 1}"`,
          `stroke-opacity="${pd.strokeOpacity ?? 1}"`,
        ].join(' ');
        return `<symbol id="symbol-${symbol.id}" viewBox="${symbol.bounds.minX - padding} ${symbol.bounds.minY - padding} ${Math.max(symbol.bounds.width, 1) + 2 * padding} ${Math.max(
          symbol.bounds.height,
          1
        ) + 2 * padding}" preserveAspectRatio="xMidYMid meet" overflow="visible"><path ${attrs} /></symbol>`;
      });
  },
});

const identityMatrix = (): Matrix => [1, 0, 0, 1, 0, 0];

const multiplyMatrix = (m1: Matrix, m2: Matrix): Matrix => [
  m1[0] * m2[0] + m1[2] * m2[1],
  m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3],
  m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
  m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
];

const translateMatrix = (tx: number, ty: number): Matrix => [1, 0, 0, 1, tx, ty];

const scaleMatrix = (sx: number, sy: number, cx: number, cy: number): Matrix => {
  return multiplyMatrix(
    multiplyMatrix(translateMatrix(cx, cy), [sx, 0, 0, sy, 0, 0]),
    translateMatrix(-cx, -cy)
  );
};

const rotateMatrix = (angleDegrees: number, cx: number, cy: number): Matrix => {
  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rot: Matrix = [cos, sin, -sin, cos, 0, 0];
  return multiplyMatrix(
    multiplyMatrix(translateMatrix(cx, cy), rot),
    translateMatrix(-cx, -cy)
  );
};

const ensurePositiveDimension = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 1;

const getInstanceDimensions = (data: SymbolInstanceData) => ({
  width: ensurePositiveDimension(data.width),
  height: ensurePositiveDimension(data.height),
});

const ensureMatrix = (data: SymbolInstanceData): Matrix => {
  if (Array.isArray(data.transformMatrix)) {
    return [...data.transformMatrix] as Matrix;
  }
  const t = data.transform ?? {
    translateX: 0,
    translateY: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };

  let matrix = identityMatrix();
  matrix = multiplyMatrix(translateMatrix(t.translateX ?? 0, t.translateY ?? 0), matrix);
  const { width, height } = getInstanceDimensions(data);
  matrix = multiplyMatrix(scaleMatrix(t.scaleX ?? 1, t.scaleY ?? 1, width / 2, height / 2), matrix);
  if (t.rotation) {
    matrix = multiplyMatrix(rotateMatrix(t.rotation, width / 2, height / 2), matrix);
  }

  return matrix;
};

type SymbolRendererOverrides = {
  strokeWidth?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  scaleStrokeWithZoom?: boolean;
  disableFilter?: boolean;
};

const serializeTransform = (data: SymbolInstanceData): string => {
  const transform = data.transform;
  if (!transform) {
    return '';
  }
  const { width, height } = getInstanceDimensions(data);
  const centerX = width / 2;
  const centerY = height / 2;
  const parts = [
    `translate(${transform.translateX ?? 0} ${transform.translateY ?? 0})`,
    `rotate(${transform.rotation ?? 0} ${centerX} ${centerY})`,
    `scale(${transform.scaleX ?? 1} ${transform.scaleY ?? 1})`,
  ];
  return parts.join(' ');
};

const applyMatrix = (pt: { x: number; y: number }, matrix: Matrix) => ({
  x: matrix[0] * pt.x + matrix[2] * pt.y + matrix[4],
  y: matrix[1] * pt.x + matrix[3] * pt.y + matrix[5],
});

const computeSymbolBounds = (data: SymbolInstanceData) => {
  const matrix = ensureMatrix(data);
  const { width, height } = getInstanceDimensions(data);
  const halfStroke = (data.strokeWidth || 0) / 2;
  const corners = [
    { x: -halfStroke, y: -halfStroke },
    { x: width + halfStroke, y: -halfStroke },
    { x: width + halfStroke, y: height + halfStroke },
    { x: -halfStroke, y: height + halfStroke },
  ];
  const transformed = corners.map((pt) => applyMatrix(pt, matrix));
  const minX = Math.min(...transformed.map((pt) => pt.x));
  const maxX = Math.max(...transformed.map((pt) => pt.x));
  const minY = Math.min(...transformed.map((pt) => pt.y));
  const maxY = Math.max(...transformed.map((pt) => pt.y));
  return { minX, minY, maxX, maxY };
};

// eslint-disable-next-line react-refresh/only-export-components
const SymbolInstanceThumbnail = ({ element }: { element: SymbolInstanceElement }) => {
  const data = element.data;
  const bounds = computeSymbolBounds(data);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const padding = Math.max(width, height) * 0.1;
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  const matrix = ensureMatrix(data);
  const pathD = data.pathData ? commandsToString(data.pathData.subPaths.flat()) : null;
  const stroke = useColorModeValue('#000', '#fff');
  const strokeWidth = 1;
  const strokeOpacity = 1;
  const strokeLinecap = undefined;
  const strokeLinejoin = undefined;
  const strokeDasharray = undefined;
  const fill = 'none';
  const fillOpacity = 1;
  const fillRule = undefined;

  return (
    <Box
      width="100%"
      height="100%"
      borderRadius="sm"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`matrix(${matrix.join(' ')})`}>
          {pathD ? (
            <path
              d={pathD}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              strokeLinecap={strokeLinecap}
              strokeLinejoin={strokeLinejoin}
              strokeDasharray={strokeDasharray}
              fill={fill}
              fillOpacity={fillOpacity}
              fillRule={fillRule}
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <use
              href={`#symbol-${data.symbolId}`}
              width={width}
              height={height}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              fill={fill}
              fillOpacity={fillOpacity}
              {...(fillRule ? { fillRule } : {})}
            />
          )}
        </g>
      </svg>
    </Box>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
const SymbolInstanceRendererComponent: React.FC<{ element: SymbolInstanceElement; rendererContext: CanvasRenderContext }> = ({ element, rendererContext }) => {
  const data = element.data;
  const wireframe = useCanvasStore((state) => (state as unknown as WireframePluginSlice).wireframe);
  const { colorMode } = useColorMode();
  const wireframeEnabled = wireframe?.enabled ?? false;
  const wireframeStroke = colorMode === 'dark' ? '#ffffff' : '#000000';
  const removeFill = wireframe?.removeFill ?? false;
  const symbolOverrides = (rendererContext.rendererOverrides?.element?.symbolInstance as SymbolRendererOverrides | undefined) ?? undefined;
  const matrix = ensureMatrix(data);
  const transformAttr = `matrix(${matrix.join(' ')})`;
  const clipAttr = data.clipPathId ? { clipPath: `url(#${data.clipPathId})` } : {};
  const filterAttr = (symbolOverrides?.disableFilter ?? false)
    ? {}
    : (data.filterId ? { filter: `url(#${data.filterId})` } : {});
  const { width, height } = getInstanceDimensions(data);
  
  // For complex symbols (no pathData), don't override fill/stroke to preserve internal colors
  const isComplexSymbol = !data.pathData;
  
  const nativeFill = data.fillColor ?? data.pathData?.fillColor ?? 'currentColor';
  const nativeFillOpacity = data.fillOpacity ?? data.pathData?.fillOpacity ?? 1;
  const nativeFillRule = data.fillRule ?? data.pathData?.fillRule;
  const baseStrokeColor = wireframeEnabled
    ? (symbolOverrides?.strokeColor ?? wireframeStroke)
    : (symbolOverrides?.strokeColor ?? data.strokeColor ?? data.pathData?.strokeColor);
  const baseStrokeOpacity = wireframeEnabled
    ? (symbolOverrides?.strokeOpacity ?? 1)
    : (symbolOverrides?.strokeOpacity ?? data.strokeOpacity ?? data.pathData?.strokeOpacity);
  const baseStrokeWidth = wireframeEnabled
    ? (symbolOverrides?.strokeWidth ?? 1)
    : (symbolOverrides?.strokeWidth ?? data.strokeWidth ?? data.pathData?.strokeWidth);
  const strokeScalingEnabled = wireframeEnabled
    ? (symbolOverrides?.scaleStrokeWithZoom ?? false)
    : (symbolOverrides?.scaleStrokeWithZoom ?? rendererContext.scaleStrokeWithZoom);
  const strokeWidth = baseStrokeWidth === undefined
    ? undefined
    : (strokeScalingEnabled ? baseStrokeWidth : baseStrokeWidth / rendererContext.viewport.zoom);

  // Style attributes - for complex symbols, only apply wireframe/override styles, not fill/stroke
  const styleAttrs: Record<string, string | number | undefined> = {};
  if (wireframeEnabled) {
    if (baseStrokeColor !== undefined) styleAttrs.stroke = baseStrokeColor;
    if (strokeWidth !== undefined) styleAttrs.strokeWidth = strokeWidth;
    if (baseStrokeOpacity !== undefined) styleAttrs.strokeOpacity = baseStrokeOpacity;
    if (removeFill) {
      styleAttrs.fill = 'none';
    } else {
      styleAttrs.fill = nativeFill;
      styleAttrs.fillOpacity = nativeFillOpacity;
      if (nativeFillRule !== undefined) styleAttrs.fillRule = nativeFillRule;
    }
  } else if (!isComplexSymbol) {
    // Only apply fill/stroke overrides for simple symbols (with pathData)
    if (baseStrokeColor !== undefined) styleAttrs.stroke = baseStrokeColor;
    if (strokeWidth !== undefined) styleAttrs.strokeWidth = strokeWidth;
    if (baseStrokeOpacity !== undefined) styleAttrs.strokeOpacity = baseStrokeOpacity;
    if (data.strokeLinecap !== undefined) styleAttrs.strokeLinecap = data.strokeLinecap;
    if (data.strokeLinejoin !== undefined) styleAttrs.strokeLinejoin = data.strokeLinejoin;
    if (data.strokeDasharray !== undefined) styleAttrs.strokeDasharray = data.strokeDasharray;
    if (data.fillColor !== undefined) {
      styleAttrs.fill = data.fillColor;
      // Default opacity to 1 when a fill color exists and no explicit opacity is set
      styleAttrs.fillOpacity = data.fillOpacity !== undefined ? data.fillOpacity : 1;
    }
    if (data.fillRule !== undefined) styleAttrs.fillRule = data.fillRule;
  }
  // For complex symbols, we don't apply fill/stroke styles to preserve internal element colors

  const blendStyle: React.CSSProperties = {};
  if (data.mixBlendMode) blendStyle.mixBlendMode = data.mixBlendMode as React.CSSProperties['mixBlendMode'];
  if (data.isolation) blendStyle.isolation = data.isolation;
  
  // For simple symbols, ensure pickable background when no fill is present
  // For complex symbols, we don't modify fill - the internal elements handle their own colors
  if (!isComplexSymbol) {
    const currentFill = styleAttrs.fill ?? 'none';
    const currentFillOpacity = styleAttrs.fillOpacity ?? (styleAttrs.fill ? 1 : 0);
    if (currentFill === 'none' || Number(currentFillOpacity) <= 0) {
      styleAttrs.fill = '#000';
      styleAttrs.fillOpacity = 0.001;
    }
  }
  
  if (data.opacity !== undefined) {
    styleAttrs.opacity = data.opacity;
  }
  const initialAttrs = getInitialAnimationAttributes(
    element.id,
    (rendererContext.animations as SVGAnimation[] | undefined) ?? [],
    rendererContext.animationState as AnimationState | undefined
  );
  if (initialAttrs.transform) {
    styleAttrs.transform = String(initialAttrs.transform);
  }
  const allAnimations = (rendererContext.animations as SVGAnimation[] | undefined) ?? [];
  const animationState = rendererContext.animationState as AnimationState | undefined;
  const isTransformAnimation = (anim: SVGAnimation) =>
    (anim.type === 'animateTransform' && (anim.attributeName ?? 'transform') === 'transform') ||
    anim.type === 'animateMotion';
  const transformAnimationNodes = renderAnimationsForElement(
    element.id,
    allAnimations.filter(isTransformAnimation),
    animationState
  );
  const attributeAnimationNodes = renderAnimationsForElement(
    element.id,
    allAnimations.filter((anim) => !isTransformAnimation(anim)),
    animationState
  );

  return (
    <g
      key={element.id}
      data-element-id={element.id}
      {...filterAttr}
    >
      {transformAnimationNodes}
      <g transform={transformAttr} data-element-id={element.id}>
      {data.pathData ? (
        <path
          d={commandsToString(data.pathData.subPaths.flat())}
          data-element-id={element.id}
          {...clipAttr}
          {...styleAttrs}
          style={Object.keys(blendStyle).length ? blendStyle : undefined}
          {...initialAttrs}
        >
          {attributeAnimationNodes}
        </path>
      ) : (
        <use
          href={`#symbol-${data.symbolId}`}
          width={width}
          height={height}
          data-element-id={element.id}
          {...clipAttr}
          {...styleAttrs}
          style={Object.keys(blendStyle).length ? blendStyle : undefined}
          {...initialAttrs}
        >
          {attributeAnimationNodes}
        </use>
      )}
      </g>
    </g>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
const SymbolInstanceRenderer: CanvasElementRenderer<SymbolInstanceElement> = (element, context) => (
  <SymbolInstanceRendererComponent element={element} rendererContext={context} />
);

const createSymbolInstanceContribution = (): ElementContribution => {
  const updateElementMatrix = (element: CanvasElement, matrix: Matrix): SymbolInstanceElement => {
    const symbolElement = element as SymbolInstanceElement;
    return {
      ...symbolElement,
      data: {
        ...symbolElement.data,
        transformMatrix: matrix,
        transform: undefined,
      },
    };
  };

  return {
    type: 'symbolInstance' as const,
    canvasRenderer: SymbolInstanceRenderer as CanvasElementRenderer,
    getBounds: (element) => {
      const symbolElement = element as SymbolInstanceElement;
      return computeSymbolBounds(symbolElement.data);
    },
    translate: (element, deltaX, deltaY) => {
      const symbolElement = element as SymbolInstanceElement;
      const matrix = multiplyMatrix(translateMatrix(deltaX, deltaY), ensureMatrix(symbolElement.data));
      return updateElementMatrix(element, matrix);
    },
    scale: (element, scaleX, scaleY, centerX, centerY) => {
      const symbolElement = element as SymbolInstanceElement;
      const matrix = multiplyMatrix(scaleMatrix(scaleX, scaleY, centerX, centerY), ensureMatrix(symbolElement.data));
      return updateElementMatrix(element, matrix);
    },
    rotate: (element, angleDegrees, centerX, centerY) => {
      const symbolElement = element as SymbolInstanceElement;
      const matrix = multiplyMatrix(rotateMatrix(angleDegrees, centerX, centerY), ensureMatrix(symbolElement.data));
      return updateElementMatrix(element, matrix);
    },
    applyAffine: (element, matrix, _precision) => {
      const symbolElement = element as SymbolInstanceElement;
      const current = ensureMatrix(symbolElement.data);
      const updated = multiplyMatrix(matrix as Matrix, current);
      return updateElementMatrix(element, updated);
    },
    renderThumbnail: (element) => <SymbolInstanceThumbnail element={element as SymbolInstanceElement} />,
    clone: (element) => ({
      ...element,
      data: JSON.parse(JSON.stringify(element.data)),
    }),
    serialize: (element) => {
      const id = element.id;
      const data = element.data;
      const matrix = data.transformMatrix ? `matrix(${data.transformMatrix.join(' ')})` : '';
      const transform = matrix || serializeTransform(data);
      const transformAttr = transform ? ` transform="${transform}"` : '';
      const clipRef = data.clipPathId ?? data.clipPathTemplateId;
      const clipAttr = clipRef ? ` clip-path="url(#${clipRef})"` : '';
      const filterAttr = data.filterId ? ` filter="url(#${data.filterId})"` : '';
      const maskAttr = data.maskId ? ` mask="url(#${data.maskId})"` : '';
      const { width, height } = getInstanceDimensions(data);

      const styleParts: string[] = [];
      if (data.mixBlendMode) styleParts.push(`mix-blend-mode:${data.mixBlendMode}`);
      if (data.isolation) styleParts.push(`isolation:${data.isolation}`);
      const styleAttr = styleParts.length ? ` style="${styleParts.join(';')}"` : '';

      // When we have raw symbol content (no pathData), avoid overriding fills; use color instead
      const useColorAttr = !data.pathData && data.fillColor ? ` color="${data.fillColor}"` : '';
      const paintAttrs = (() => {
        if (!data.pathData) {
          return `${useColorAttr}${styleAttr}`;
        }
        let attrs = '';
        if (data.strokeColor !== undefined) attrs += ` stroke="${data.strokeColor}"`;
        if (data.strokeWidth !== undefined) attrs += ` stroke-width="${data.strokeWidth}"`;
        if (data.strokeOpacity !== undefined) attrs += ` stroke-opacity="${data.strokeOpacity}"`;
        if (data.strokeLinecap !== undefined) attrs += ` stroke-linecap="${data.strokeLinecap}"`;
        if (data.strokeLinejoin !== undefined) attrs += ` stroke-linejoin="${data.strokeLinejoin}"`;
        if (data.strokeDasharray !== undefined) attrs += ` stroke-dasharray="${data.strokeDasharray}"`;
        if (data.fillColor !== undefined) attrs += ` fill="${data.fillColor}"`;
        if (data.fillOpacity !== undefined) attrs += ` fill-opacity="${data.fillOpacity}"`;
        if (data.fillRule !== undefined) attrs += ` fill-rule="${data.fillRule}"`;
        if (data.opacity !== undefined) attrs += ` opacity="${data.opacity}"`;
        attrs += styleAttr;
        return attrs;
      })();

      return `<use id="${id}" href="#symbol-${data.symbolId}" width="${width}" height="${height}"${transformAttr}${clipAttr}${filterAttr}${maskAttr}${paintAttrs} vector-effect="non-scaling-stroke" />`;
    },
  };
};

const importSymbolDefs = (doc: Document): Record<string, SymbolDefinition[]> | null => {
  const nodes = Array.from(doc.querySelectorAll('symbol'));
  if (!nodes.length) return null;

  const symbols: SymbolDefinition[] = nodes
    .map<SymbolDefinition | null>((node) => {
      const id = node.getAttribute('id') ?? generateShortId('sym');
      // Strip animations - they are imported separately by the animation system
      let rawContent: string | undefined = stripAnimationsFromContent(node) || undefined;
      // Extract path from symbol content; support <path> or <use href="#pathId">
      let pathNode: SVGPathElement | null = node.querySelector('path');
      let useNode: Element | null = null;
      if (!pathNode) {
        useNode = node.querySelector('use');
        if (useNode) {
          const href = useNode.getAttribute('href') || useNode.getAttribute('xlink:href');
          const refId = href?.startsWith('#') ? href.slice(1) : null;
          const refNode = refId ? doc.getElementById(refId) : null;
          if (refNode instanceof SVGPathElement) {
            pathNode = refNode;
            rawContent = undefined; // Inline resolved path; avoid dangling ref
          } else if (refNode?.tagName.toLowerCase() === 'path') {
            pathNode = refNode as unknown as SVGPathElement;
            rawContent = undefined;
          }
        }
      }
      const viewBoxAttr = node.getAttribute('viewBox');
      let bounds = { minX: 0, minY: 0, width: 100, height: 100 };
      if (viewBoxAttr) {
        const [x, y, w, h] = viewBoxAttr.split(/\s+/).map(parseFloat);
        bounds = {
          minX: Number.isFinite(x) ? x : 0,
          minY: Number.isFinite(y) ? y : 0,
          width: Number.isFinite(w) && w > 0 ? w : 100,
          height: Number.isFinite(h) && h > 0 ? h : 100,
        };
      }

      let pathData: import('./types').SymbolInstanceData['pathData'];
      const multiChildContent = node.children.length > 1;
      if (pathNode && !multiChildContent) {
        const pathD = pathNode.getAttribute('d');
        if (!pathD) return null;
        const getAttr = (name: string): string | null => useNode?.getAttribute(name) ?? pathNode?.getAttribute(name);

        const strokeColor = getAttr('stroke') ?? 'none';
        const strokeWidth = parseFloat(getAttr('stroke-width') ?? '1');
        const fillColor = getAttr('fill') ?? 'none';
        const strokeOpacity = parseFloat(getAttr('stroke-opacity') ?? '1');
        const fillOpacity = parseFloat(getAttr('fill-opacity') ?? '1');
        const safeStrokeOpacity = Number.isFinite(strokeOpacity) ? strokeOpacity : 1;
        const safeFillOpacity = Number.isFinite(fillOpacity) ? fillOpacity : 1;

        const parsedCommands = parsePathD(pathD);
        const subPaths = [parsedCommands];
        if (!viewBoxAttr) {
          const measured = measurePath(subPaths, strokeWidth, 1);
          bounds = {
            minX: measured.minX,
            minY: measured.minY,
            width: Math.max(1, measured.maxX - measured.minX),
            height: Math.max(1, measured.maxY - measured.minY),
          };
        }
        pathData = {
          subPaths,
          strokeColor,
          strokeWidth,
          fillColor,
          strokeOpacity: safeStrokeOpacity,
          fillOpacity: safeFillOpacity,
        };
      } else if (viewBoxAttr) {
        // Fallback path covering the viewBox so we have sizing
        const rectD = `M ${bounds.minX} ${bounds.minY} L ${bounds.minX + bounds.width} ${bounds.minY} L ${bounds.minX + bounds.width} ${bounds.minY + bounds.height} L ${bounds.minX} ${bounds.minY + bounds.height} Z`;
        pathData = {
          subPaths: [parsePathD(rectD)],
          strokeColor: 'none',
          strokeWidth: 1,
          fillColor: 'currentColor',
          strokeOpacity: 1,
          fillOpacity: 1,
        };
      } else {
        return null;
      }

      // Remove 'symbol-' prefix if present
      const cleanId = id.replace(/^symbol-/, '');

      return {
        id: cleanId,
        name: cleanId.replace(/-/g, ' '),
        pathData,
        bounds,
        rawContent,
      } as SymbolDefinition;
    })
    .filter((s): s is SymbolDefinition => s !== null);

  return symbols.length > 0 ? { symbol: symbols } : null;
};

export const symbolsPlugin: PluginDefinition<CanvasStore> = {
  id: 'symbols',
  metadata: {
    label: 'Symbols',
    icon: Layers,
    cursor: 'default',
  },
  slices: [symbolsSliceFactory],
  importers: [
    (element, transform) => importUse(element, transform),
  ],
  importDefs: importSymbolDefs,
  relatedPluginPanels: [
    {
      id: 'symbols-panel',
      targetPlugin: 'library',
      component: SymbolsPanel,
      order: 3,
    },
  ],
  hooks: [
    {
      id: 'symbols-placement-hook',
      hook: useSymbolPlacementHook,
      global: true,
    },
  ],
  onColorModeChange: ({ nextColorMode, store }) => {
    const state = store.getState();

    state.elements.forEach((element) => {
      if (element.type !== 'symbolInstance') return;

      const data = element.data as SymbolInstanceData;
      const updates: Partial<SymbolInstanceData> = {};
      const pathDataUpdates: Partial<SymbolInstanceData['pathData']> = {};

      if (isMonoColor(data.strokeColor)) {
        updates.strokeColor = transformMonoColor(data.strokeColor, nextColorMode);
      }

      if (isMonoColor(data.fillColor)) {
        updates.fillColor = transformMonoColor(data.fillColor, nextColorMode);
      }

      if (data.pathData) {
        if (isMonoColor(data.pathData.strokeColor)) {
          pathDataUpdates.strokeColor = transformMonoColor(data.pathData.strokeColor, nextColorMode);
        }
        if (isMonoColor(data.pathData.fillColor)) {
          pathDataUpdates.fillColor = transformMonoColor(data.pathData.fillColor, nextColorMode);
        }
        if (Object.keys(pathDataUpdates).length > 0) {
          updates.pathData = { ...data.pathData, ...pathDataUpdates };
        }
      }

      if (Object.keys(updates).length > 0) {
        state.updateElement?.(element.id, { data: { ...data, ...updates } });
      }
    });
  },
  elementContributions: [createSymbolInstanceContribution()],
  svgDefsEditors: [symbolDefsEditor],
};
