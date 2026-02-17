import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import type { CanvasRenderContext } from '../../canvas/renderers/CanvasRendererRegistry';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { importForeignObject } from './importForeignObject';

type Matrix = [number, number, number, number, number, number];

type EmbeddedSvgData = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  viewBox?: string;
  preserveAspectRatio?: string;
  overflow?: string;
  innerSvg: string;
  transformMatrix?: [number, number, number, number, number, number];
  sourceId?: string;
};

type ForeignObjectData = {
  x: number;
  y: number;
  width: number;
  height: number;
  innerHtml: string;
  overflow?: string;
  requiredExtensions?: string;
  filterId?: string;
  clipPathId?: string;
  clipPathTemplateId?: string;
  maskId?: string;
  mixBlendMode?: string;
  isolation?: 'auto' | 'isolate';
  opacity?: number;
  transformMatrix?: [number, number, number, number, number, number];
  sourceId?: string;
};

const identityMatrix = (): Matrix => [1, 0, 0, 1, 0, 0];
const multiplyMatrix = (m1: Matrix, m2: Matrix): Matrix => ([
  m1[0] * m2[0] + m1[2] * m2[1],
  m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3],
  m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
  m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
]);
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

const ensureMatrix = (data: EmbeddedSvgData | ForeignObjectData): Matrix => {
  if (Array.isArray(data.transformMatrix)) {
    return data.transformMatrix as Matrix;
  }
  return identityMatrix();
};

// Renderer for embedded/raw SVG nodes
const renderEmbeddedSvg = (element: CanvasElement) => {
  const data = element.data as EmbeddedSvgData;
  const transform = data.transformMatrix ? `matrix(${data.transformMatrix.join(' ')})` : undefined;
  return (
    <svg
      id={element.id}
      key={element.id}
      x={data.x}
      y={data.y}
      width={data.width}
      height={data.height}
      viewBox={data.viewBox}
      transform={transform}
      preserveAspectRatio={data.preserveAspectRatio}
      overflow={data.overflow}
      dangerouslySetInnerHTML={{ __html: data.innerSvg }}
    />
  );
};

const serializeEmbeddedSvg = (element: CanvasElement): string => {
  const data = element.data as EmbeddedSvgData;
  const attrs: string[] = [`id="${element.id}"`];
  if (data.x !== undefined) attrs.push(`x="${data.x}"`);
  if (data.y !== undefined) attrs.push(`y="${data.y}"`);
  if (data.width !== undefined) attrs.push(`width="${data.width}"`);
  if (data.height !== undefined) attrs.push(`height="${data.height}"`);
  if (data.viewBox) attrs.push(`viewBox="${data.viewBox}"`);
  if (data.preserveAspectRatio) attrs.push(`preserveAspectRatio="${data.preserveAspectRatio}"`);
  if (data.overflow) attrs.push(`overflow="${data.overflow}"`);
  if (data.transformMatrix) attrs.push(`transform="matrix(${data.transformMatrix.join(' ')})"`);
  return `<svg ${attrs.join(' ')}>${data.innerSvg}</svg>`;
};

const computeEmbeddedBounds = (data: EmbeddedSvgData) => {
  const x = data.x ?? 0;
  const y = data.y ?? 0;
  const width = data.width ?? (() => {
    if (data.viewBox) {
      const parts = data.viewBox.split(/\s+/).map(parseFloat);
      if (parts.length === 4) return parts[2];
    }
    return 0;
  })();
  const height = data.height ?? (() => {
    if (data.viewBox) {
      const parts = data.viewBox.split(/\s+/).map(parseFloat);
      if (parts.length === 4) return parts[3];
    }
    return 0;
  })();

  const base = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
  const m = data.transformMatrix;
  if (!m) {
    const minX = Math.min(...base.map((p) => p.x));
    const minY = Math.min(...base.map((p) => p.y));
    const maxX = Math.max(...base.map((p) => p.x));
    const maxY = Math.max(...base.map((p) => p.y));
    return { minX, minY, maxX, maxY };
  }
  const transformed = base.map((pt) => ({
    x: m[0] * pt.x + m[2] * pt.y + m[4],
    y: m[1] * pt.x + m[3] * pt.y + m[5],
  }));
  const minX = Math.min(...transformed.map((p) => p.x));
  const minY = Math.min(...transformed.map((p) => p.y));
  const maxX = Math.max(...transformed.map((p) => p.x));
  const maxY = Math.max(...transformed.map((p) => p.y));
  return { minX, minY, maxX, maxY };
};

