/**
 * PolygonGizmo — On-canvas editing handles for polygon native shapes.
 *
 * Provides:
 *  • Draggable vertex handles for each polygon point
 *  • Center handle (move entire shape)
 *  • Points count adjust handles (+/−) near top
 *  • Visual edge lines
 */

import React, { useMemo, useCallback } from 'react';
import {
  CircleHandle,
  DiamondHandle,
  GizmoValueLabel,
  GizmoDashedLine,
  GIZMO_ACCENT,
  GIZMO_SUCCESS,
  GIZMO_WARNING,
} from './GizmoHandle';
import { useGizmoDrag } from './useGizmoDrag';
import type { NativeShapeElement } from '../types';
import type { Point, Viewport } from '../../../types';
import { convertNativeShapeKind } from '../index';

interface PolygonVertexHandleProps {
  index: number;
  point: Point;
  label: string;
  viewport: Viewport;
  worldToLocal: (point: Point) => Point;
  onDragVertex: (index: number, localPoint: Point) => void;
}

const PolygonVertexHandle: React.FC<PolygonVertexHandleProps> = React.memo(
  ({ index, point, label, viewport, worldToLocal, onDragVertex }) => {
    const callbacks = useMemo(
      () => ({
        onDrag: (localPoint: Point) => {
          onDragVertex(index, localPoint);
        },
      }),
      [index, onDragVertex],
    );

    const { handlePointerDown } = useGizmoDrag(viewport, callbacks, { pointTransform: worldToLocal });

    return (
      <CircleHandle
        cx={point.x}
        cy={point.y}
        zoom={viewport.zoom}
        color={GIZMO_ACCENT}
        label={label}
        cursor="move"
        onPointerDown={handlePointerDown}
      />
    );
  },
);
PolygonVertexHandle.displayName = 'PolygonVertexHandle';

interface PolygonGizmoProps {
  data: NativeShapeElement['data'];
  viewport: Viewport;
  onUpdate: (patch: Partial<NativeShapeElement['data']>) => void;
  localToWorld: (point: Point) => Point;
  worldToLocal: (point: Point) => Point;
}

const COUNT_CONTROL_Y_OFFSET = 34;
const COUNT_CONTROL_X_OFFSET = 36;

