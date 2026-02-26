/**
 * LineGizmo — On-canvas editing handles for the line native shape.
 *
 * Provides:
 *  • Endpoint 1 (x1, y1) handle
 *  • Endpoint 2 (x2, y2) handle
 *  • Midpoint label with length
 */

import React, { useMemo, useCallback } from 'react';
import {
  CircleHandle,
  GizmoValueLabel,
  GIZMO_ACCENT,
  GIZMO_WARNING,
} from './GizmoHandle';
import { useGizmoDrag } from './useGizmoDrag';
import type { NativeShapeElement } from '../types';
import type { Point, Viewport } from '../../../types';

interface LineGizmoProps {
  data: NativeShapeElement['data'];
  viewport: Viewport;
  onUpdate: (patch: Partial<NativeShapeElement['data']>) => void;
  localToWorld: (point: Point) => Point;
  worldToLocal: (point: Point) => Point;
}

export const LineGizmo: React.FC<LineGizmoProps> = React.memo(({ data, viewport, onUpdate, localToWorld, worldToLocal }) => {
  const x1 = data.x;
  const y1 = data.y;
  const x2 = data.x + data.width;
  const y2 = data.y + data.height;

  const length = Math.sqrt(data.width ** 2 + data.height ** 2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const fmt = useCallback((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)), []);

  // Drag endpoint 1
  const ep1Callbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        // x = x1, width = x2 - x1 → keep x2 fixed
        const newX = Math.round(canvasPoint.x);
        const newY = Math.round(canvasPoint.y);
        onUpdate({
          x: newX,
          y: newY,
          width: x2 - newX,
          height: y2 - newY,
        });
      },
    }),
    [x2, y2, onUpdate],
  );
  const { handlePointerDown: onEp1Down } = useGizmoDrag(viewport, ep1Callbacks, { pointTransform: worldToLocal });

  // Drag endpoint 2
  const ep2Callbacks = useMemo(
    () => ({
      onDrag: (canvasPoint: { x: number; y: number }) => {
        const newX2 = Math.round(canvasPoint.x);
        const newY2 = Math.round(canvasPoint.y);
        onUpdate({
          width: newX2 - x1,
          height: newY2 - y1,
        });
      },
    }),
    [x1, y1, onUpdate],
  );
  const { handlePointerDown: onEp2Down } = useGizmoDrag(viewport, ep2Callbacks, { pointTransform: worldToLocal });

  const ep1World = localToWorld({ x: x1, y: y1 });
  const ep2World = localToWorld({ x: x2, y: y2 });
  const midWorld = localToWorld({ x: midX, y: midY - 10 / viewport.zoom });

  return (
    <g>
      {/* Endpoint 1 */}
      <CircleHandle
        cx={ep1World.x}
        cy={ep1World.y}
        zoom={viewport.zoom}
        color={GIZMO_ACCENT}
        label={`(${fmt(x1)}, ${fmt(y1)})`}
        cursor="move"
        onPointerDown={onEp1Down}
      />

      {/* Endpoint 2 */}
      <CircleHandle
        cx={ep2World.x}
        cy={ep2World.y}
        zoom={viewport.zoom}
        color={GIZMO_WARNING}
        label={`(${fmt(x2)}, ${fmt(y2)})`}
        cursor="move"
        onPointerDown={onEp2Down}
      />

      {/* Length label at midpoint */}
      <GizmoValueLabel
        x={midWorld.x}
        y={midWorld.y}
        value={`L ${fmt(length)}`}
        zoom={viewport.zoom}
      />
    </g>
  );
});
LineGizmo.displayName = 'LineGizmo';
