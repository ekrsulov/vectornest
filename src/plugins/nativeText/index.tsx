/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { Type } from 'lucide-react';
import type { PluginDefinition, PluginSliceFactory } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import { NativeTextPanel } from './NativeTextPanel';
import { createNativeTextSlice, type NativeTextPluginSlice } from './slice';
import { createInlineTextEditSlice, type InlineTextEditSlice } from './inlineEditSlice';
import { NativeTextRenderer } from './NativeTextRenderer';
import { InlineTextEditorOverlay } from './InlineTextEditorOverlay';
import { isMonoColor, transformMonoColor } from '../../utils/colorModeSyncUtils';
import type { ElementContribution } from '../../utils/elementContributionRegistry';
import type { NativeTextElement } from './types';
import type { PathElement } from '../../types';
import { measureNativeTextBounds } from '../../utils/measurementUtils';
import { shapeToNativeText } from './importer';
import { renderTextPaths } from './TextPathRenderer';
import { escapeXmlAttribute, escapeXmlText } from '../../utils/xmlEscapeUtils';
import { createPluginSlice } from '../../utils/pluginUtils';
import { pluginManager } from '../../utils/pluginManager';

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
const deriveMatrixFromTransform = (
  data: NativeTextElement['data']
): AffineMatrix | null => {
  const t = data.transform;
  if (!t) return null;
  const cx = data.x;
  const cy = data.y;
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

const applyTransformToBounds = (bounds: { minX: number; minY: number; maxX: number; maxY: number }, m?: AffineMatrix) => {
  if (!m) return bounds;
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
  const transformed = corners.map((pt) => ({
    x: m[0] * pt.x + m[2] * pt.y + m[4],
    y: m[1] * pt.x + m[3] * pt.y + m[5],
  }));
  return {
    minX: Math.min(...transformed.map((p) => p.x)),
    minY: Math.min(...transformed.map((p) => p.y)),
    maxX: Math.max(...transformed.map((p) => p.x)),
    maxY: Math.max(...transformed.map((p) => p.y)),
  };
};

const computeNativeTextThumbnailData = (element: NativeTextElement) => {
  const base = measureNativeTextBounds(element.data);
  const matrix = element.data.transformMatrix ?? deriveMatrixFromTransform(element.data);
  const transformed = matrix ? applyTransformToBounds(base, matrix) : base;
  const width = Math.max(1, transformed.maxX - transformed.minX);
  const height = Math.max(1, transformed.maxY - transformed.minY);
  const padding = Math.max(width, height) * 0.1;
  const viewBox = `${transformed.minX - padding} ${transformed.minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  const transform = matrix ? `matrix(${matrix.join(' ')})` : undefined;
  return { viewBox, transform };
};

const NativeTextThumbnail: React.FC<{ element: NativeTextElement }> = ({ element }) => {
  const { viewBox, transform } = computeNativeTextThumbnailData(element);
  const data = element.data;
  const lineHeight = data.lineHeight ?? 1.2;
  const textColor = useColorModeValue('#000', '#fff');
  const writingMode = data.writingMode === 'horizontal-tb' ? undefined : data.writingMode;
  const lines = (() => {
    if (data.spans && data.spans.length > 0) {
      const byLine = new Map<number, string>();
      data.spans.forEach((span) => {
        const current = byLine.get(span.line) ?? '';
        byLine.set(span.line, `${current}${span.text}`);
      });
      return Array.from(byLine.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, text]) => text);
    }
    const split = (data.text ?? '').split(/\r?\n/);
    return split.length > 0 ? split : ['TEXT'];
  })();

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
        <text
          x={data.x}
          y={data.y}
          textAnchor={data.textAnchor ?? 'start'}
          dominantBaseline={data.dominantBaseline}
          writingMode={writingMode}
          fontSize={data.fontSize}
          fontFamily={data.fontFamily}
          fontWeight={data.fontWeight ?? 'normal'}
          fontStyle={data.fontStyle ?? 'normal'}
          fill={textColor}
          stroke="none"
          transform={transform}
          style={data.textTransform && data.textTransform !== 'none'
            ? { textTransform: data.textTransform }
            : undefined}
        >
          {lines.map((line, idx) => (
            <tspan
              key={`${element.id}-thumb-line-${line}`}
              x={data.x}
              dy={idx === 0 ? 0 : data.fontSize * lineHeight}
            >
              {line || ' '}
            </tspan>
          ))}
        </text>
      </svg>
    </Box>
  );
};

const nativeTextSliceFactory: PluginSliceFactory<CanvasStore> = (set, get, api) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slice = createNativeTextSlice(set as any, get as any, api as any);
  return {
    state: slice,
  };
};

const inlineTextEditSliceFactory = createPluginSlice(createInlineTextEditSlice);

const nativeTextContribution: ElementContribution<NativeTextElement> = {
  type: 'nativeText',
  canvasRenderer: NativeTextRenderer,
  getBounds: (el) => {
    const base = measureNativeTextBounds(el.data);
    const matrix = el.data.transformMatrix ?? deriveMatrixFromTransform(el.data);
    if (matrix) return applyTransformToBounds(base, matrix);
    return base;
  },
  renderThumbnail: (el) => <NativeTextThumbnail element={el} />,
  translate: (el, dx, dy, p) => ({
    ...el,
    data: (() => {
      const hasTransform = el.data.transformMatrix || el.data.transform;
      const precision = Number.isFinite(p) ? p : 3;
      if (hasTransform) {
        const current = el.data.transformMatrix ?? deriveMatrixFromTransform(el.data) ?? identityMatrix();
        const translated = multiplyMatrix(translateMatrix(dx, dy), current);
        return {
          ...el.data,
          transformMatrix: translated.map((v) => parseFloat(v.toFixed(precision))) as AffineMatrix,
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
    data: {
      ...el.data,
      transformMatrix: m.map((v) => parseFloat(v.toFixed(p))) as AffineMatrix,
    },
  }),
  clone: (el) => ({ ...el, data: JSON.parse(JSON.stringify(el.data)) }),
  serialize: (el) => {
    const { x, y, text, richText, spans, fontSize, fontFamily, fontWeight, fontStyle, textDecoration, fillColor, fillOpacity, strokeColor, strokeWidth, strokeOpacity, strokeLinecap, strokeLinejoin, strokeDasharray, textAnchor, dominantBaseline, lineHeight, letterSpacing, textTransform, writingMode, transformMatrix, transform, filterId, clipPathId, clipPathTemplateId } = el.data;
    const attrs = [
      `id="${el.id}"`,
      `x="${x}"`,
      `y="${y}"`,
      `font-size="${fontSize}"`,
      `font-family="${fontFamily}"`,
      `font-weight="${fontWeight ?? 'normal'}"`,
      `font-style="${fontStyle ?? 'normal'}"`,
      `fill="${fillColor}"`,
      `fill-opacity="${fillOpacity ?? 1}"`,
      `stroke="${strokeColor ?? 'none'}"`,
      `stroke-width="${strokeWidth ?? 0}"`,
      `stroke-opacity="${strokeOpacity ?? 1}"`,
      `text-anchor="${textAnchor ?? 'start'}"`,
    ];
    if (el.data.opacity !== undefined) attrs.push(`opacity="${el.data.opacity}"`);
    if (textDecoration && textDecoration !== 'none') attrs.push(`text-decoration="${textDecoration}"`);
    if (dominantBaseline) attrs.push(`dominant-baseline="${dominantBaseline}"`);
    if (letterSpacing !== undefined) attrs.push(`letter-spacing="${letterSpacing}"`);
    if (textTransform && textTransform !== 'none') attrs.push(`text-transform="${textTransform}"`);
    if (writingMode && writingMode !== 'horizontal-tb') attrs.push(`writing-mode="${writingMode}"`);
    if (strokeLinecap) attrs.push(`stroke-linecap="${strokeLinecap}"`);
    if (strokeLinejoin) attrs.push(`stroke-linejoin="${strokeLinejoin}"`);
    if (strokeDasharray && strokeDasharray !== 'none') attrs.push(`stroke-dasharray="${strokeDasharray}"`);
    if (transformMatrix) {
      attrs.push(`transform="matrix(${transformMatrix.join(' ')})"`);
    } else if (transform) {
      const cx = x;
      const cy = y;
      attrs.push(`transform="translate(${transform.translateX ?? 0} ${transform.translateY ?? 0}) rotate(${transform.rotation ?? 0} ${cx} ${cy}) scale(${transform.scaleX ?? 1} ${transform.scaleY ?? 1})"`);
    }
    if (filterId) {
      attrs.push(`filter="url(#${filterId})"`);
    }
    const clipRef = clipPathId ?? clipPathTemplateId;
    if (clipRef) {
      attrs.push(`clip-path="url(#${clipRef})"`);
    }
    if ((el.data as { maskId?: string }).maskId) {
      attrs.push(`mask="url(#${(el.data as { maskId?: string }).maskId})"`);
    }
    const styleParts: string[] = [];
    if (el.data.mixBlendMode) styleParts.push(`mix-blend-mode:${el.data.mixBlendMode}`);
    if (el.data.isolation) styleParts.push(`isolation:${el.data.isolation}`);
    if (styleParts.length) {
      attrs.push(`style="${styleParts.join(';')}"`);
    }
    if (el.data.lengthAdjust) {
      attrs.push(`lengthAdjust="${el.data.lengthAdjust}"`);
    }
    if (el.data.textLength !== undefined) {
      attrs.push(`textLength="${el.data.textLength}"`);
    }
    if (el.data.direction) {
      attrs.push(`direction="${el.data.direction}"`);
    }
    if (el.data.unicodeBidi) {
      attrs.push(`unicode-bidi="${el.data.unicodeBidi}"`);
    }
    if (el.data.wordSpacing !== undefined) {
      attrs.push(`word-spacing="${el.data.wordSpacing}"`);
    }
    if (el.data.rotate && el.data.rotate.length > 0) {
      attrs.push(`rotate="${el.data.rotate.join(' ')}"`);
    }
    if (el.data.writingMode && el.data.writingMode !== 'horizontal-tb') {
      attrs.push(`writing-mode="${el.data.writingMode}"`);
    }
    const lh = lineHeight ?? 1.2;
    if (spans && spans.length > 0) {
      const tspanStr = spans.map((span, idx) => {
        const isLineStart = idx === 0 || span.line !== spans[idx - 1].line;
        const dy = isLineStart && span.line > 0
          ? ` dy="${fontSize * lh * (span.line - (spans[idx - 1]?.line ?? 0))}"`
          : '';
        const dx = span.dx ? ` dx="${span.dx}"` : '';
        const xAttr = isLineStart ? ` x="${x}"` : '';
        const styleAttrs = [
          span.fontWeight ? `font-weight="${span.fontWeight}"` : null,
          span.fontStyle ? `font-style="${span.fontStyle}"` : null,
          span.fontSize ? `font-size="${span.fontSize}"` : null,
          span.textDecoration && span.textDecoration !== 'none' ? `text-decoration="${span.textDecoration}"` : null,
          span.fillColor ? `fill="${span.fillColor}"` : null,
        ].filter(Boolean).join(' ');
        return `<tspan${xAttr}${dy}${dx}${styleAttrs ? ` ${styleAttrs}` : ''}>${escapeXmlText(span.text)}</tspan>`;
      }).join('');
      const richAttr = richText ? ` data-rich-text="${escapeXmlAttribute(encodeURIComponent(richText))}"` : '';
      return `<text ${attrs.join(' ')}${richAttr}>${tspanStr}</text>`;
    } else {
      const lines = (text || '').split(/\r?\n/);
      if (lines.length === 1) {
        return `<text ${attrs.join(' ')}>${escapeXmlText(text ?? '')}</text>`;
      }
      const tspans = lines.map((line, idx) => `<tspan x="${x}" dy="${idx === 0 ? 0 : fontSize * lh}">${escapeXmlText(line)}</tspan>`).join('');
      return `<text ${attrs.join(' ')}>${tspans}</text>`;
    }
  },
};

export const nativeTextPlugin: PluginDefinition<CanvasStore> = {
  id: 'nativeText',
  metadata: {
    label: 'Native Text',
    icon: Type,
    cursor: 'text',
  },
  importers: [
    (element, transform) => shapeToNativeText(element, transform),
  ],
  toolDefinition: { order: 15, visibility: 'always-shown', toolGroup: 'creation' },
  modeConfig: {
    description: 'Native text editing mode',
    exit: ['stopInlineTextEdit'],
  },
  behaviorFlags: {
    preventsSelection: false,
    hideSelectionBbox: false,
  },
  init: (context) => {
    // Register lifecycle action to stop inline editing when leaving nativeText mode
    const unregister = pluginManager.registerLifecycleAction(
      'onModeExit:nativeText',
      () => {
        const state = context.store.getState() as unknown as InlineTextEditSlice;
        if (state.inlineTextEdit?.editingElementId) {
          state.stopInlineTextEdit?.();
        }
      }
    );

    return () => {
      unregister();
    };
  },
  handler: (_event, point, target, context) => {
    const state = context.store.getState();
    const settings = (state as unknown as NativeTextPluginSlice).nativeText as NativeTextPluginSlice['nativeText'];
    const style = state.style;
    if (!settings) return;

    // Disable creation if a nativeText element is selected (editing mode)
    const hasNativeTextSelected = state.selectedIds.some(id => {
      const element = state.elements.find(el => el.id === id);
      return element?.type === 'nativeText';
    });
    // Also disable if a path with textPath is selected (editing text-on-path)
    const hasTextPathSelected = state.selectedIds.some(id => {
      const element = state.elements.find(el => el.id === id);
      return element?.type === 'path' && (element as PathElement).data.textPath;
    });
    if (hasNativeTextSelected || hasTextPathSelected) {
      return;
    }

    if (target && 'classList' in target && !(target as Element).classList.contains('canvas-background') && (target as Element).tagName !== 'svg') {
      return;
    }
    state.addElement({
      type: 'nativeText',
      data: {
        x: point.x,
        y: point.y,
        text: settings.spans && settings.spans.length > 0
          ? settings.spans.reduce((acc, span, idx) => {
            if (idx > 0 && span.line !== settings.spans![idx - 1].line) {
              return `${acc}\n${span.text}`;
            }
            return `${acc}${span.text}`;
          }, '')
          : settings.text,
        richText: settings.richText,
        spans: settings.spans,
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        fontWeight: settings.fontWeight ?? 'normal',
        fontStyle: settings.fontStyle ?? 'normal',
        textDecoration: settings.textDecoration ?? 'none',
        fillColor: style?.fillColor === 'none' ? (style?.strokeColor ?? '#000000') : (style?.fillColor ?? '#000000'),
        fillOpacity: style?.fillOpacity ?? 1,
        strokeColor: 'none',
        strokeWidth: 0,
        strokeOpacity: style?.strokeOpacity ?? 1,
        strokeLinecap: style?.strokeLinecap,
        strokeLinejoin: style?.strokeLinejoin,
        strokeDasharray: style?.strokeDasharray,
        textAnchor: settings.textAnchor,
        dominantBaseline: settings.dominantBaseline,
        lineHeight: settings.lineHeight,
        letterSpacing: settings.letterSpacing,
        textTransform: settings.textTransform,
        writingMode: settings.writingMode,
        filterId: undefined,
      },
    });
    state.setActivePlugin('select');
  },
  onColorModeChange: ({ nextColorMode, store }) => {
    const state = store.getState();
    const transformColor = (color?: string | null) => (color && isMonoColor(color) ? transformMonoColor(color, nextColorMode) : color);

    state.elements.forEach((element) => {
      if (element.type !== 'nativeText') return;

      const data = element.data as NativeTextElement['data'];
      const updates: Partial<NativeTextElement['data']> = {};

      const nextFill = transformColor(data.fillColor);
      if (nextFill && nextFill !== data.fillColor) {
        updates.fillColor = nextFill;
      }

      const nextStroke = transformColor(data.strokeColor);
      if (nextStroke && nextStroke !== data.strokeColor) {
        updates.strokeColor = nextStroke;
      }

      if (data.spans?.length) {
        let spansChanged = false;
        const spans = data.spans.map((span) => {
          const nextSpanFill = transformColor(span.fillColor);
          if (nextSpanFill && nextSpanFill !== span.fillColor) {
            spansChanged = true;
            return { ...span, fillColor: nextSpanFill };
          }
          return span;
        });

        if (spansChanged) {
          updates.spans = spans;
        }
      }

      if (Object.keys(updates).length > 0) {
        state.updateElement?.(element.id, { data: { ...data, ...updates } });
      }
    });
  },
  onElementDoubleClick: (elementId, _event, context) => {
    const state = context.store.getState();
    const element = state.elements.find(el => el.id === elementId);
    if (!element || element.type !== 'nativeText') return;

    // Start inline text editing
    const inlineState = state as unknown as InlineTextEditSlice;
    inlineState.startInlineTextEdit?.(elementId);
  },
  onCanvasDoubleClick: (_event, context) => {
    // If currently inline editing, stop and go back to select
    const state = context.store.getState();
    const inlineState = state as unknown as InlineTextEditSlice;
    if (inlineState.inlineTextEdit?.editingElementId) {
      inlineState.stopInlineTextEdit?.();
    }
    state.setActivePlugin('select');
  },
  createApi: ({ store }) => ({
    startInlineEdit: (elementId: string) => {
      const state = store.getState() as unknown as InlineTextEditSlice;
      state.startInlineTextEdit?.(elementId);
    },
    stopInlineEdit: () => {
      const state = store.getState() as unknown as InlineTextEditSlice;
      state.stopInlineTextEdit?.();
    },
  }),
  slices: [nativeTextSliceFactory, inlineTextEditSliceFactory],
  elementContributions: [nativeTextContribution as ElementContribution],
  canvasLayers: [
    {
      id: 'native-textpaths',
      placement: 'midground',
      render: (ctx) => renderTextPaths(ctx),
    },
  ],
  canvasOverlays: [
    {
      id: 'nativeText-inline-editor',
      component: InlineTextEditorOverlay,
    },
  ],
  expandablePanel: () => React.createElement(NativeTextPanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('nativeText', NativeTextPanel)],
};

