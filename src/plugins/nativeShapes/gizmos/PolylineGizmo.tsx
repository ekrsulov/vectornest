/**
 * PolylineGizmo — On-canvas editing handles for the polyline (star) native shape.
 *
 * Provides:
 *  • Draggable outer vertex handles (star tips)
 *  • Draggable inner vertex handles (star valleys) for controlling inner ratio
 *  • Points count adjust handles (+/−)
 *  • Center scale handle
 */

import React, { useMemo, useCallback } from 'react';
import {
  CircleHandle,
  DiamondHandle,
  GizmoValueLabel,
  GizmoDashedLine,
  GIZMO_ACCENT,
  GIZMO_ACCENT_ALT,
  GIZMO_SUCCESS,
  GIZMO_WARNING,
} from './GizmoHandle';
import { useGizmoDrag } from './useGizmoDrag';
import type { NativeShapeElement } from '../types';
import type { Point, Viewport } from '../../../types';
import { convertNativeShapeKind } from '../index';

interface PolylineVertexHandleProps {
  index: number;
  point: Point;
  label: string;
  viewport: Viewport;
  worldToLocal: (point: Point) => Point;
  onDragVertex: (index: number, localPoint: Point) => void;
  variant: 'outer' | 'inner';
}

const PolylineVertexHandle: React.FC<PolylineVertexHandleProps> = React.memo(
  ({ index, point, label, viewport, worldToLocal, onDragVertex, variant }) => {
    const callbacks = useMemo(
      () => ({
        onDrag: (localPoint: Point) => {
          onDragVertex(index, localPoint);
        },
      }),
      [index, onDragVertex],
    );

    const { handlePointerDown } = useGizmoDrag(viewport, callbacks, { pointTransform: worldToLocal });

    if (variant === 'inner') {
      return (
        <DiamondHandle
          cx={point.x}
          cy={point.y}
          zoom={viewport.zoom}
          color={GIZMO_ACCENT_ALT}
          label={label}
          cursor="move"
          onPointerDown={handlePointerDown}
        />
      );
    }

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
PolylineVertexHandle.displayName = 'PolylineVertexHandle';

interface PolylineGizmoProps {
  data: NativeShapeElement['data'];
  viewport: Viewport;
  onUpdate: (patch: Partial<NativeShapeElement['data']>) => void;
  localToWorld: (point: Point) => Point;
  worldToLocal: (point: Point) => Point;
}

const COUNT_CONTROL_Y_OFFSET = 34;
const COUNT_CONTROL_X_OFFSET = 36;

export const PolylineGizmo: React.FC<PolylineGizmoProps> = React.memo(({ data, viewport, onUpdate, localToWorld, worldToLocal }) => {
  // Points includes the duplicate closing point — skip it for display
  const rawPoints = useMemo(() => data.points ?? [], [data.points]);
  const points = useMemo(
    () =>
      rawPoints.length > 2 &&
      rawPoints[0].x === rawPoints[rawPoints.length - 1].x &&
      rawPoints[0].y === rawPoints[rawPoints.length - 1].y
        ? rawPoints.slice(0, -1)
        : rawPoints,
    [rawPoints],
  );
  const pointsCount = data.pointsCount ?? 5;

  // Compute centroid
  const centroid = useMemo(() => {
    if (!points.length) return { x: data.x + data.width / 2, y: data.y + data.height / 2 };
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }, [points, data.x, data.y, data.width, data.height]);

  // const fmt omitted – labels use index-based names

  // The star alternates outer/inner points. Even indices = outer, odd = inner.
  const outerIndices = points.map((_, i) => i).filter(i => i % 2 === 0);
  const innerIndices = points.map((_, i) => i).filter(i => i % 2 === 1);

  // Scale all points uniformly from centroid
  const scaleCallbacks = useMemo(
    () => ({
      onDrag: (_canvasPoint: Point, startPoint: Point, delta: Point) => {
        if (!points.length) return;
        const startDist = Math.sqrt(
          (startPoint.x - centroid.x) ** 2 + (startPoint.y - centroid.y) ** 2,
        );
        if (startDist < 1) return;
        const curDist = startDist + delta.x;
        const ratio = Math.max(0.1, curDist / startDist);
        const newPoints = points.map(p => ({
          x: centroid.x + (p.x - centroid.x) * ratio,
          y: centroid.y + (p.y - centroid.y) * ratio,
        }));
        // Re-close for polyline
        const closed = [...newPoints, { ...newPoints[0] }];
        const minX = Math.min(...newPoints.map(p => p.x));
        const minY = Math.min(...newPoints.map(p => p.y));
        const maxX = Math.max(...newPoints.map(p => p.x));
        const maxY = Math.max(...newPoints.map(p => p.y));
        onUpdate({
          points: closed,
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
      const closed = [...newPoints, { ...newPoints[0] }];
      const minX = Math.min(...newPoints.map(p => p.x));
      const minY = Math.min(...newPoints.map(p => p.y));
      const maxX = Math.max(...newPoints.map(p => p.x));
      const maxY = Math.max(...newPoints.map(p => p.y));
      onUpdate({
        points: closed,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    },
    [points, onUpdate],
  );

  // Points count adjustment
  const handleAddPoint = useCallback(() => {
    const newCount = Math.min(8, pointsCount + 1);
    const converted = convertNativeShapeKind(data, 'polyline', newCount);
    onUpdate(converted);
  }, [data, pointsCount, onUpdate]);

  const handleRemovePoint = useCallback(() => {
    const newCount = Math.max(5, pointsCount - 1);
    const converted = convertNativeShapeKind(data, 'polyline', newCount);
    onUpdate(converted);
  }, [data, pointsCount, onUpdate]);

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

      {/* Lines from center to outer tips */}
      {outerIndices.map(i => (
        <GizmoDashedLine
          key={`ray-${i}`}
          x1={worldCentroid.x}
          y1={worldCentroid.y}
          x2={worldPoints[i].x}
          y2={worldPoints[i].y}
          zoom={viewport.zoom}
          color={GIZMO_ACCENT}
        />
      ))}

      {/* Outer vertex handles (tips) */}
      {outerIndices.map(i => (
        <PolylineVertexHandle
          key={`outer-${i}`}
          index={i}
          point={worldPoints[i]}
          label={`Tip ${Math.floor(i / 2) + 1}`}
          viewport={viewport}
          worldToLocal={worldToLocal}
          onDragVertex={handleVertexDrag}
          variant="outer"
        />
      ))}

      {/* Inner vertex handles (valleys) */}
      {innerIndices.map(i => (
        <PolylineVertexHandle
          key={`inner-${i}`}
          index={i}
          point={worldPoints[i]}
          label={`Valley ${Math.floor(i / 2) + 1}`}
          viewport={viewport}
          worldToLocal={worldToLocal}
          onDragVertex={handleVertexDrag}
          variant="inner"
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
        value={`${pointsCount} points`}
        zoom={viewport.zoom}
      />

      {/* − button */}
      {pointsCount > 5 && (
        <CircleHandle
          cx={worldRemovePoint.x}
          cy={worldRemovePoint.y}
          zoom={viewport.zoom}
          color={GIZMO_WARNING}
          label="Remove point"
          cursor="pointer"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleRemovePoint(); }}
        />
      )}

      {/* + button */}
      {pointsCount < 8 && (
        <CircleHandle
          cx={worldAddPoint.x}
          cy={worldAddPoint.y}
          zoom={viewport.zoom}
          color={GIZMO_SUCCESS}
          label="Add point"
          cursor="pointer"
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); handleAddPoint(); }}
        />
      )}
    </g>
  );
});
PolylineGizmo.displayName = 'PolylineGizmo';
