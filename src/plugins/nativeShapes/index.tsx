/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { Radius } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import { NativeShapesPanel } from './NativeShapesPanel';
import { createNativeShapesSlice, type NativeShapesPluginSlice } from './slice';
import { NativeShapesRenderer } from './NativeShapesRenderer';
import { isMonoColor, transformMonoColor } from '../../utils/colorModeSyncUtils';
import type { NativeShapeElement } from './types';
import type { ElementContribution } from '../../utils/elementContributionRegistry';
import { BlockingOverlay, FeedbackOverlay } from '../../overlays';
import { NativeShapesPreview } from './NativeShapesPreview';
import { ShapeCreationController } from '../shape/ShapeCreationController';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { useCanvasStore } from '../../store/canvasStore';
import type { Point, Viewport } from '../../types';
import { normalizeMarkerId } from '../../utils/markerUtils';

import { shapeToNativeShape } from './importer';

type AffineMatrix = [number, number, number, number, number, number];
const identityMatrix = (): AffineMatrix => [1, 0, 0, 1, 0, 0];
const multiplyMatrix = (m1: AffineMatrix, m2: AffineMatrix): AffineMatrix => ([
  m1[0] * m2[0] + m1[2] * m2[1],
  m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3],
  m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
  m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
]);
const translateMatrix = (tx: number, ty: number): AffineMatrix => [1, 0, 0, 1, tx, ty];
const scaleMatrix = (sx: number, sy: number, cx: number, cy: number): AffineMatrix => multiplyMatrix(
  multiplyMatrix(translateMatrix(cx, cy), [sx, 0, 0, sy, 0, 0]),
  translateMatrix(-cx, -cy)
);
const rotateMatrix = (deg: number, cx: number, cy: number): AffineMatrix => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rot: AffineMatrix = [cos, sin, -sin, cos, 0, 0];
  return multiplyMatrix(multiplyMatrix(translateMatrix(cx, cy), rot), translateMatrix(-cx, -cy));
};
const deriveMatrixFromTransform = (data: NativeShapeElement['data']): AffineMatrix | null => {
  const t = data.transform;
  if (!t) return null;
  const cx = data.x + data.width / 2;
  const cy = data.y + data.height / 2;
  let m: AffineMatrix = identityMatrix();
  if (t.translateX || t.translateY) {
    m = multiplyMatrix(translateMatrix(t.translateX ?? 0, t.translateY ?? 0), m);
  }
  if (t.rotation) {
    m = multiplyMatrix(rotateMatrix(t.rotation, cx, cy), m);
  }
  if (t.scaleX !== undefined || t.scaleY !== undefined) {
    const sx = t.scaleX ?? 1;
    const sy = t.scaleY ?? 1;
    const scaleM: AffineMatrix = [sx, 0, 0, sy, 0, 0];
    m = multiplyMatrix(scaleM, m);
  }
  return m;
};

const getShapeBounds = (data: NativeShapeElement['data']) => {
  if (data.kind === 'circle') {
    const r = Math.min(data.width, data.height) / 2;
    const cx = data.x + data.width / 2;
    const cy = data.y + data.height / 2;
    return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
  }
  if (data.kind === 'ellipse') {
    const cx = data.x + data.width / 2;
    const cy = data.y + data.height / 2;
    return { minX: cx - data.width / 2, minY: cy - data.height / 2, maxX: cx + data.width / 2, maxY: cy + data.height / 2 };
  }
  if (data.kind === 'line') {
    return {
      minX: Math.min(data.x, data.x + data.width),
      minY: Math.min(data.y, data.y + data.height),
      maxX: Math.max(data.x, data.x + data.width),
      maxY: Math.max(data.y, data.y + data.height),
    };
  }
  if (data.kind === 'polygon' || data.kind === 'polyline') {
    const pts = data.points ?? [];
    if (!pts.length) return null;
    return {
      minX: Math.min(...pts.map((p) => p.x)),
      minY: Math.min(...pts.map((p) => p.y)),
      maxX: Math.max(...pts.map((p) => p.x)),
      maxY: Math.max(...pts.map((p) => p.y)),
    };
  }
  // rect and square default
  const shapeWidth = data.kind === 'square' ? Math.min(data.width, data.height) : data.width;
  const shapeHeight = data.kind === 'square' ? Math.min(data.width, data.height) : data.height;
  return { minX: data.x, minY: data.y, maxX: data.x + shapeWidth, maxY: data.y + shapeHeight };
};