export const PolygonGizmo: React.FC<PolygonGizmoProps> = React.memo(({ data, viewport, onUpdate, localToWorld, worldToLocal }) => {
  const points = useMemo(() => data.points ?? [], [data.points]);
  const pointsCount = data.pointsCount ?? 3;

  // Compute centroid
  const centroid = useMemo(() => {
    if (!points.length) return { x: data.x + data.width / 2, y: data.y + data.height / 2 };
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }, [points, data.x, data.y, data.width, data.height]);

  const fmt = useCallback((v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)), []);

  // Uniform scale from centroid handle
  const scaleCallbacks = useMemo(
    () => ({
      onDrag: (_canvasPoint: Point, startPoint: Point, delta: Point) => {
        if (!points.length) return;
        // Compute the distance ratio from centroid
        const startDist = Math.sqrt(
          (startPoint.x - centroid.x) ** 2 + (startPoint.y - centroid.y) ** 2,
        );
        if (startDist < 1) return;
        const curDist = startDist + delta.x; // Use horizontal delta for simplicity
        const ratio = Math.max(0.1, curDist / startDist);
        const newPoints = points.map(p => ({
          x: centroid.x + (p.x - centroid.x) * ratio,
          y: centroid.y + (p.y - centroid.y) * ratio,
        }));
        // Recompute bounds
        const minX = Math.min(...newPoints.map(p => p.x));
        const minY = Math.min(...newPoints.map(p => p.y));
        const maxX = Math.max(...newPoints.map(p => p.x));
        const maxY = Math.max(...newPoints.map(p => p.y));
        onUpdate({
          points: newPoints,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });
      },
    }),
    [points, centroid, onUpdate],
  );
  const { handlePointerDown: onScaleDown } = useGizmoDrag(viewport, scaleCallbacks, { pointTransform: worldToLocal });

  const handleVertexDrag = useCallback(
    (index: number, localPoint: Point) => {
      const newPoints = [...points];
      newPoints[index] = { x: Math.round(localPoint.x), y: Math.round(localPoint.y) };
      const minX = Math.min(...newPoints.map(p => p.x));
      const minY = Math.min(...newPoints.map(p => p.y));
      const maxX = Math.max(...newPoints.map(p => p.x));
      const maxY = Math.max(...newPoints.map(p => p.y));
      onUpdate({
        points: newPoints,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    },
    [points, onUpdate],
  );

  // Points count adjustment (+/-)
  const handleAddSide = useCallback(() => {
    const newCount = Math.min(8, pointsCount + 1);
    const converted = convertNativeShapeKind(data, 'polygon', newCount);
    onUpdate(converted);
  }, [data, pointsCount, onUpdate]);

  const handleRemoveSide = useCallback(() => {
    const newCount = Math.max(3, pointsCount - 1);
    const converted = convertNativeShapeKind(data, 'polygon', newCount);
    onUpdate(converted);
  }, [data, pointsCount, onUpdate]);

  // Topmost point for placing the count control
  const topY = points.length ? Math.min(...points.map(p => p.y)) : data.y;
  const worldPoints = useMemo(() => points.map((p) => localToWorld(p)), [points, localToWorld]);
  const worldCentroid = useMemo(() => localToWorld(centroid), [centroid, localToWorld]);
  const worldLabelPoint = useMemo(
    () => localToWorld({ x: centroid.x, y: topY - COUNT_CONTROL_Y_OFFSET / viewport.zoom }),
    [centroid.x, topY, viewport.zoom, localToWorld],
  );
  const worldRemovePoint = useMemo(
    () => localToWorld({
      x: centroid.x - COUNT_CONTROL_X_OFFSET / viewport.zoom,
      y: topY - COUNT_CONTROL_Y_OFFSET / viewport.zoom,
    }),
    [centroid.x, topY, viewport.zoom, localToWorld],
  );
  const worldAddPoint = useMemo(
    () => localToWorld({
      x: centroid.x + COUNT_CONTROL_X_OFFSET / viewport.zoom,
      y: topY - COUNT_CONTROL_Y_OFFSET / viewport.zoom,
    }),
    [centroid.x, topY, viewport.zoom, localToWorld],
  );

  return (
    <g>
      {/* Edge lines */}
      {worldPoints.length > 1 &&
        worldPoints.map((pt, i) => {
          const next = worldPoints[(i + 1) % worldPoints.length];
          return (
            <GizmoDashedLine
              key={`edge-${i}`}
              x1={pt.x}
              y1={pt.y}
              x2={next.x}
              y2={next.y}
              zoom={viewport.zoom}
            />
          );
        })}

      {/* Vertex handles */}
      {worldPoints.map((pt, i) => (
        <PolygonVertexHandle
          key={`v-${i}`}
          index={i}
          point={pt}
          label={`P${i + 1} (${fmt(pt.x)}, ${fmt(pt.y)})`}
          viewport={viewport}
          worldToLocal={worldToLocal}
          onDragVertex={handleVertexDrag}
        />
      ))}

      {/* Center / scale handle */}
      <DiamondHandle
        cx={worldCentroid.x}
        cy={worldCentroid.y}
        zoom={viewport.zoom}
        color={GIZMO_SUCCESS}
        label="Scale"
        cursor="nwse-resize"
        onPointerDown={onScaleDown}
      />

      {/* Points count label + buttons */}
      <GizmoValueLabel
        x={worldLabelPoint.x}
        y={worldLabelPoint.y}
        value={`${pointsCount} sides`}
        zoom={viewport.zoom}
      />

      {/* − button */}
      {pointsCount > 3 && (
        <CircleHandle
          cx={worldRemovePoint.x}
          cy={worldRemovePoint.y}
          zoom={viewport.zoom}
          color={GIZMO_WARNING}
          label="Remove side"
          cursor="pointer"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleRemoveSide(); }}
        />
      )}

      {/* + button */}
      {pointsCount < 8 && (
        <CircleHandle
          cx={worldAddPoint.x}
          cy={worldAddPoint.y}
          zoom={viewport.zoom}
          color={GIZMO_SUCCESS}
          label="Add side"
          cursor="pointer"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleAddSide(); }}
        />
      )}
    </g>
  );
});
PolygonGizmo.displayName = 'PolygonGizmo';
