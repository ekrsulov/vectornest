import React from 'react';
import { Copy } from 'lucide-react';
import { createToolPanel } from '../../utils/pluginFactories';
import { Box, useColorMode, useColorModeValue } from '@chakra-ui/react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElementRenderer, CanvasRenderContext } from '../../canvas/renderers/CanvasRendererRegistry';
import type { ElementContribution } from '../../utils/elementContributionRegistry';
import type { CanvasElement, PathData } from '../../types';
import type { UseElement, UseElementData, Matrix } from './types';
import { createUseSlice } from './slice';
import type { SymbolPluginSlice, SymbolDefinition } from '../symbols/slice';
import type { WireframePluginSlice } from '../wireframe/slice';
import { commandsToString } from '../../utils/pathParserUtils';
import { parsePathD } from '../../utils/pathParserUtils';
import { BEZIER_CIRCLE_KAPPA } from '../../utils/bezierCircle';
import { measurePath } from '../../utils/measurementUtils';
import { isTouchDevice } from '../../utils/domHelpers';
import { useCanvasStore } from '../../store/canvasStore';
import { renderAnimationsForElement } from '../animationSystem/renderAnimations';
import { getInitialAnimationAttributes } from '../animationSystem/renderAnimations';
import type { AnimationState, SVGAnimation } from '../animationSystem/types';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { importUse } from './importer';
import { UsePanel } from './UsePanel';

// Register persistence
registerStateKeys('use', [], 'persist');

// Slice factory
const useSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => ({
  state: createUseSlice(set, get, api),
});

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

const ensureMatrix = (data: UseElementData): Matrix => {
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
  
  // Start with x/y translation from use element
  let matrix = translateMatrix(data.x ?? 0, data.y ?? 0);
  
  // Apply additional transform
  matrix = multiplyMatrix(translateMatrix(t.translateX ?? 0, t.translateY ?? 0), matrix);
  
  const width = data.width ?? 100;
  const height = data.height ?? 100;
  
  matrix = multiplyMatrix(scaleMatrix(t.scaleX ?? 1, t.scaleY ?? 1, width / 2, height / 2), matrix);
  
  if (t.rotation) {
    matrix = multiplyMatrix(rotateMatrix(t.rotation, width / 2, height / 2), matrix);
  }
  
  return matrix;
};

const applyMatrix = (pt: { x: number; y: number }, matrix: Matrix) => ({
  x: matrix[0] * pt.x + matrix[2] * pt.y + matrix[4],
  y: matrix[1] * pt.x + matrix[3] * pt.y + matrix[5],
});

const nativeShapeToPathData = (data: Record<string, unknown>): PathData | null => {
  const kind = data.kind as string | undefined;
  const strokeColor = (data.strokeColor as string | undefined) ?? 'none';
  const strokeWidth = (data.strokeWidth as number | undefined) ?? 1;
  const strokeOpacity = (data.strokeOpacity as number | undefined) ?? 1;
  const fillColor = (data.fillColor as string | undefined) ?? 'none';
  const fillOpacity = (data.fillOpacity as number | undefined) ?? 1;
  const x = (data.x as number | undefined) ?? 0;
  const y = (data.y as number | undefined) ?? 0;
  const width = (data.width as number | undefined) ?? 0;
  const height = (data.height as number | undefined) ?? 0;

  let d: string | null = null;

  if (kind === 'circle' || kind === 'square' || kind === 'rectangle' || kind === 'rect') {
    if (kind === 'circle') {
      const r = Math.min(width, height) / 2;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const k = BEZIER_CIRCLE_KAPPA;
      const kr = k * r;
      d = `M ${cx} ${cy - r} C ${cx + kr} ${cy - r} ${cx + r} ${cy - kr} ${cx + r} ${cy} C ${cx + r} ${cy + kr} ${cx + kr} ${cy + r} ${cx} ${cy + r} C ${cx - kr} ${cy + r} ${cx - r} ${cy + kr} ${cx - r} ${cy} C ${cx - r} ${cy - kr} ${cx - kr} ${cy - r} ${cx} ${cy - r} Z`;
    } else {
      d = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
    }
  } else if (kind === 'ellipse') {
    const rx = width / 2;
    const ry = height / 2;
    const cx = x + rx;
    const cy = y + ry;
    const k = BEZIER_CIRCLE_KAPPA;
    const krx = k * rx;
    const kry = k * ry;
    d = `M ${cx} ${cy - ry} C ${cx + krx} ${cy - ry} ${cx + rx} ${cy - kry} ${cx + rx} ${cy} C ${cx + rx} ${cy + kry} ${cx + krx} ${cy + ry} ${cx} ${cy + ry} C ${cx - krx} ${cy + ry} ${cx - rx} ${cy + kry} ${cx - rx} ${cy} C ${cx - rx} ${cy - kry} ${cx - krx} ${cy - ry} ${cx} ${cy - ry} Z`;
  }

  if (!d) return null;

  return {
    subPaths: [parsePathD(d)],
    strokeColor,
    strokeWidth,
    strokeOpacity,
    fillColor,
    fillOpacity,
  };
};