const applyMatrixToBounds = (bounds: { minX: number; minY: number; maxX: number; maxY: number }, matrix?: AffineMatrix | null) => {
  if (!matrix) return bounds;
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
  const transformed = corners.map((pt) => ({
    x: matrix[0] * pt.x + matrix[2] * pt.y + matrix[4],
    y: matrix[1] * pt.x + matrix[3] * pt.y + matrix[5],
  }));
  return {
    minX: Math.min(...transformed.map((p) => p.x)),
    minY: Math.min(...transformed.map((p) => p.y)),
    maxX: Math.max(...transformed.map((p) => p.x)),
    maxY: Math.max(...transformed.map((p) => p.y)),
  };
};

const computeNativeShapeBounds = (data: NativeShapeElement['data']) => {
  const baseBounds = getShapeBounds(data);
  if (!baseBounds) return null;
  const matrix = data.transformMatrix ?? deriveMatrixFromTransform(data);
  return applyMatrixToBounds(baseBounds, matrix);
};

const computeTransformAttr = (data: NativeShapeElement['data']) => {
  if (data.transformMatrix) return `matrix(${data.transformMatrix.join(' ')})`;
  const derived = deriveMatrixFromTransform(data);
  return derived ? `matrix(${derived.join(' ')})` : undefined;
};