const computeForeignObjectBounds = (data: ForeignObjectData) => {
  const x = data.x ?? 0;
  const y = data.y ?? 0;
  const width = data.width ?? 0;
  const height = data.height ?? 0;

  const base = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
  const m = data.transformMatrix;
  if (!m) {
    const minX = Math.min(...base.map((p) => p.x));
    const minY = Math.min(...base.map((p) => p.y));
    const maxX = Math.max(...base.map((p) => p.x));
    const maxY = Math.max(...base.map((p) => p.y));
    return { minX, minY, maxX, maxY };
  }
  const transformed = base.map((pt) => ({
    x: m[0] * pt.x + m[2] * pt.y + m[4],
    y: m[1] * pt.x + m[3] * pt.y + m[5],
  }));
  const minX = Math.min(...transformed.map((p) => p.x));
  const minY = Math.min(...transformed.map((p) => p.y));
  const maxX = Math.max(...transformed.map((p) => p.x));
  const maxY = Math.max(...transformed.map((p) => p.y));
  return { minX, minY, maxX, maxY };
};

const renderForeignObject = (element: CanvasElement, context: CanvasRenderContext) => {
  const data = element.data as ForeignObjectData;
  const transform = data.transformMatrix ? `matrix(${data.transformMatrix.join(' ')})` : undefined;
  const clipPathRef = data.clipPathId ?? data.clipPathTemplateId;
  const style: Record<string, string> = {};
  if (data.mixBlendMode) style.mixBlendMode = data.mixBlendMode;
  if (data.isolation) style.isolation = data.isolation;

  // Get versioned mask ID for cache invalidation when mask position changes
  const maskVersions = context.extensionsContext?.maskVersions as Map<string, number> | undefined;
  const maskVersion = data.maskId && maskVersions?.get(data.maskId);
  const maskRuntimeId = data.maskId && maskVersion ? `${data.maskId}-v${maskVersion}` : data.maskId;

  return (
    <foreignObject
      id={element.id}
      key={element.id}
      x={data.x}
      y={data.y}
      width={data.width}
      height={data.height}
      overflow={data.overflow}
      requiredExtensions={data.requiredExtensions}
      transform={transform}
      opacity={data.opacity}
      filter={data.filterId ? `url(#${data.filterId})` : undefined}
      clipPath={clipPathRef ? `url(#${clipPathRef})` : undefined}
      mask={maskRuntimeId ? `url(#${maskRuntimeId})` : undefined}
      style={Object.keys(style).length ? style : undefined}
      dangerouslySetInnerHTML={{ __html: data.innerHtml }}
    />
  );
};

const serializeForeignObject = (element: CanvasElement): string => {
  const data = element.data as ForeignObjectData;
  const attrs: string[] = [
    `id="${element.id}"`,
    `x="${data.x}"`,
    `y="${data.y}"`,
    `width="${data.width}"`,
    `height="${data.height}"`,
  ];
  if (data.overflow) attrs.push(`overflow="${data.overflow}"`);
  if (data.requiredExtensions) attrs.push(`requiredExtensions="${data.requiredExtensions}"`);
  if (data.transformMatrix) attrs.push(`transform="matrix(${data.transformMatrix.join(' ')})"`);
  if (data.filterId) attrs.push(`filter="url(#${data.filterId})"`);
  const clipPathRef = data.clipPathId ?? data.clipPathTemplateId;
  if (clipPathRef) attrs.push(`clip-path="url(#${clipPathRef})"`);
  if (data.maskId) attrs.push(`mask="url(#${data.maskId})"`);
  const styleParts: string[] = [];
  if (data.mixBlendMode) styleParts.push(`mix-blend-mode:${data.mixBlendMode}`);
  if (data.isolation) styleParts.push(`isolation:${data.isolation}`);
  if (styleParts.length) attrs.push(`style="${styleParts.join(';')}"`);
  if (data.opacity !== undefined) attrs.push(`opacity="${data.opacity}"`);
  return `<foreignObject ${attrs.join(' ')}>${data.innerHtml}</foreignObject>`;
};

