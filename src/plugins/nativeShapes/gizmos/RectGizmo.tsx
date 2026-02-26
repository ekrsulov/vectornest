/**
 * RectGizmo — On-canvas editing handles for rect and square native shapes.
 *
 * Provides:
 *  • Corner radius handle (rx/ry) – draggable diamond at top-right inner corner
 *  • Width/Height dimension labels
 */

import React, { useCallback, useMemo } from 'react';
import {
  CircleHandle,
  DiamondHandle,
  GizmoDashedLine,
  GizmoValueLabel,
  GIZMO_ACCENT,
  GIZMO_ACCENT_ALT,
} from './GizmoHandle';
import { useGizmoDrag } from './useGizmoDrag';
import type { NativeShapeElement } from '../types';
import type { Point, Viewport } from '../../../types';

interface RectGizmoProps {
  data: NativeShapeElement['data'];
  viewport: Viewport;
  onUpdate: (patch: Partial<NativeShapeElement['data']>) => void;
  localToWorld: (point: Point) => Point;
  worldToLocal: (point: Point) => Point;
}

export const RectGizmo: React.FC<RectGizmoProps> = React.memo(({ data, viewport, onUpdate, localToWorld, worldToLocal }) => {
  const { x, y, width: w, height: h } = data;
  const isSquare = data.kind === 'square';
  const size = isSquare ? Math.min(w, h) : undefined;
  const effectiveW = size ?? w;
  const effectiveH = size ?? h;
  const maxR = Math.min(effectiveW, effectiveH) / 2;
  const rx = Math.min(data.rx ?? 0, maxR);

  // Corner radius handle position: along the top edge, inset from the right
  const handleX = x + effectiveW - rx;
  const handleY = y;

  const cornerRadiusCallbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        // Distance from the right edge = rx
        const newRx = Math.max(0, Math.min(maxR, x + effectiveW - canvasPoint.x));
        const rounded = Math.round(newRx * 10) / 10;
        onUpdate({ rx: rounded, ry: rounded });
      },
    }),
    [maxR, x, effectiveW, onUpdate],
  );

  const { handlePointerDown: onCornerDown } = useGizmoDrag(viewport, cornerRadiusCallbacks, { pointTransform: worldToLocal });

  // Width handle: midpoint of right edge
  const widthHandleCallbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        const newW = Math.max(1, Math.round(canvasPoint.x - x));
        if (isSquare) {
          onUpdate({ width: newW, height: newW });
        } else {
          onUpdate({ width: newW });
        }
      },
    }),
    [x, isSquare, onUpdate],
  );
  const { handlePointerDown: onWidthDown } = useGizmoDrag(viewport, widthHandleCallbacks, { pointTransform: worldToLocal });

  // Height handle: midpoint of bottom edge
  const heightHandleCallbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        const newH = Math.max(1, Math.round(canvasPoint.y - y));
        if (isSquare) {
          onUpdate({ width: newH, height: newH });
        } else {
          onUpdate({ height: newH });
        }
      },
    }),
    [y, isSquare, onUpdate],
  );
  const { handlePointerDown: onHeightDown } = useGizmoDrag(viewport, heightHandleCallbacks, { pointTransform: worldToLocal });

  const fmt = useCallback((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)), []);

  const cornerHandle = localToWorld({ x: handleX, y: handleY });
  const widthHandle = localToWorld({ x: x + effectiveW, y: y + effectiveH / 2 });
  const heightHandle = localToWorld({ x: x + effectiveW / 2, y: y + effectiveH });
  const radiusLabel = localToWorld({ x: x + effectiveW + 14 / viewport.zoom, y: y + 14 / viewport.zoom });
  const radiusTopStart = localToWorld({ x: x + effectiveW - rx, y });
  const radiusTopEnd = localToWorld({ x: x + effectiveW, y });
  const radiusRightEnd = localToWorld({ x: x + effectiveW, y: y + rx });

  return (
    <g>
      {/* Corner-radius visual arc */}
      {rx > 0.5 && (
        <>
          <GizmoDashedLine
            x1={radiusTopStart.x}
            y1={radiusTopStart.y}
            x2={radiusTopEnd.x}
            y2={radiusTopEnd.y}
            zoom={viewport.zoom}
            color={GIZMO_ACCENT_ALT}
          />
          <GizmoDashedLine
            x1={radiusTopEnd.x}
            y1={radiusTopEnd.y}
            x2={radiusRightEnd.x}
            y2={radiusRightEnd.y}
            zoom={viewport.zoom}
            color={GIZMO_ACCENT_ALT}
          />
        </>
      )}

      {/* Corner radius handle */}
      <DiamondHandle
        cx={cornerHandle.x}
        cy={cornerHandle.y}
        zoom={viewport.zoom}
        cursor="ew-resize"
        onPointerDown={onCornerDown}
      />

      {/* Width handle — right edge mid */}
      <CircleHandle
        cx={widthHandle.x}
        cy={widthHandle.y}
        zoom={viewport.zoom}
        color={GIZMO_ACCENT}
        label={`W: ${fmt(effectiveW)}`}
        cursor="ew-resize"
        onPointerDown={onWidthDown}
      />

      {/* Height handle — bottom edge mid */}
      <CircleHandle
        cx={heightHandle.x}
        cy={heightHandle.y}
        zoom={viewport.zoom}
        color={GIZMO_ACCENT}
        label={`H: ${fmt(effectiveH)}`}
        cursor="ns-resize"
        onPointerDown={onHeightDown}
      />

      {/* Corner radius value badge (always visible when rx > 0) */}
      {rx > 0.5 && (
        <GizmoValueLabel
          x={radiusLabel.x}
          y={radiusLabel.y}
          value={`r ${fmt(rx)}`}
          zoom={viewport.zoom}
        />
      )}
    </g>
  );
});
RectGizmo.displayName = 'RectGizmo';