const NativeShapeThumbnail = ({ element }: { element: NativeShapeElement }) => {
  const bounds = computeNativeShapeBounds(element.data);
  const viewBox = (() => {
    if (!bounds) return '0 0 48 48';
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const padding = Math.max(width, height) * 0.1;
    return `${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  })();
  const data = element.data;
  const transformAttr = computeTransformAttr(data);
  const strokeColor = useColorModeValue('#000', '#fff');
  const strokeProps = { stroke: strokeColor, strokeWidth: 1, strokeOpacity: 1, fill: 'none' as const, vectorEffect: 'non-scaling-stroke' as const };

  let shape: React.ReactNode = null;
  switch (data.kind) {
    case 'rect':
      shape = <rect x={data.x} y={data.y} width={data.width} height={data.height} rx={data.rx} ry={data.ry} {...strokeProps} transform={transformAttr} />;
      break;
    case 'square': {
      const squareSize = Math.min(data.width, data.height);
      shape = <rect x={data.x} y={data.y} width={squareSize} height={squareSize} rx={data.rx} ry={data.ry} {...strokeProps} transform={transformAttr} />;
      break;
    }
    case 'circle':
      shape = (
        <circle
          cx={data.x + data.width / 2}
          cy={data.y + data.height / 2}
          r={Math.min(data.width, data.height) / 2}
          {...strokeProps}
          transform={transformAttr}
        />
      );
      break;
    case 'ellipse':
      shape = (
        <ellipse
          cx={data.x + data.width / 2}
          cy={data.y + data.height / 2}
          rx={data.width / 2}
          ry={data.height / 2}
          {...strokeProps}
          transform={transformAttr}
        />
      );
      break;
    case 'line':
      shape = (
        <line
          x1={data.x}
          y1={data.y}
          x2={data.x + data.width}
          y2={data.y + data.height}
          {...strokeProps}
          transform={transformAttr}
        />
      );
      break;
    case 'polygon':
    case 'polyline': {
      const pointsAttr = (data.points ?? []).map((p) => `${p.x},${p.y}`).join(' ');
      const Tag = data.kind;
      shape = <Tag points={pointsAttr} {...strokeProps} transform={transformAttr} />;
      break;
    }
    default:
      shape = null;
  }

  return (
    <Box width="100%" height="100%" borderRadius="sm" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {shape}
      </svg>
    </Box>
  );
};

const nativeShapesSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createNativeShapesSlice(set as any, get as any, api as any);
  return { state: slice };
};

const createNativeShapeFromDrag = (start: Point, end: Point, state: CanvasStore) => {
  const settings = (state as unknown as NativeShapesPluginSlice).nativeShape;
  const style = state.style;
  if (!settings) return;
  const kind = settings.kind;
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const width = Math.max(1, Math.abs(end.x - start.x));
  const height = Math.max(1, Math.abs(end.y - start.y));

  const baseStyle = {
    strokeColor: style?.strokeColor ?? '#000000',
    strokeWidth: style?.strokeWidth ?? 1,
    strokeOpacity: style?.strokeOpacity ?? 1,
    strokeLinecap: style?.strokeLinecap,
    strokeLinejoin: style?.strokeLinejoin,
    strokeDasharray: style?.strokeDasharray,
    fillColor: style?.fillColor ?? 'none',
    fillOpacity: style?.fillOpacity ?? 1,
  };

  let data: NativeShapeElement['data'];
  if (kind === 'line') {
    data = {
      kind,
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      ...baseStyle,
    };
  } else if (kind === 'circle') {
    const diameter = Math.min(width, height);
    const x = start.x <= end.x ? minX : start.x - diameter;
    const y = start.y <= end.y ? minY : start.y - diameter;
    data = {
      kind,
      x,
      y,
      width: diameter,
      height: diameter,
      ...baseStyle,
    };
  } else if (kind === 'ellipse') {
    data = {
      kind,
      x: minX,
      y: minY,
      width,
      height,
      rx: settings.rx,
      ry: settings.ry,
      ...baseStyle,
    };
  } else if (kind === 'polygon' || kind === 'polyline') {
    // Prefer generating templates from pointsCount so the slider controls the preview/creation
    const template = (kind === 'polyline'
      ? generateStarPoints(settings.pointsCount ?? 5, 80)
      : generateRegularPolygonPoints(settings.pointsCount ?? 3, 80));
    const tMinX = Math.min(...template.map((p) => p.x), 0);
    const tMinY = Math.min(...template.map((p) => p.y), 0);
    const tMaxX = Math.max(...template.map((p) => p.x), 1);
    const tMaxY = Math.max(...template.map((p) => p.y), 1);
    const scaleX = width / (tMaxX - tMinX || 1);
    const scaleY = height / (tMaxY - tMinY || 1);
    const points = template.map((p) => ({
      x: minX + (p.x - tMinX) * scaleX,
      y: minY + (p.y - tMinY) * scaleY,
    }));
    // Close polyline stars by appending the first point to the end
    const finalPoints = kind === 'polyline' && points.length > 0 ? [...points, { ...points[0] }] : points;
    data = {
      kind,
      x: minX,
      y: minY,
      width,
      height,
      points: finalPoints,
      pointsCount: settings.pointsCount,
      ...baseStyle,
    };
  } else if (kind === 'square') {
    const size = Math.min(width, height);
    data = {
      kind,
      x: minX,
      y: minY,
      width: size,
      height: size,
      rx: settings.rx,
      ry: settings.ry,
      ...baseStyle,
    };
  } else {
    // Default case for rect and other shapes
    data = {
      kind,
      x: minX,
      y: minY,
      width,
      height,
      rx: settings.rx,
      ry: settings.ry,
      ...baseStyle,
    };
  }

  state.addElement({ type: 'nativeShape', data });
};

const NativeShapePreviewWrapper: React.FC = () => {
  const interaction = useCanvasStore((state) => (state as unknown as NativeShapesPluginSlice).nativeShapeInteraction);
  const nativeShape = useCanvasStore((state) => (state as unknown as NativeShapesPluginSlice).nativeShape);
  const viewport = useCanvasStore((state) => state.viewport);
  if (!interaction?.isCreating || !interaction.startPoint || !interaction.endPoint) return null;
  // For preview, always generate template based on current settings (pointsCount + kind)
  const template = (nativeShape.kind === 'polyline'
    ? generateStarPoints(nativeShape.pointsCount ?? 5, 80)
    : generateRegularPolygonPoints(nativeShape.pointsCount ?? 3, 80));

  return (
    <NativeShapesPreview
      kind={nativeShape.kind}
      start={interaction.startPoint}
      end={interaction.endPoint}
      templatePoints={template}
      viewport={viewport}
    />
  );
};

const NativeShapeBlockingOverlayWrapper: React.FC<{ viewport: Viewport; canvasSize: { width: number; height: number } }> = ({ viewport, canvasSize }) => {
  const isCreating = useCanvasStore((state) => (state as unknown as NativeShapesPluginSlice).nativeShapeInteraction?.isCreating ?? false);
  return <BlockingOverlay viewport={viewport} canvasSize={canvasSize} isActive={isCreating} />;
};

const NativeShapeFeedbackWrapper: React.FC<{ viewport: Viewport; canvasSize: { width: number; height: number } }> = ({ viewport, canvasSize }) => {
  const interaction = useCanvasStore((state) => (state as unknown as NativeShapesPluginSlice).nativeShapeInteraction);
  const nativeShape = useCanvasStore((state) => (state as unknown as NativeShapesPluginSlice).nativeShape);
  const isVirtualShiftActive = useCanvasStore((state) => state.isVirtualShiftActive);
  if (!interaction?.isCreating || !interaction.startPoint || !interaction.endPoint) return null;

  const controller = new ShapeCreationController({
    createShape: () => { },
    getSelectedShape: () => nativeShape.kind,
  });
  const feedback = controller.calculateShapeFeedback(
    interaction.startPoint,
    interaction.endPoint,
    isVirtualShiftActive
  );
  return (
    <FeedbackOverlay
      viewport={viewport}
      canvasSize={canvasSize}
      shapeFeedback={feedback}
    />
  );
};

const nativeShapeContribution: ElementContribution<NativeShapeElement> = {
  type: 'nativeShape',
  canvasRenderer: NativeShapesRenderer,
  getBounds: (el) => {
    const bounds = computeNativeShapeBounds(el.data);
    return bounds ?? null;
  },
  renderThumbnail: (el) => <NativeShapeThumbnail element={el as NativeShapeElement} />,
  translate: (el, dx, dy, p) => ({
    ...el,
    data: (() => {
      const precision = Number.isFinite(p) ? p : 3;

      // If the element has a transform matrix or transform object, apply translation
      // via the matrix. This is necessary when the element has rotation or other
      // transformations, as translating x/y directly would cause incorrect movement
      // (the translation would be applied in the wrong coordinate space).
      const hasTransform = el.data.transformMatrix || el.data.transform;
      if (hasTransform) {
        const current = el.data.transformMatrix ?? deriveMatrixFromTransform(el.data) ?? identityMatrix();
        const translated = multiplyMatrix(translateMatrix(dx, dy), current);
        return {
          ...el.data,
          transformMatrix: translated.map((v) => parseFloat(v.toFixed(precision))) as AffineMatrix,
        };
      }

      // For elements without transforms, translate x/y directly.
      // This ensures SVG animations that animate position attributes (x, y, cx, cy)
      // work correctly.

      // For polygon/polyline we must translate the explicit points as well as the
      // bounding box fields, otherwise the visual shape will not move.
      if (el.data.kind === 'polygon' || el.data.kind === 'polyline') {
        const pts = (el.data.points ?? []).map((pt) => ({
          x: parseFloat((pt.x + dx).toFixed(precision)),
          y: parseFloat((pt.y + dy).toFixed(precision)),
        }));
        return {
          ...el.data,
          points: pts,
          x: parseFloat((el.data.x + dx).toFixed(precision)),
          y: parseFloat((el.data.y + dy).toFixed(precision)),
        };
      }

      return {
        ...el.data,
        x: parseFloat((el.data.x + dx).toFixed(precision)),
        y: parseFloat((el.data.y + dy).toFixed(precision)),
      };
    })(),
  }),
  scale: (el, sx, sy, cx, cy, p) => {
    const mat = el.data.transformMatrix ?? identityMatrix();
    const scaled = multiplyMatrix(scaleMatrix(sx, sy, cx, cy), mat);
    return { ...el, data: { ...el.data, transformMatrix: scaled.map((v) => parseFloat(v.toFixed(p))) as AffineMatrix } };
  },
  rotate: (el, deg, cx, cy, p) => {
    const mat = el.data.transformMatrix ?? identityMatrix();
    const rotated = multiplyMatrix(rotateMatrix(deg, cx, cy), mat);
    return { ...el, data: { ...el.data, transformMatrix: rotated.map((v) => parseFloat(v.toFixed(p))) as AffineMatrix } };
  },
  applyAffine: (el, m, p) => ({
    ...el,
    data: { ...el.data, transformMatrix: m.map((v) => parseFloat(v.toFixed(p))) as AffineMatrix },
  }),
  clone: (el) => ({ ...el, data: JSON.parse(JSON.stringify(el.data)) }),
  serialize: (el) => {
    const d = el.data;
    // Use precision for consistent decimal formatting
    const p = 4;
    const fmt = (v: number) => parseFloat(v.toFixed(p)).toString();
    const attrs = [
      `id="${el.id}"`,
      `stroke="${d.strokeColor ?? '#000'}"`,
      `stroke-width="${fmt(d.strokeWidth ?? 1)}"`,
      `stroke-opacity="${fmt(d.strokeOpacity ?? 1)}"`,
      `fill="${d.fillColor ?? 'none'}"`,
      `fill-opacity="${fmt(d.fillOpacity ?? 1)}"`,
    ];
    if (d.opacity !== undefined) attrs.push(`opacity="${fmt(d.opacity)}"`);
    if (d.strokeLinecap) attrs.push(`stroke-linecap="${d.strokeLinecap}"`);
    if (d.strokeLinejoin) attrs.push(`stroke-linejoin="${d.strokeLinejoin}"`);
    if (d.strokeDasharray && d.strokeDasharray !== 'none') attrs.push(`stroke-dasharray="${d.strokeDasharray}"`);
    if (d.strokeDashoffset !== undefined) attrs.push(`stroke-dashoffset="${fmt(d.strokeDashoffset)}"`);
    if (d.strokeMiterlimit !== undefined) attrs.push(`stroke-miterlimit="${fmt(d.strokeMiterlimit)}"`);
    if (d.visibility && d.visibility !== 'visible') attrs.push(`visibility="${d.visibility}"`);
    if (d.display && d.display !== 'inline') attrs.push(`display="${d.display}"`);
    if (d.vectorEffect && d.vectorEffect !== 'none') attrs.push(`vector-effect="${d.vectorEffect}"`);
    if (d.shapeRendering && d.shapeRendering !== 'auto') attrs.push(`shape-rendering="${d.shapeRendering}"`);
    if (d.transformMatrix) {
      attrs.push(`transform="matrix(${d.transformMatrix.map(v => fmt(v)).join(' ')})"`);
    } else if (d.transform) {
      const cx = d.x + d.width / 2;
      const cy = d.y + d.height / 2;
      attrs.push(`transform="translate(${fmt(d.transform.translateX ?? 0)} ${fmt(d.transform.translateY ?? 0)}) rotate(${fmt(d.transform.rotation ?? 0)} ${fmt(cx)} ${fmt(cy)}) scale(${fmt(d.transform.scaleX ?? 1)} ${fmt(d.transform.scaleY ?? 1)})"`);
    }
    if (d.filterId) {
      attrs.push(`filter="url(#${d.filterId})"`);
    }
    const clipRef = d.clipPathId ?? d.clipPathTemplateId;
    if (clipRef) {
      attrs.push(`clip-path="url(#${clipRef})"`);
    }
    if ((d as { maskId?: string }).maskId) {
      attrs.push(`mask="url(#${(d as { maskId?: string }).maskId})"`);
    }
    const styleParts: string[] = [];
    if ((d as { mixBlendMode?: string }).mixBlendMode) {
      styleParts.push(`mix-blend-mode:${(d as { mixBlendMode?: string }).mixBlendMode}`);
    }
    if ((d as { isolation?: string }).isolation) {
      styleParts.push(`isolation:${(d as { isolation?: string }).isolation}`);
    }
    if (styleParts.length) {
      attrs.push(`style="${styleParts.join(';')}"`);
    }
    const markerStartId = normalizeMarkerId(d.markerStart);
    const markerMidId = normalizeMarkerId(d.markerMid);
    const markerEndId = normalizeMarkerId(d.markerEnd);
    if (markerStartId) attrs.push(`marker-start="url(#${markerStartId})"`);
    if (markerMidId) attrs.push(`marker-mid="url(#${markerMidId})"`);
    if (markerEndId) attrs.push(`marker-end="url(#${markerEndId})"`);
    switch (d.kind) {
      case 'rect':
      case 'square': {
        const size = d.kind === 'square' ? Math.min(d.width, d.height) : undefined;
        attrs.push(
          `x="${fmt(d.x)}"`,
          `y="${fmt(d.y)}"`,
          `width="${fmt(size ?? d.width)}"`,
          `height="${fmt(size ?? d.height)}"`
        );
        if (d.rx) attrs.push(`rx="${fmt(d.rx)}"`);
        if (d.ry) attrs.push(`ry="${fmt(d.ry)}"`);
        return `<rect ${attrs.join(' ')} />`;
      }
      case 'circle': {
        const r = Math.min(d.width, d.height) / 2;
        const cx = d.x + d.width / 2;
        const cy = d.y + d.height / 2;
        attrs.push(`cx="${fmt(cx)}"`, `cy="${fmt(cy)}"`, `r="${fmt(r)}"`);
        return `<circle ${attrs.join(' ')} />`;
      }
      case 'ellipse': {
        const cx = d.x + d.width / 2;
        const cy = d.y + d.height / 2;
        attrs.push(`cx="${fmt(cx)}"`, `cy="${fmt(cy)}"`, `rx="${fmt(d.width / 2)}"`, `ry="${fmt(d.height / 2)}"`);
        return `<ellipse ${attrs.join(' ')} />`;
      }
      case 'line':
        attrs.push(`x1="${fmt(d.x)}"`, `y1="${fmt(d.y)}"`, `x2="${fmt(d.x + d.width)}"`, `y2="${fmt(d.y + d.height)}"`);
        return `<line ${attrs.join(' ')} />`;
      case 'polygon':
      case 'polyline': {
        const pts = (d.points ?? []).map((pt) => `${fmt(pt.x)},${fmt(pt.y)}`).join(' ');
        attrs.push(`points="${pts}"`);
        return `<${d.kind} ${attrs.join(' ')} />`;
      }
      default:
        return null;
    }
  },
};

// Exported for testing and reuse: generate regular polygon points in a square template
export const generateRegularPolygonPoints = (count: number, size = 80): { x: number; y: number }[] => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < Math.max(3, Math.floor(count)); i++) {
    // Start at -90deg so first point is at top
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
};

export const generateStarPoints = (pointsCount: number, size = 80, innerRatio = 0.5): { x: number; y: number }[] => {
  // pointsCount refers to number of star tips (arms), must be >= 5
  const n = Math.max(5, Math.floor(pointsCount));
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2;
  const innerR = outerR * innerRatio;
  const pts: { x: number; y: number }[] = [];
  // Create alternating outer/inner points; total vertices = n * 2
  for (let i = 0; i < n * 2; i++) {
    const isOuter = i % 2 === 0;
    const step = i / (n * 2);
    const angle = -Math.PI / 2 + step * 2 * Math.PI;
    const r = isOuter ? outerR : innerR;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
};

// Helper to convert an existing element's data to a new kind, regenerating points
export const convertNativeShapeKind = (
  data: NativeShapeElement['data'],
  newKind: NativeShapeElement['data']['kind'],
  pointsCount?: number
): NativeShapeElement['data'] => {
  const cnt = pointsCount ?? data.pointsCount ?? (newKind === 'polyline' ? 5 : 3);

  if (newKind === 'polygon' || newKind === 'polyline') {
    const template = newKind === 'polyline' ? generateStarPoints(cnt, 80) : generateRegularPolygonPoints(cnt, 80);
    const tMinX = Math.min(...template.map((p) => p.x), 0);
    const tMinY = Math.min(...template.map((p) => p.y), 0);
    const tMaxX = Math.max(...template.map((p) => p.x), 1);
    const tMaxY = Math.max(...template.map((p) => p.y), 1);
    const scaleX = (data.width ?? 1) / (tMaxX - tMinX || 1);
    const scaleY = (data.height ?? 1) / (tMaxY - tMinY || 1);
    let points = template.map((p) => ({
      x: data.x + (p.x - tMinX) * scaleX,
      y: data.y + (p.y - tMinY) * scaleY,
    }));
    if (newKind === 'polyline' && points.length > 0) {
      points = [...points, { ...points[0] }];
    }
    return { ...data, kind: newKind, pointsCount: cnt, points };
  }

  // Other kinds: remove points and pointsCount
  const next: NativeShapeElement['data'] = { ...data, kind: newKind };
  delete next.points;
  delete next.pointsCount;
  return next;
};

export const nativeShapesPlugin: PluginDefinition<CanvasStore> = {
  id: 'nativeShapes',
  metadata: {
    label: 'Native Shapes',
    icon: Radius,
    cursor: 'crosshair',
  },
  importers: [
    (element, transform) => shapeToNativeShape(element, transform),
  ],
  toolDefinition: { order: 14, visibility: 'always-shown', toolGroup: 'creation' },
  subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
  handler: (event, point, target, context) => {
    const state = context.store.getState();
    const settings = (state as unknown as NativeShapesPluginSlice).nativeShape;
    const interaction = (state as unknown as NativeShapesPluginSlice).nativeShapeInteraction;
    const effectiveShiftKey = getEffectiveShift(event.shiftKey, state.isVirtualShiftActive);

    // Disable creation if a nativeShape element is selected (editing mode)
    const hasNativeShapeSelected = state.selectedIds.some(id => {
      const element = state.elements.find(el => el.id === id);
      return element?.type === 'nativeShape';
    });
    if (hasNativeShapeSelected) {
      return;
    }

    const controller = new ShapeCreationController({
      createShape: () => { },
      getSelectedShape: () => settings.kind,
    });

    if (event.type === 'pointerdown') {
      if (target.tagName === 'svg' || target.classList.contains('canvas-background')) {
        const startPoint = state.grid?.snapEnabled ? state.snapToGrid?.(point.x, point.y) || point : point;
        state.setNativeShapeInteraction({
          isCreating: true,
          startPoint,
          endPoint: startPoint,
        });
      }
    } else if (event.type === 'pointermove') {
      if (interaction?.isCreating && interaction.startPoint) {
        let endPoint = state.grid?.snapEnabled ? state.snapToGrid?.(point.x, point.y) || point : point;
        if (settings.kind === 'line' && effectiveShiftKey) {
          endPoint = controller.calculateConstrainedLineEnd(interaction.startPoint, endPoint);
        } else if (effectiveShiftKey) {
          const dx = endPoint.x - interaction.startPoint.x;
          const dy = endPoint.y - interaction.startPoint.y;
          endPoint = {
            x: interaction.startPoint.x + Math.round(dx / 10) * 10,
            y: interaction.startPoint.y + Math.round(dy / 10) * 10,
          };
        }
        state.setNativeShapeInteraction({ endPoint });
      }
    } else if (event.type === 'pointerup') {
      if (interaction?.isCreating && interaction.startPoint && interaction.endPoint) {
        const didCreate = controller.completeShapeCreation(interaction.startPoint, interaction.endPoint);
        if (didCreate) {
          createNativeShapeFromDrag(interaction.startPoint, interaction.endPoint, state);
        }
      }
      state.setNativeShapeInteraction({
        isCreating: false,
        startPoint: null,
        endPoint: null,
      });
    }
  },
  onColorModeChange: ({ nextColorMode, store }) => {
    const state = store.getState();

    state.elements.forEach((element) => {
      if (element.type !== 'nativeShape') return;

      const data = element.data as NativeShapeElement['data'];
      const updates: Partial<NativeShapeElement['data']> = {};

      if (isMonoColor(data.strokeColor)) {
        updates.strokeColor = transformMonoColor(data.strokeColor, nextColorMode);
      }

      if (isMonoColor(data.fillColor)) {
        updates.fillColor = transformMonoColor(data.fillColor, nextColorMode);
      }

      if (Object.keys(updates).length > 0) {
        state.updateElement?.(element.id, { data: { ...data, ...updates } });
      }
    });
  },
  slices: [nativeShapesSliceFactory],
  elementContributions: [nativeShapeContribution as ElementContribution],
  expandablePanel: () => React.createElement(NativeShapesPanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('nativeShapes', NativeShapesPanel)],
  canvasLayers: [
    {
      id: 'native-shape-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize }) => <NativeShapeBlockingOverlayWrapper viewport={viewport} canvasSize={canvasSize} />,
    },
    {
      id: 'native-shape-preview',
      placement: 'midground',
      render: () => <NativeShapePreviewWrapper />,
    },
    {
      id: 'native-shape-feedback',
      placement: 'foreground',
      render: ({ viewport, canvasSize }) => <NativeShapeFeedbackWrapper viewport={viewport} canvasSize={canvasSize} />,
    },
  ],
};

