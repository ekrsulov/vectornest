/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { Image as ImageIcon } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import type { PluginImageElement as ImageElement } from './types';
import { ImagePanel } from './ImagePanel';
import { createImagePluginSlice } from './slice';
import { ImageElementRenderer } from './ImageElementRenderer';
import type { ElementContribution } from '../../utils/elementContributionRegistry';
import { importImage } from './importer';

type Matrix = [number, number, number, number, number, number];

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

const ensureMatrix = (data: { transformMatrix?: Matrix; transform?: { translateX?: number; translateY?: number; rotation?: number; scaleX?: number; scaleY?: number } }): Matrix => {
  if (Array.isArray(data.transformMatrix)) {
    return data.transformMatrix as Matrix;
  }

  if (data.transform) {
    const { translateX = 0, translateY = 0, rotation = 0, scaleX = 1, scaleY = 1 } = data.transform;
    let m = identityMatrix();
    m = multiplyMatrix(translateMatrix(translateX, translateY), m);
    m = multiplyMatrix([scaleX, 0, 0, scaleY, 0, 0], m);
    if (rotation !== 0) {
      m = multiplyMatrix(rotateMatrix(rotation, 0, 0), m);
    }
    return m;
  }

  return identityMatrix();
};

const imageSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createImagePluginSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

const computeImageBounds = (data: ImageElement['data']) => {
  const { x, y, width, height, transformMatrix, transform } = data;
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  const applyMatrix = (pt: { x: number; y: number }, m: [number, number, number, number, number, number]) => ({
    x: m[0] * pt.x + m[2] * pt.y + m[4],
    y: m[1] * pt.x + m[3] * pt.y + m[5],
  });

  let transformed = corners;

  if (transformMatrix) {
    transformed = corners.map((pt) => applyMatrix(pt, transformMatrix));
  } else if (transform) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    transformed = corners.map((pt) => {
      const tx = pt.x + (transform.translateX ?? 0);
      const ty = pt.y + (transform.translateY ?? 0);
      const sx = transform.scaleX ?? 1;
      const sy = transform.scaleY ?? 1;
      const rx = (tx - cx) * sx;
      const ry = (ty - cy) * sy;
      const rad = ((transform.rotation ?? 0) * Math.PI) / 180;
      return {
        x: cx + rx * Math.cos(rad) - ry * Math.sin(rad),
        y: cy + rx * Math.sin(rad) + ry * Math.cos(rad),
      };
    });
  }

  const minX = Math.min(...transformed.map((p) => p.x));
  const minY = Math.min(...transformed.map((p) => p.y));
  const maxX = Math.max(...transformed.map((p) => p.x));
  const maxY = Math.max(...transformed.map((p) => p.y));

  return { minX, minY, maxX, maxY };
};

