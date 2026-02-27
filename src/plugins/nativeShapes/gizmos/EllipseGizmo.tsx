/**
 * EllipseGizmo — On-canvas editing handles for circle and ellipse native shapes.
 *
 * Provides:
 *  • Radius-X handle (right edge midpoint, horizontal drag)
 *  • Radius-Y handle (bottom edge midpoint, vertical drag)
 *  • For circle: a single radius handle at 45° that constrains both axes
 */

import React, { useMemo, useCallback } from 'react';
import {
  CircleHandle,
  GizmoDashedLine,
  GizmoValueLabel,
} from './GizmoHandle';
import { useGizmoDrag } from './useGizmoDrag';
import type { NativeShapeElement } from '../types';
import type { Point, Viewport } from '../../../types';
import {
  getContrastingColor,
  type SelectionFeedbackPalette,
} from '../../../utils/canvasColorUtils';

interface EllipseGizmoProps {
  data: NativeShapeElement['data'];
  viewport: Viewport;
  onUpdate: (patch: Partial<NativeShapeElement['data']>) => void;
  localToWorld: (point: Point) => Point;
  worldToLocal: (point: Point) => Point;
  colors: SelectionFeedbackPalette;
}

export const EllipseGizmo: React.FC<EllipseGizmoProps> = React.memo(({ data, viewport, onUpdate, localToWorld, worldToLocal, colors }) => {
  const { x, y, width: w, height: h } = data;
  const isCircle = data.kind === 'circle';
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = isCircle ? Math.min(w, h) / 2 : w / 2;
  const ry = isCircle ? Math.min(w, h) / 2 : h / 2;

  const fmt = useCallback((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)), []);
  const radiusLineColor = useMemo(() => {
    const fillColor = data.fillColor ?? 'none';
    const fillOpacity = data.fillOpacity ?? 1;
    const hasVisibleSolidFill =
      fillOpacity > 0 &&
      fillColor !== 'none' &&
      fillColor !== 'transparent' &&
      /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(fillColor);

    if (hasVisibleSolidFill) {
      return getContrastingColor(fillColor);
    }

    return isCircle ? colors.lineStrong : colors.line;
  }, [data.fillColor, data.fillOpacity, isCircle, colors.line, colors.lineStrong]);

  // For circle: single handle at 0° (right)
  const circleRadiusCallbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        const dist = Math.max(1, Math.sqrt(
          (canvasPoint.x - cx) ** 2 + (canvasPoint.y - cy) ** 2,
        ));
        const diameter = Math.round(dist * 2);
        onUpdate({ width: diameter, height: diameter });
      },
    }),
    [cx, cy, onUpdate],
  );
  const { handlePointerDown: onCircleRadiusDown } = useGizmoDrag(viewport, circleRadiusCallbacks, { pointTransform: worldToLocal });

  // For ellipse: RX handle (right)
  const rxCallbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        const newRx = Math.max(1, canvasPoint.x - cx);
        onUpdate({ width: Math.round(newRx * 2) });
      },
    }),
    [cx, onUpdate],
  );
  const { handlePointerDown: onRxDown } = useGizmoDrag(viewport, rxCallbacks, { pointTransform: worldToLocal });

  // For ellipse: RY handle (bottom)
  const ryCallbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        const newRy = Math.max(1, canvasPoint.y - cy);
        onUpdate({ height: Math.round(newRy * 2) });
      },
    }),
    [cy, onUpdate],
  );
  const { handlePointerDown: onRyDown } = useGizmoDrag(viewport, ryCallbacks, { pointTransform: worldToLocal });

  const center = localToWorld({ x: cx, y: cy });
  const right = localToWorld({ x: cx + rx, y: cy });
  const bottom = localToWorld({ x: cx, y: cy + ry });
  const circleLabel = localToWorld({ x: cx + rx / 2, y: cy - 10 / viewport.zoom });
  const ellipseRxLabel = localToWorld({ x: cx + rx / 2, y: cy - 10 / viewport.zoom });
  const ellipseRyLabel = localToWorld({ x: cx + 12 / viewport.zoom, y: cy + ry / 2 });

  if (isCircle) {
    return (
      <g>
        {/* Cross-hair at center */}
        <GizmoDashedLine x1={center.x} y1={center.y} x2={right.x} y2={right.y} zoom={viewport.zoom} color={radiusLineColor} />
        <GizmoDashedLine x1={center.x} y1={center.y} x2={bottom.x} y2={bottom.y} zoom={viewport.zoom} color={radiusLineColor} />

        {/* Radius handle at right */}
        <CircleHandle
          cx={right.x}
          cy={right.y}
          zoom={viewport.zoom}
          color={colors.primary}
          cursor="ew-resize"
          onPointerDown={onCircleRadiusDown}
        />

        {/* Radius value */}
        <GizmoValueLabel
          x={circleLabel.x}
          y={circleLabel.y}
          value={`r ${fmt(rx)}`}
          zoom={viewport.zoom}
          color="#fff"
        />
      </g>
    );
  }

  // Ellipse
  return (
    <g>
      {/* Axis lines from center */}
      <GizmoDashedLine x1={center.x} y1={center.y} x2={right.x} y2={right.y} zoom={viewport.zoom} color={radiusLineColor} />
      <GizmoDashedLine x1={center.x} y1={center.y} x2={bottom.x} y2={bottom.y} zoom={viewport.zoom} color={radiusLineColor} />

      {/* RX handle */}
      <CircleHandle
        cx={right.x}
        cy={right.y}
        zoom={viewport.zoom}
        color={colors.primary}
        cursor="ew-resize"
        onPointerDown={onRxDown}
      />

      {/* RY handle */}
      <CircleHandle
        cx={bottom.x}
        cy={bottom.y}
        zoom={viewport.zoom}
        color={colors.secondary}
        cursor="ns-resize"
        onPointerDown={onRyDown}
      />

      {/* Dimension labels */}
      <GizmoValueLabel
        x={ellipseRxLabel.x}
        y={ellipseRxLabel.y}
        value={`rx ${fmt(rx)}`}
        zoom={viewport.zoom}
        color="#fff"
      />
      <GizmoValueLabel
        x={ellipseRyLabel.x}
        y={ellipseRyLabel.y}
        value={`ry ${fmt(ry)}`}
        zoom={viewport.zoom}
        color="#fff"
      />
    </g>
  );
});
EllipseGizmo.displayName = 'EllipseGizmo';