const mergePathWithOverrides = (pathData: PathData | null | undefined, overrides?: UseElementData['styleOverrides']): PathData | null => {
  if (!pathData) return null;
  if (!overrides) return pathData;
  return {
    ...pathData,
    strokeColor: overrides.strokeColor ?? pathData.strokeColor,
    strokeWidth: overrides.strokeWidth ?? pathData.strokeWidth,
    strokeOpacity: overrides.strokeOpacity ?? pathData.strokeOpacity,
    fillColor: overrides.fillColor ?? pathData.fillColor,
    fillOpacity: overrides.fillOpacity ?? pathData.fillOpacity,
    strokeLinecap: overrides.strokeLinecap ?? pathData.strokeLinecap,
    strokeLinejoin: overrides.strokeLinejoin ?? pathData.strokeLinejoin,
    strokeDasharray: overrides.strokeDasharray ?? pathData.strokeDasharray,
    fillRule: overrides.fillRule ?? pathData.fillRule,
    opacity: overrides.opacity ?? (pathData as { opacity?: number }).opacity,
  };
};

const computeUseBounds = (data: UseElementData, pathData?: PathData | null) => {
  const matrix = ensureMatrix(data);

  // Prefer cachedBounds (from importer getBBox). Fallback to measured path or defaults.
  let originX = data.cachedBounds?.minX ?? 0;
  let originY = data.cachedBounds?.minY ?? 0;
  let width = data.cachedBounds?.width ?? data.width ?? 100;
  let height = data.cachedBounds?.height ?? data.height ?? 100;

  if (!data.cachedBounds && pathData) {
    const measured = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
    originX = measured.minX;
    originY = measured.minY;
    width = measured.maxX - measured.minX;
    height = measured.maxY - measured.minY;

    if ((width === 0 || height === 0) && typeof document !== 'undefined') {
      try {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', commandsToString(pathData.subPaths.flat()));
        if (pathData.strokeWidth !== undefined) {
          path.setAttribute('stroke-width', String(pathData.strokeWidth));
        }
        svg.appendChild(path);
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.style.opacity = '0';
        document.body.appendChild(svg);
        const bbox = path.getBBox();
        document.body.removeChild(svg);
        if (bbox.width && bbox.height) {
          originX = bbox.x;
          originY = bbox.y;
          width = bbox.width;
          height = bbox.height;
        }
      } catch {
        // ignore measuring errors
      }
    }
  }

  const halfStroke =
    (data.styleOverrides?.strokeWidth ??
      pathData?.strokeWidth ??
      0) / 2;

  const corners = [
    { x: originX - halfStroke, y: originY - halfStroke },
    { x: originX + width + halfStroke, y: originY - halfStroke },
    { x: originX + width + halfStroke, y: originY + height + halfStroke },
    { x: originX - halfStroke, y: originY + height + halfStroke },
  ];
  
  const transformed = corners.map((pt) => applyMatrix(pt, matrix));
  const minX = Math.min(...transformed.map((pt) => pt.x));
  const maxX = Math.max(...transformed.map((pt) => pt.x));
  const minY = Math.min(...transformed.map((pt) => pt.y));
  const maxY = Math.max(...transformed.map((pt) => pt.y));
  
  return { minX, minY, maxX, maxY };
};

