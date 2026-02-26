/**
 * NativeShapeGizmoOverlay — Main orchestrator for on-canvas native-shape editing gizmos.
 *
 * Shows the appropriate gizmo overlay when a single nativeShape element is selected.
 * Works as a foreground canvas layer so handles render above all elements.
 */

import React, { useCallback, useMemo } from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import type { NativeShapeElement } from '../types';
import type { CanvasElement, Point, Viewport } from '../../../types';
import { getParentCumulativeTransformMatrix } from '../../../utils/elementTransformUtils';
import {
  IDENTITY_MATRIX,
  applyToPoint,
  createRotateMatrix,
  createTranslateMatrix,
  inverseMatrix,
  multiplyMatrices,
  type Matrix,
} from '../../../utils/matrixUtils';
import { RectGizmo } from './RectGizmo';
import { EllipseGizmo } from './EllipseGizmo';
import { LineGizmo } from './LineGizmo';
import { PolygonGizmo } from './PolygonGizmo';
import { PolylineGizmo } from './PolylineGizmo';

interface NativeShapeGizmoOverlayProps {
  viewport: Viewport;
  activePlugin: string | null;
}

const getNativeShapeLocalMatrix = (data: NativeShapeElement['data']): Matrix => {
  if (data.transformMatrix) {
    return data.transformMatrix;
  }

  const t = data.transform;
  if (!t) {
    return IDENTITY_MATRIX;
  }

  const cx = data.x + data.width / 2;
  const cy = data.y + data.height / 2;
  let matrix: Matrix = IDENTITY_MATRIX;

  if (t.translateX || t.translateY) {
    matrix = multiplyMatrices(createTranslateMatrix(t.translateX ?? 0, t.translateY ?? 0), matrix);
  }
  if (t.rotation) {
    matrix = multiplyMatrices(createRotateMatrix(t.rotation, cx, cy), matrix);
  }
  if (t.scaleX !== undefined || t.scaleY !== undefined) {
    const sx = t.scaleX ?? 1;
    const sy = t.scaleY ?? 1;
    matrix = multiplyMatrices([sx, 0, 0, sy, 0, 0], matrix);
  }

  return matrix;
};

export const NativeShapeGizmoOverlay: React.FC<NativeShapeGizmoOverlayProps> = React.memo(
  ({ viewport, activePlugin }) => {
    const selectedIds = useCanvasStore((state) => state.selectedIds);
    const elements = useCanvasStore((state) => state.elements);
    const updateElement = useCanvasStore((state) => state.updateElement);

    // Only show when a single nativeShape element is selected
    const selectedElement = useMemo(() => {
      if (selectedIds.length !== 1) return null;
      const el = elements.find((e) => e.id === selectedIds[0]);
      if (!el || el.type !== 'nativeShape') return null;
      return el as unknown as NativeShapeElement;
    }, [selectedIds, elements]);

    const onUpdate = useCallback(
      (patch: Partial<NativeShapeElement['data']>) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, {
          data: { ...selectedElement.data, ...patch },
        });
      },
      [selectedElement, updateElement],
    );

    const parentMatrix = useMemo(() => {
      if (!selectedElement) return IDENTITY_MATRIX;
      return getParentCumulativeTransformMatrix(selectedElement as unknown as CanvasElement, elements);
    }, [selectedElement, elements]);

    const localMatrix = useMemo(() => {
      if (!selectedElement) return IDENTITY_MATRIX;
      return getNativeShapeLocalMatrix(selectedElement.data);
    }, [selectedElement]);

    const worldMatrix = useMemo(
      () => multiplyMatrices(parentMatrix, localMatrix),
      [parentMatrix, localMatrix],
    );

    const inverseWorldMatrix = useMemo(
      () => inverseMatrix(worldMatrix),
      [worldMatrix],
    );

    const localToWorld = useCallback(
      (point: Point) => applyToPoint(worldMatrix, point),
      [worldMatrix],
    );

    const worldToLocal = useCallback(
      (point: Point) => (inverseWorldMatrix ? applyToPoint(inverseWorldMatrix, point) : point),
      [inverseWorldMatrix],
    );

    // Show gizmos only in nativeShapes mode and only when a native shape is selected
    if (!selectedElement) return null;
    if (activePlugin !== 'nativeShapes') return null;

    const data = selectedElement.data;
    const gizmoProps = { data, viewport, onUpdate, localToWorld, worldToLocal };

    let gizmo: React.ReactNode = null;

    switch (data.kind) {
      case 'rect':
      case 'square':
        gizmo = <RectGizmo {...gizmoProps} />;
        break;
      case 'circle':
      case 'ellipse':
        gizmo = <EllipseGizmo {...gizmoProps} />;
        break;
      case 'line':
        gizmo = <LineGizmo {...gizmoProps} />;
        break;
      case 'polygon':
        gizmo = <PolygonGizmo {...gizmoProps} />;
        break;
      case 'polyline':
        gizmo = <PolylineGizmo {...gizmoProps} />;
        break;
      default:
        return null;
    }

    return <g data-gizmo="nativeShape">{gizmo}</g>;
  },
);
NativeShapeGizmoOverlay.displayName = 'NativeShapeGizmoOverlay';