const ImageThumbnail = ({ element }: { element: ImageElement }) => {
  const bounds = computeImageBounds(element.data);
  const viewBox = (() => {
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const padding = Math.max(width, height) * 0.1;
    return `${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  })();
  const data = element.data;
  const transformAttr = data.transformMatrix
    ? `matrix(${data.transformMatrix.join(' ')})`
    : data.transform
      ? (() => {
        const cx = data.x + data.width / 2;
        const cy = data.y + data.height / 2;
        return `translate(${data.transform.translateX ?? 0} ${data.transform.translateY ?? 0}) rotate(${data.transform.rotation ?? 0} ${cx} ${cy}) scale(${data.transform.scaleX ?? 1} ${data.transform.scaleY ?? 1})`;
      })()
      : undefined;

  const strokeColor = useColorModeValue('#000', '#fff');
  const strokeProps = { stroke: strokeColor, strokeWidth: 1, fill: 'none' as const, vectorEffect: 'non-scaling-stroke' as const };

  return (
    <Box width="100%" height="100%" borderRadius="sm" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {data.href ? (
          <image
            x={data.x}
            y={data.y}
            width={data.width}
            height={data.height}
            href={data.href}
            preserveAspectRatio={data.preserveAspectRatio ?? 'none'}
            opacity={data.opacity}
            transform={transformAttr}
            style={{ filter: 'grayscale(100%) contrast(110%)' }}
          />
        ) : null}
        <rect
          x={data.x}
          y={data.y}
          width={data.width}
          height={data.height}
          transform={transformAttr}
          {...strokeProps}
        />
      </svg>
    </Box>
  );
};

const imageElementContribution: ElementContribution<ImageElement> = {
  type: 'image',
  canvasRenderer: ImageElementRenderer,
  getBounds: (element) => {
    const { x, y, width, height, transformMatrix, transform } = element.data;
    const corners = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];

    const applyMatrix = (pt: { x: number; y: number }, m: [number, number, number, number, number, number]) => ({
      x: m[0] * pt.x + m[2] * pt.y + m[4],
      y: m[1] * pt.x + m[3] * pt.y + m[5],
    });

    let transformed = corners;

    if (transformMatrix) {
      transformed = corners.map((pt) => applyMatrix(pt, transformMatrix));
    } else if (transform) {
      const cx = x + width / 2;
      const cy = y + height / 2;
      transformed = corners.map((pt) => {
        const tx = pt.x + (transform.translateX ?? 0);
        const ty = pt.y + (transform.translateY ?? 0);
        const sx = transform.scaleX ?? 1;
        const sy = transform.scaleY ?? 1;
        const rx = (tx - cx) * sx;
        const ry = (ty - cy) * sy;
        const rad = ((transform.rotation ?? 0) * Math.PI) / 180;
        return {
          x: cx + rx * Math.cos(rad) - ry * Math.sin(rad),
          y: cy + rx * Math.sin(rad) + ry * Math.cos(rad),
        };
      });
    }

    const minX = Math.min(...transformed.map((p) => p.x));
    const minY = Math.min(...transformed.map((p) => p.y));
    const maxX = Math.max(...transformed.map((p) => p.x));
    const maxY = Math.max(...transformed.map((p) => p.y));

    return { minX, minY, maxX, maxY };
  },
  translate: (element, deltaX, deltaY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const hasTransform = element.data.transformMatrix || element.data.transform;

    if (hasTransform) {
      const currentMatrix = ensureMatrix(element.data);
      const translated = multiplyMatrix(translateMatrix(deltaX, deltaY), currentMatrix);
      return {
        ...element,
        data: {
          ...element.data,
          transformMatrix: translated.map((v) => parseFloat(v.toFixed(p))) as Matrix,
        },
      };
    }

    return {
      ...element,
      data: {
        ...element.data,
        x: parseFloat((element.data.x + deltaX).toFixed(p)),
        y: parseFloat((element.data.y + deltaY).toFixed(p)),
      },
    };
  },
  clone: (element) => ({
    ...element,
    data: JSON.parse(JSON.stringify(element.data)),
  }),
  serialize: (element) => {
    const {
      x,
      y,
      width,
      height,
      href,
      preserveAspectRatio,
      opacity,
      transformMatrix,
      transform,
      filterId,
      clipPathId,
      clipPathTemplateId,
    } = element.data;
    const attrs = [
      `id="${element.id}"`,
      `x="${x}"`,
      `y="${y}"`,
      `width="${width}"`,
      `height="${height}"`,
      `href="${href}"`,
      `preserveAspectRatio="${preserveAspectRatio ?? 'none'}"`,
    ];

    if (opacity !== undefined) {
      attrs.push(`opacity="${opacity}"`);
    }

    if (transformMatrix) {
      attrs.push(`transform="matrix(${transformMatrix.join(' ')})"`);
    } else if (transform) {
      const cx = x + width / 2;
      const cy = y + height / 2;
      attrs.push(`transform="translate(${transform.translateX ?? 0} ${transform.translateY ?? 0}) rotate(${transform.rotation ?? 0} ${cx} ${cy}) scale(${transform.scaleX ?? 1} ${transform.scaleY ?? 1})"`);
    }
    if (filterId) {
      attrs.push(`filter="url(#${filterId})"`);
    }
    const clipRef = clipPathId ?? clipPathTemplateId;
    if (clipRef) {
      attrs.push(`clip-path="url(#${clipRef})"`);
    }
    if ((element.data as { maskId?: string }).maskId) {
      attrs.push(`mask="url(#${(element.data as { maskId?: string }).maskId})"`);
    }

    const styleParts: string[] = [];
    if ((element.data as { mixBlendMode?: string }).mixBlendMode) {
      styleParts.push(`mix-blend-mode:${(element.data as { mixBlendMode?: string }).mixBlendMode}`);
    }
    if ((element.data as { isolation?: string }).isolation) {
      styleParts.push(`isolation:${(element.data as { isolation?: string }).isolation}`);
    }
    if (styleParts.length) {
      attrs.push(`style="${styleParts.join(';')}"`);
    }

    return `<image ${attrs.join(' ')} />`;
  },
  renderThumbnail: (element) => <ImageThumbnail element={element as ImageElement} />,
  scale: (element, scaleX, scaleY, centerX, centerY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const hasTransform = element.data.transformMatrix || element.data.transform;

    if (hasTransform) {
      const currentMatrix = ensureMatrix(element.data);
      const scaledMatrix = multiplyMatrix(scaleMatrix(scaleX, scaleY, centerX, centerY), currentMatrix);
      return {
        ...element,
        data: {
          ...element.data,
          transformMatrix: scaledMatrix.map((v) => parseFloat(v.toFixed(p))) as Matrix,
        },
      };
    }

    const { x, y, width, height } = element.data;

    const newX = parseFloat((centerX + (x - centerX) * scaleX).toFixed(p));
    const newY = parseFloat((centerY + (y - centerY) * scaleY).toFixed(p));
    const newWidth = parseFloat((width * scaleX).toFixed(p));
    const newHeight = parseFloat((height * scaleY).toFixed(p));

    return {
      ...element,
      data: {
        ...element.data,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      },
    };
  },
  rotate: (element, angleDegrees, centerX, centerY, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const currentMatrix = ensureMatrix(element.data);
    const rotationMatrix = rotateMatrix(angleDegrees, centerX, centerY);
    const composed = multiplyMatrix(rotationMatrix, currentMatrix);

    return {
      ...element,
      data: {
        ...element.data,
        transformMatrix: composed.map((v) => parseFloat(v.toFixed(p))) as Matrix,
      },
    };
  },
  applyAffine: (element, matrix, precision) => {
    const p = Number.isFinite(precision) ? precision : 3;
    const currentMatrix = ensureMatrix(element.data);
    const composed = multiplyMatrix(matrix as Matrix, currentMatrix);
    return {
      ...element,
      data: {
        ...element.data,
        transformMatrix: composed.map((v) => parseFloat(v.toFixed(p))) as [number, number, number, number, number, number],
      },
    };
  },
};

export const imagePlugin: PluginDefinition<CanvasStore> = {
  id: 'image',
  metadata: {
    label: 'Image',
    icon: ImageIcon,
    cursor: 'crosshair',
    pathCursorMode: 'pointer',
  },
  modeConfig: {
    description: 'Insert external images as SVG image elements.',
  },
  toolDefinition: { order: 16, visibility: 'always-shown', toolGroup: 'creation' },
  subscribedEvents: ['pointerdown'],
  handler: (_event, point, target, context) => {
    const state = context.store.getState();
    const imageState = state.image;

    if (!imageState?.url) {
      return;
    }

    // Disable creation if an image element is selected (editing mode)
    const hasImageSelected = state.selectedIds.some(id => {
      const element = state.elements.find(el => el.id === id);
      return element?.type === 'image';
    });
    if (hasImageSelected) {
      return;
    }

    if (target && 'classList' in target && !(target as Element).classList.contains('canvas-background') && (target as Element).tagName !== 'svg') {
      return;
    }

    const width = Math.max(1, imageState.width || 1);
    const height = Math.max(1, imageState.height || 1);
    const x = point.x - width / 2;
    const y = point.y - height / 2;

    state.addElement({
      type: 'image',
      data: {
        x,
        y,
        width,
        height,
        href: imageState.url,
        preserveAspectRatio: imageState.preserveAspectRatio,
        opacity: imageState.opacity,
      },
    });

    state.setActivePlugin('select');
  },
  slices: [imageSliceFactory],
  importers: [importImage],
  elementContributions: [imageElementContribution as unknown as ElementContribution],
  expandablePanel: () => React.createElement(ImagePanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('image', ImagePanel)],
};