// Thumbnail component
// eslint-disable-next-line react-refresh/only-export-components
const UseThumbnail: React.FC<{ element: UseElement }> = ({ element }) => {
  const data = element.data;
  const mergedPathForBounds = mergePathWithOverrides(data.cachedPathData, data.styleOverrides);
  const bounds = computeUseBounds(data, mergedPathForBounds);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const padding = Math.max(width, height) * 0.1;
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  const matrix = ensureMatrix(data);
  
  const stroke = useColorModeValue('#000', '#fff');
  
  // Get referenced element content
  const elements = useCanvasStore(state => state.elements);
  const symbols = useCanvasStore(state => (state as unknown as SymbolPluginSlice).symbols ?? []);
  
  let content: React.ReactNode = null;
  
  if (data.referenceType === 'element') {
    // Find by id or sourceId
    const refElement = elements.find(e => {
      if (e.id === data.href) return true;
      const elementData = e.data as Record<string, unknown>;
      return elementData.sourceId === data.href;
    });
    if (refElement?.type === 'path') {
      const pathData = refElement.data as PathData;
      const pathD = commandsToString(pathData.subPaths.flat());
      content = (
        <path
          d={pathD}
          stroke={stroke}
          strokeWidth={1}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
  } else if (data.referenceType === 'symbol') {
    const symbol = symbols.find((s: SymbolDefinition) => s.id === data.href);
    if (symbol?.pathData) {
      const pathD = commandsToString(symbol.pathData.subPaths.flat());
      content = (
        <path
          d={pathD}
          stroke={stroke}
          strokeWidth={1}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      );
    } else if (data.cachedPathData) {
      const pathD = commandsToString(data.cachedPathData.subPaths.flat());
      content = (
        <path
          d={pathD}
          stroke={stroke}
          strokeWidth={1}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
  }
  
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
          {content}
        </g>
      </svg>
    </Box>
  );
};

// Main renderer component
// eslint-disable-next-line react-refresh/only-export-components
const UseRendererComponent: React.FC<{ element: UseElement; rendererContext: CanvasRenderContext }> = ({ element, rendererContext }) => {
  const data = element.data;
  const wireframe = useCanvasStore((state) => (state as unknown as WireframePluginSlice).wireframe);
  const { colorMode } = useColorMode();
  const isTouch = isTouchDevice();
  const wireframeEnabled = wireframe?.enabled ?? false;
  const wireframeStroke = colorMode === 'dark' ? '#ffffff' : '#000000';
  const removeFill = wireframe?.removeFill ?? false;
  const doubleClickHandler = rendererContext.eventHandlers.onDoubleClick;
  const containerDoubleClickProps = !isTouch && doubleClickHandler
    ? { onDoubleClick: (event: React.MouseEvent<Element>) => doubleClickHandler(element.id, event) }
    : {};
  
  // Get referenced content
  const elements = useCanvasStore(state => state.elements);
  const symbols = useCanvasStore(state => (state as unknown as SymbolPluginSlice).symbols ?? []);
  
  const matrix = ensureMatrix(data);
  const transformAttr = `matrix(${matrix.join(' ')})`;
  
  const clipAttr = data.clipPathId ? { clipPath: `url(#${data.clipPathId})` } : {};
  const filterAttr = data.filterId ? { filter: `url(#${data.filterId})` } : {};
  
  // Get animation attributes
  const initialAttrs = getInitialAnimationAttributes(
    element.id,
    (rendererContext.animations as SVGAnimation[] | undefined) ?? [],
    rendererContext.animationState as AnimationState | undefined
  );
  
  const animationNodes = renderAnimationsForElement(
    element.id,
    (rendererContext.animations as SVGAnimation[] | undefined) ?? [],
    rendererContext.animationState as AnimationState | undefined
  );
  
  // Build style attributes with overrides
  const buildStyleAttrs = (baseData?: PathData) => {
    const overrides = data.styleOverrides ?? {};
    const strokeColor = overrides.strokeColor ?? baseData?.strokeColor ?? 'none';
    const strokeWidth = overrides.strokeWidth ?? baseData?.strokeWidth ?? 1;
    const strokeOpacity = overrides.strokeOpacity ?? baseData?.strokeOpacity ?? 1;
    const fillColor = overrides.fillColor ?? baseData?.fillColor ?? 'none';
    const fillOpacity = overrides.fillOpacity ?? baseData?.fillOpacity ?? 1;
    const fillRule = overrides.fillRule ?? baseData?.fillRule;
    
    const attrs: Record<string, string | number | undefined> = {};
    
    if (wireframeEnabled) {
      attrs.stroke = wireframeStroke;
      attrs.strokeWidth = strokeWidth / rendererContext.viewport.zoom;
      attrs.strokeOpacity = 1;
      attrs.fill = removeFill ? 'none' : fillColor;
      attrs.fillOpacity = removeFill ? 0 : fillOpacity;
    } else {
      attrs.stroke = strokeColor;
      attrs.strokeWidth = rendererContext.scaleStrokeWithZoom ? strokeWidth : strokeWidth / rendererContext.viewport.zoom;
      attrs.strokeOpacity = strokeOpacity;
      attrs.fill = fillColor;
      attrs.fillOpacity = fillOpacity;
      if (fillRule) attrs.fillRule = fillRule;
      if (overrides.strokeLinecap) attrs.strokeLinecap = overrides.strokeLinecap;
      if (overrides.strokeLinejoin) attrs.strokeLinejoin = overrides.strokeLinejoin;
      if (overrides.strokeDasharray) attrs.strokeDasharray = overrides.strokeDasharray;
    }
    
    // Ensure pickable
    if (attrs.fill === 'none' || Number(attrs.fillOpacity) <= 0) {
      attrs.fill = '#000';
      attrs.fillOpacity = 0.001;
    }
    
    return attrs;
  };
  
  // Render based on reference type
  if (data.referenceType === 'element') {
    // Find referenced element - check both by ID and by sourceId
    const refElement = elements.find(e => {
      if (e.id === data.href) return true;
      // Check sourceId in element data
      const elementData = e.data as Record<string, unknown>;
      return elementData.sourceId === data.href;
    });
    
    if (!refElement) {
      // Reference not found, render placeholder
      return (
        <g
          key={element.id}
          transform={transformAttr}
          data-element-id={element.id}
          {...filterAttr}
          {...containerDoubleClickProps}
        >
          <rect
            x={0}
            y={0}
            width={data.width ?? 50}
            height={data.height ?? 50}
            fill="none"
            stroke="#ff0000"
            strokeWidth={1}
            strokeDasharray="5,5"
            data-element-id={element.id}
          />
        </g>
      );
    }
    
    // Handle image elements
    if (refElement.type === 'image') {
      const imageData = refElement.data as {
        href?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        preserveAspectRatio?: string;
        opacity?: number;
      };
      
      return (
        <g
          key={element.id}
          transform={transformAttr}
          data-element-id={element.id}
          {...clipAttr}
          {...filterAttr}
          {...containerDoubleClickProps}
        >
          <image
            href={imageData.href ?? ''}
            x={imageData.x ?? 0}
            y={imageData.y ?? 0}
            width={imageData.width ?? data.width ?? 100}
            height={imageData.height ?? data.height ?? 100}
            preserveAspectRatio={imageData.preserveAspectRatio}
            opacity={data.styleOverrides?.opacity ?? imageData.opacity ?? 1}
            data-element-id={element.id}
            {...initialAttrs}
          >
            {animationNodes}
          </image>
        </g>
      );
    }
    
    const basePathData =
      refElement.type === 'path'
        ? (refElement.data as PathData)
        : data.cachedPathData ?? (refElement.type === 'nativeShape' ? nativeShapeToPathData(refElement.data as Record<string, unknown>) ?? undefined : undefined);
    const pathData = mergePathWithOverrides(basePathData, data.styleOverrides);

    if (pathData) {
      const overrides = data.styleOverrides ?? {};
      const mergedPathData: PathData = {
        ...pathData,
        strokeColor: overrides.strokeColor ?? pathData.strokeColor,
        strokeWidth: overrides.strokeWidth ?? pathData.strokeWidth,
        strokeOpacity: overrides.strokeOpacity ?? pathData.strokeOpacity,
        fillColor: overrides.fillColor ?? pathData.fillColor,
        fillOpacity: overrides.fillOpacity ?? pathData.fillOpacity,
        strokeLinecap: overrides.strokeLinecap ?? pathData.strokeLinecap,
        strokeLinejoin: overrides.strokeLinejoin ?? pathData.strokeLinejoin,
        strokeDasharray: overrides.strokeDasharray ?? pathData.strokeDasharray,
        fillRule: overrides.fillRule ?? pathData.fillRule,
        opacity: overrides.opacity ?? (pathData as { opacity?: number }).opacity,
      };
      const pathD = commandsToString(mergedPathData.subPaths.flat());
      const styleAttrs = buildStyleAttrs(mergedPathData);

      return (
        <g
          key={element.id}
          transform={transformAttr}
          data-element-id={element.id}
          {...clipAttr}
          {...filterAttr}
          {...containerDoubleClickProps}
        >
          <path
            d={pathD}
            data-element-id={element.id}
            {...styleAttrs}
            {...initialAttrs}
          >
            {animationNodes}
          </path>
        </g>
      );
    }

    // Fallback: native <use> (may not render if ref id doesn't exist)
    return (
      <g
        key={element.id}
        transform={transformAttr}
        data-element-id={element.id}
        {...filterAttr}
        {...containerDoubleClickProps}
      >
        <use
          href={`#${data.href}`}
          data-element-id={element.id}
          {...clipAttr}
          {...initialAttrs}
        >
          {animationNodes}
        </use>
      </g>
    );
  }
  
  // Symbol reference
  if (data.referenceType === 'symbol') {
    const symbol = symbols.find((s: SymbolDefinition) => s.id === data.href);
    const pathData = symbol?.pathData ?? data.cachedPathData;
    const styleAttrs = buildStyleAttrs(pathData);
    const width = data.width ?? symbol?.bounds.width ?? 100;
    const height = data.height ?? symbol?.bounds.height ?? 100;
    
    // If we have path data, render directly
    if (pathData) {
      const pathD = commandsToString(pathData.subPaths.flat());
      return (
        <g
          key={element.id}
          transform={transformAttr}
          data-element-id={element.id}
          {...clipAttr}
          {...filterAttr}
          {...containerDoubleClickProps}
        >
          <path
            d={pathD}
            data-element-id={element.id}
            {...styleAttrs}
            {...initialAttrs}
          >
            {animationNodes}
          </path>
        </g>
      );
    }
    
    // Fall back to <use> referencing the symbol
    return (
      <g
        key={element.id}
        transform={transformAttr}
        data-element-id={element.id}
        {...filterAttr}
        {...containerDoubleClickProps}
      >
        <use
          href={`#symbol-${data.href}`}
          width={width}
          height={height}
          data-element-id={element.id}
          {...clipAttr}
          {...styleAttrs}
          {...initialAttrs}
        >
          {animationNodes}
        </use>
      </g>
    );
  }
  
  // External reference (not fully implemented)
  return (
    <g
      key={element.id}
      transform={transformAttr}
      data-element-id={element.id}
      {...filterAttr}
      {...containerDoubleClickProps}
    >
      <rect
        x={0}
        y={0}
        width={data.width ?? 50}
        height={data.height ?? 50}
        fill="none"
        stroke="#888"
        strokeWidth={1}
        strokeDasharray="2,2"
        data-element-id={element.id}
      />
    </g>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
const UseRenderer: CanvasElementRenderer<UseElement> = (element, context) => (
  <UseRendererComponent element={element} rendererContext={context} />
);

// Serialize transform for export
const serializeTransform = (data: UseElementData): string => {
  const transform = data.transform;
  if (!transform && !data.x && !data.y) {
    return '';
  }
  
  const parts: string[] = [];
  
  if (data.x !== 0 || data.y !== 0 || transform?.translateX || transform?.translateY) {
    const tx = (data.x ?? 0) + (transform?.translateX ?? 0);
    const ty = (data.y ?? 0) + (transform?.translateY ?? 0);
    if (tx !== 0 || ty !== 0) {
      parts.push(`translate(${tx} ${ty})`);
    }
  }
  
  if (transform) {
    const width = data.width ?? 100;
    const height = data.height ?? 100;
    const centerX = width / 2;
    const centerY = height / 2;
    
    if (transform.rotation !== 0) {
      parts.push(`rotate(${transform.rotation} ${centerX} ${centerY})`);
    }
    if (transform.scaleX !== 1 || transform.scaleY !== 1) {
      parts.push(`scale(${transform.scaleX} ${transform.scaleY})`);
    }
  }
  
  return parts.join(' ');
};

// Element contribution
const createUseContribution = (): ElementContribution => {
  const updateElementMatrix = (element: CanvasElement, matrix: Matrix): UseElement => {
    const useElement = element as UseElement;
    return {
      ...useElement,
      data: {
        ...useElement.data,
        transformMatrix: matrix,
        transform: undefined,
        x: 0,
        y: 0,
      },
    };
  };
  
      return {
        type: 'use' as const,
        canvasRenderer: UseRenderer as CanvasElementRenderer,
        getBounds: (element) => {
          const useElement = element as UseElement;
          const merged = mergePathWithOverrides(
            (useElement.data as UseElementData).cachedPathData,
            (useElement.data as UseElementData).styleOverrides
          );
          return computeUseBounds(useElement.data, merged);
        },
    translate: (element, deltaX, deltaY) => {
      const useElement = element as UseElement;
      const matrix = multiplyMatrix(translateMatrix(deltaX, deltaY), ensureMatrix(useElement.data));
      return updateElementMatrix(element, matrix);
    },
    scale: (element, scaleX, scaleY, centerX, centerY) => {
      const useElement = element as UseElement;
      const matrix = multiplyMatrix(scaleMatrix(scaleX, scaleY, centerX, centerY), ensureMatrix(useElement.data));
      return updateElementMatrix(element, matrix);
    },
    rotate: (element, angleDegrees, centerX, centerY) => {
      const useElement = element as UseElement;
      const matrix = multiplyMatrix(rotateMatrix(angleDegrees, centerX, centerY), ensureMatrix(useElement.data));
      return updateElementMatrix(element, matrix);
    },
    applyAffine: (element, matrix, _precision) => {
      const useElement = element as UseElement;
      const current = ensureMatrix(useElement.data);
      const updated = multiplyMatrix(matrix as Matrix, current);
      return updateElementMatrix(element, updated);
    },
    renderThumbnail: (element) => <UseThumbnail element={element as UseElement} />,
    clone: (element) => ({
      ...element,
      data: JSON.parse(JSON.stringify(element.data)),
    }),
    serialize: (element) => {
      const id = element.id;
      const data = element.data as UseElementData;
      const matrix = data.transformMatrix ? `matrix(${data.transformMatrix.join(' ')})` : '';
      const transform = matrix || serializeTransform(data);
      const transformAttr = transform ? ` transform="${transform}"` : '';
      const clipRef = data.clipPathId ?? data.clipPathTemplateId;
      const clipAttr = clipRef ? ` clip-path="url(#${clipRef})"` : '';
      const filterAttr = data.filterId ? ` filter="url(#${data.filterId})"` : '';
      const maskAttr = (data as { maskId?: string }).maskId ? ` mask="url(#${(data as { maskId?: string }).maskId})"` : '';
      
      // Determine href based on reference type
      let href = data.href;
      if (data.referenceType === 'symbol') {
        href = `symbol-${data.href}`;
      }
      
      // Style attributes from overrides
      let styleAttrs = '';
      const overrides = data.styleOverrides ?? {};
      if (overrides.strokeColor !== undefined) styleAttrs += ` stroke="${overrides.strokeColor}"`;
      if (overrides.strokeWidth !== undefined) styleAttrs += ` stroke-width="${overrides.strokeWidth}"`;
      if (overrides.strokeOpacity !== undefined) styleAttrs += ` stroke-opacity="${overrides.strokeOpacity}"`;
      if (overrides.strokeLinecap !== undefined) styleAttrs += ` stroke-linecap="${overrides.strokeLinecap}"`;
      if (overrides.strokeLinejoin !== undefined) styleAttrs += ` stroke-linejoin="${overrides.strokeLinejoin}"`;
      if (overrides.strokeDasharray !== undefined) styleAttrs += ` stroke-dasharray="${overrides.strokeDasharray}"`;
      if (overrides.fillColor !== undefined) styleAttrs += ` fill="${overrides.fillColor}"`;
      if (overrides.fillOpacity !== undefined) styleAttrs += ` fill-opacity="${overrides.fillOpacity}"`;
      if (overrides.fillRule !== undefined) styleAttrs += ` fill-rule="${overrides.fillRule}"`;
      if (overrides.opacity !== undefined) styleAttrs += ` opacity="${overrides.opacity}"`;
      const styleParts: string[] = [];
      if ((data as { mixBlendMode?: string }).mixBlendMode) styleParts.push(`mix-blend-mode:${(data as { mixBlendMode?: string }).mixBlendMode}`);
      if ((data as { isolation?: string }).isolation) styleParts.push(`isolation:${(data as { isolation?: string }).isolation}`);
      if (styleParts.length) {
        styleAttrs += ` style="${styleParts.join(';')}"`;
      }
      
      // Dimension attributes
      const widthAttr = data.width !== undefined ? ` width="${data.width}"` : '';
      const heightAttr = data.height !== undefined ? ` height="${data.height}"` : '';

      // If we have cached geometry for element references, inline a path to avoid missing defs on export
      if (data.referenceType === 'element' && data.cachedPathData) {
        const d = commandsToString((data.cachedPathData as PathData).subPaths.flat());
        const pathAttrs = [
          `id="${id}"`,
          `d="${d}"`,
          widthAttr,
          heightAttr,
          transformAttr,
          clipAttr,
          filterAttr,
          maskAttr,
          styleAttrs,
        ].filter(Boolean).join(' ');
        return `<path ${pathAttrs} />`;
      }

      return `<use id="${id}" href="#${href}"${widthAttr}${heightAttr}${transformAttr}${clipAttr}${filterAttr}${maskAttr}${styleAttrs} />`;
    },
  };
};

export const usePlugin: PluginDefinition<CanvasStore> = {
  id: 'use',
  metadata: {
    label: 'Use (Clone)',
    icon: Copy,
    cursor: 'default',
  },
  slices: [useSliceFactory],
  importers: [
    (element, transform) => importUse(element, transform),
  ],
  sidebarPanels: [createToolPanel('use', UsePanel)],
  elementContributions: [createUseContribution()],
};