elementContributionRegistry.register('embeddedSvg', {
  type: 'embeddedSvg',
  canvasRenderer: renderEmbeddedSvg,
  serialize: serializeEmbeddedSvg,
  getBounds: (element) => {
    const bounds = computeEmbeddedBounds(element.data as EmbeddedSvgData);
    return bounds ? bounds : null;
  },
  translate: (element, deltaX, deltaY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as EmbeddedSvgData;
    if (data.transformMatrix) {
      const translated = multiplyMatrix(translateMatrix(deltaX, deltaY), ensureMatrix(data));
      return {
        ...element,
        data: {
          ...data,
          transformMatrix: translated.map((v) => parseFloat(v.toFixed(p))) as Matrix,
        },
      };
    }
    return {
      ...element,
      data: {
        ...data,
        x: parseFloat(((data.x ?? 0) + deltaX).toFixed(p)),
        y: parseFloat(((data.y ?? 0) + deltaY).toFixed(p)),
      },
    };
  },
  scale: (element, scaleX, scaleY, centerX, centerY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as EmbeddedSvgData;
    if (data.transformMatrix) {
      const scaled = multiplyMatrix(scaleMatrix(scaleX, scaleY, centerX, centerY), ensureMatrix(data));
      return {
        ...element,
        data: {
          ...data,
          transformMatrix: scaled.map((v) => parseFloat(v.toFixed(p))) as Matrix,
        },
      };
    }
    const width = data.width ?? 0;
    const height = data.height ?? 0;
    const newX = parseFloat((centerX + ((data.x ?? 0) - centerX) * scaleX).toFixed(p));
    const newY = parseFloat((centerY + ((data.y ?? 0) - centerY) * scaleY).toFixed(p));
    const newWidth = parseFloat((width * scaleX).toFixed(p));
    const newHeight = parseFloat((height * scaleY).toFixed(p));
    return {
      ...element,
      data: {
        ...data,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      },
    };
  },
  rotate: (element, angleDegrees, centerX, centerY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as EmbeddedSvgData;
    const rotated = multiplyMatrix(rotateMatrix(angleDegrees, centerX, centerY), ensureMatrix(data));
    return {
      ...element,
      data: {
        ...data,
        transformMatrix: rotated.map((v) => parseFloat(v.toFixed(p))) as Matrix,
      },
    };
  },
  applyAffine: (element, matrix, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as EmbeddedSvgData;
    const composed = multiplyMatrix(matrix as Matrix, ensureMatrix(data));
    return {
      ...element,
      data: {
        ...data,
        transformMatrix: composed.map((v) => parseFloat(v.toFixed(p))) as Matrix,
      },
    };
  },
  clone: (element) => ({
    ...element,
    data: JSON.parse(JSON.stringify(element.data)),
  }),
});

elementContributionRegistry.register('foreignObject', {
  type: 'foreignObject',
  canvasRenderer: renderForeignObject,
  serialize: serializeForeignObject,
  getBounds: (element) => {
    const bounds = computeForeignObjectBounds(element.data as ForeignObjectData);
    return bounds ? bounds : null;
  },
  translate: (element, deltaX, deltaY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as ForeignObjectData;
    if (data.transformMatrix) {
      const translated = multiplyMatrix(translateMatrix(deltaX, deltaY), ensureMatrix(data));
      return {
        ...element,
        data: {
          ...data,
          transformMatrix: translated.map((v) => parseFloat(v.toFixed(p))) as Matrix,
        },
      };
    }
    return {
      ...element,
      data: {
        ...data,
        x: parseFloat((data.x + deltaX).toFixed(p)),
        y: parseFloat((data.y + deltaY).toFixed(p)),
      },
    };
  },
  scale: (element, scaleX, scaleY, centerX, centerY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as ForeignObjectData;
    if (data.transformMatrix) {
      const scaled = multiplyMatrix(scaleMatrix(scaleX, scaleY, centerX, centerY), ensureMatrix(data));
      return {
        ...element,
        data: {
          ...data,
          transformMatrix: scaled.map((v) => parseFloat(v.toFixed(p))) as Matrix,
        },
      };
    }
    const newX = parseFloat((centerX + (data.x - centerX) * scaleX).toFixed(p));
    const newY = parseFloat((centerY + (data.y - centerY) * scaleY).toFixed(p));
    const newWidth = parseFloat((data.width * scaleX).toFixed(p));
    const newHeight = parseFloat((data.height * scaleY).toFixed(p));
    return {
      ...element,
      data: {
        ...data,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      },
    };
  },
  rotate: (element, angleDegrees, centerX, centerY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as ForeignObjectData;
    const rotated = multiplyMatrix(rotateMatrix(angleDegrees, centerX, centerY), ensureMatrix(data));
    return {
      ...element,
      data: {
        ...data,
        transformMatrix: rotated.map((v) => parseFloat(v.toFixed(p))) as Matrix,
      },
    };
  },
  applyAffine: (element, matrix, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const data = element.data as ForeignObjectData;
    const composed = multiplyMatrix(matrix as Matrix, ensureMatrix(data));
    return {
      ...element,
      data: {
        ...data,
        transformMatrix: composed.map((v) => parseFloat(v.toFixed(p))) as Matrix,
      },
    };
  },
  clone: (element) => ({
    ...element,
    data: JSON.parse(JSON.stringify(element.data)),
  }),
});

export const embeddedSvgPlugin: PluginDefinition<CanvasStore> = {
  id: 'embeddedSvg',
  metadata: { label: 'Embedded SVG' },
  importers: [importForeignObject],
};
