import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { GlyphsPluginSlice } from './slice';
import type { NativeTextElement } from '../nativeText/types';
import type { PathElement } from '../../types';
import { measureGlyphs, updateGlyphInSpans } from './glyphUtils';

type GlyphsStore = CanvasStore & GlyphsPluginSlice;
type GlyphTarget =
  | { kind: 'nativeText'; element: NativeTextElement }
  | { kind: 'textPath'; element: PathElement };

const HANDLE_SIZE = 7;
const ROTATE_HANDLE_OFFSET = 20;

export const GlyphsOverlay: React.FC = () => {
  const {
    activePlugin, selectedIds, elements, zoom,
    glyphsState, updateGlyphsState,
  } = useCanvasStore(
    useShallow((s) => {
      const st = s as GlyphsStore;
      return {
        activePlugin: s.activePlugin,
        selectedIds: s.selectedIds,
        elements: s.elements,
        zoom: s.viewport.zoom,
        glyphsState: st.glyphs,
        updateGlyphsState: st.updateGlyphsState,
      };
    })
  );

  const dragStartRef = useRef<{
    glyphIndex: number;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
    origRotate: number;
    mode: 'position' | 'rotate';
    centerX: number;
    centerY: number;
    startAngle: number;
  } | null>(null);

  // Find selected nativeText element
  const target = useMemo<GlyphTarget | null>(() => {
    if (activePlugin !== 'glyphs') return null;
    if (selectedIds.length !== 1) return null;
    const el = elements.find((e) => e.id === selectedIds[0]);
    if (!el) return null;
    if (el.type === 'nativeText') {
      return { kind: 'nativeText', element: el as NativeTextElement };
    }
    if (el.type === 'path' && (el as PathElement).data.textPath?.text) {
      return { kind: 'textPath', element: el as PathElement };
    }
    return null;
  }, [activePlugin, selectedIds, elements]);

  // Measure glyphs when element changes
  useEffect(() => {
    if (!target) {
      if (glyphsState?.targetElementId) {
        updateGlyphsState?.({ glyphs: [], targetElementId: null, selectedGlyphIndex: null });
      }
      return;
    }

    // Schedule measurement after render
    const raf = requestAnimationFrame(() => {
      const targetData = target.kind === 'nativeText' ? target.element.data : target.element.data.textPath;
      if (!targetData) return;
      const measured = measureGlyphs(target.element.id, targetData);
      updateGlyphsState?.({ glyphs: measured, targetElementId: target.element.id });
    });
    return () => cancelAnimationFrame(raf);
  }, [target, updateGlyphsState, glyphsState?.targetElementId]);

  const invZoom = 1 / zoom;
  const glyphs = useMemo(() => glyphsState?.glyphs ?? [], [glyphsState?.glyphs]);
  const selectedGlyphIndex = glyphsState?.selectedGlyphIndex ?? null;
  const showLabels = glyphsState?.showLabels ?? true;
  const dragMode = glyphsState?.dragMode ?? 'position';

  // Get the text element's transform to wrap the overlay
  const textTransform = useMemo(() => {
    if (!target) return undefined;
    if (target.kind === 'nativeText') {
      const data = target.element.data;
      if (data.transformMatrix) {
        return `matrix(${data.transformMatrix.join(' ')})`;
      }
      if (data.transform) {
        const cx = data.x;
        const cy = data.y;
        return `translate(${data.transform.translateX ?? 0} ${data.transform.translateY ?? 0}) rotate(${data.transform.rotation ?? 0} ${cx} ${cy}) scale(${data.transform.scaleX ?? 1} ${data.transform.scaleY ?? 1})`;
      }
      return undefined;
    }

    const pathData = target.element.data;
    const textPath = pathData.textPath;
    if (textPath?.transformMatrix) {
      return `matrix(${textPath.transformMatrix.join(' ')})`;
    }
    if (pathData.transformMatrix) {
      return `matrix(${pathData.transformMatrix.join(' ')})`;
    }
    if (pathData.transform) {
      return `translate(${pathData.transform.translateX ?? 0} ${pathData.transform.translateY ?? 0}) rotate(${pathData.transform.rotation ?? 0}) scale(${pathData.transform.scaleX ?? 1} ${pathData.transform.scaleY ?? 1})`;
    }
    return undefined;
  }, [target]);

  const handleGlyphSelect = useCallback((idx: number) => {
    updateGlyphsState?.({ selectedGlyphIndex: idx });
  }, [updateGlyphsState]);

  const applyGlyphUpdate = useCallback((glyphIndex: number, updates: { dx?: number; dy?: number; rotate?: number }) => {
    if (!target) return;
    const state = useCanvasStore.getState();
    const targetData = target.kind === 'nativeText'
      ? target.element.data
      : target.element.data.textPath;
    if (!targetData) return;
    const newSpans = updateGlyphInSpans(targetData, glyphIndex, updates);
    if (!newSpans) return;

    if (target.kind === 'nativeText') {
      state.updateElement(target.element.id, {
        data: { ...target.element.data, spans: newSpans },
      });
      return;
    }

    state.updateElement(target.element.id, {
      data: {
        ...target.element.data,
        textPath: {
          ...target.element.data.textPath,
          spans: newSpans,
        },
      },
    });
  }, [target]);

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    glyphIdx: number,
    mode: 'position' | 'rotate',
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!target) return;

    const glyph = glyphs[glyphIdx];
    if (!glyph?.bbox) return;

    updateGlyphsState?.({ selectedGlyphIndex: glyphIdx, isDragging: true });

    const svgCanvas = document.querySelector('svg[data-canvas="true"]') as SVGSVGElement | null;
    if (!svgCanvas) return;
    const targetElementId = target.element.id;

    const textEl = svgCanvas.querySelector<SVGTextElement>(
      `text[data-element-id="${CSS.escape(targetElementId)}"]`
    );
    if (!textEl) return;

    const ctm = textEl.getCTM();

    const screenToLocal = (sx: number, sy: number) => {
      if (!ctm) {
        const rect = svgCanvas.getBoundingClientRect();
        const vp = useCanvasStore.getState().viewport;
        return {
          x: (sx - rect.left - vp.panX) / vp.zoom,
          y: (sy - rect.top - vp.panY) / vp.zoom,
        };
      }
      const pt = svgCanvas.createSVGPoint();
      pt.x = sx;
      pt.y = sy;
      const localPt = pt.matrixTransform(ctm.inverse());
      return { x: localPt.x, y: localPt.y };
    };

    const cx = glyph.bbox.x + glyph.bbox.width / 2;
    const cy = glyph.bbox.y + glyph.bbox.height / 2;
    const startLocal = screenToLocal(e.clientX, e.clientY);
    const startAngle = mode === 'rotate'
      ? Math.atan2(startLocal.y - cy, startLocal.x - cx) * (180 / Math.PI)
      : 0;

    dragStartRef.current = {
      glyphIndex: glyphIdx,
      startX: e.clientX,
      startY: e.clientY,
      origDx: glyph.dx,
      origDy: glyph.dy,
      origRotate: glyph.rotate,
      mode,
      centerX: cx,
      centerY: cy,
      startAngle,
    };

    const onMove = (ev: PointerEvent) => {
      const ds = dragStartRef.current;
      if (!ds) return;

      const currentLocal = screenToLocal(ev.clientX, ev.clientY);
      const startLocal2 = screenToLocal(ds.startX, ds.startY);

      if (ds.mode === 'position') {
        const deltaX = currentLocal.x - startLocal2.x;
        const deltaY = currentLocal.y - startLocal2.y;
        const newDx = Math.round((ds.origDx + deltaX) * 100) / 100;
        const newDy = Math.round((ds.origDy + deltaY) * 100) / 100;

        applyGlyphUpdate(ds.glyphIndex, { dx: newDx, dy: newDy });
      } else {
        const angle = Math.atan2(
          currentLocal.y - ds.centerY,
          currentLocal.x - ds.centerX,
        ) * (180 / Math.PI);
        const deltaAngle = angle - ds.startAngle;
        const newRotate = Math.round((ds.origRotate + deltaAngle) * 10) / 10;
        applyGlyphUpdate(ds.glyphIndex, { rotate: newRotate });
      }
    };

    const onUp = () => {
      dragStartRef.current = null;
      updateGlyphsState?.({ isDragging: false });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [glyphs, target, updateGlyphsState, applyGlyphUpdate]);

  if (!target || glyphs.length === 0) return null;

  const handleSize = HANDLE_SIZE * invZoom;
  const rotateOffset = ROTATE_HANDLE_OFFSET * invZoom;
  const labelSize = 10 * invZoom;

  return (
    <g className="glyphs-overlay" transform={textTransform}>
      {glyphs.map((glyph, idx) => {
        if (!glyph.bbox || glyph.char.trim().length === 0) return null;
        const isSelected = idx === selectedGlyphIndex;
        const { x, y, width, height } = glyph.bbox;
        const cx = x + width / 2;
        const cy = y + height / 2;

        return (
          <g key={idx}>
            {/* Glyph bounding box */}
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill={isSelected ? 'rgba(66, 153, 225, 0.15)' : 'transparent'}
              stroke={isSelected ? '#4299E1' : '#A0AEC0'}
              strokeWidth={1 * invZoom}
              strokeDasharray={isSelected ? 'none' : `${3 * invZoom} ${2 * invZoom}`}
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onClick={(e) => {
                e.stopPropagation();
                handleGlyphSelect(idx);
              }}
              onPointerDown={(e) => {
                if (dragMode === 'position') {
                  handlePointerDown(e, idx, 'position');
                }
              }}
            />

            {/* Label */}
            {showLabels && (
              <g pointerEvents="none">
                <rect
                  x={x + width - labelSize * 0.8}
                  y={y}
                  width={labelSize * 1.3}
                  height={labelSize}
                  rx={2 * invZoom}
                  fill={isSelected ? '#4299E1' : '#718096'}
                  opacity={0.85}
                />
                <text
                  x={x + width - labelSize * 0.15}
                  y={y + labelSize * 0.78}
                  fontSize={labelSize * 0.7}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="auto"
                  style={{ pointerEvents: 'none', fontFamily: 'monospace' }}
                >
                  {idx}
                </text>
              </g>
            )}

            {/* Drag handle (position) - center cross */}
            {isSelected && (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={handleSize}
                  fill="#4299E1"
                  stroke="white"
                  strokeWidth={1.5 * invZoom}
                  style={{ cursor: 'move', pointerEvents: 'all' }}
                  onPointerDown={(e) => handlePointerDown(e, idx, 'position')}
                />

                {/* Rotate handle - above the glyph */}
                <line
                  x1={cx}
                  y1={y}
                  x2={cx}
                  y2={y - rotateOffset}
                  stroke="#ED8936"
                  strokeWidth={1.5 * invZoom}
                  pointerEvents="none"
                />
                <circle
                  cx={cx}
                  cy={y - rotateOffset}
                  r={handleSize * 0.8}
                  fill="#ED8936"
                  stroke="white"
                  strokeWidth={1.5 * invZoom}
                  style={{ cursor: 'grab', pointerEvents: 'all' }}
                  onPointerDown={(e) => handlePointerDown(e, idx, 'rotate')}
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
};
