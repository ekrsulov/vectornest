import type { Point } from '../types';
import { MIN_SHAPE_CREATION_DISTANCE } from '../plugins/shape/config';

export interface AspectPlacementSourceSize {
  width: number;
  height: number;
}

export interface AspectPlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AspectPlacementFeedback {
  width: number;
  height: number;
  visible: boolean;
  isShiftPressed: boolean;
  isMultipleOf10: boolean;
}

const SNAP_STEP = 10;

const normalizeDimension = (value: number): number => (
  Number.isFinite(value) && value > 0 ? value : 1
);

const getDirection = (delta: number): number => (delta >= 0 ? 1 : -1);

export const snapPlacementTargetPoint = (
  startPoint: Point,
  point: Point,
  shouldSnap: boolean,
): Point => {
  if (!shouldSnap) {
    return point;
  }

  const dx = point.x - startPoint.x;
  const dy = point.y - startPoint.y;

  return {
    x: startPoint.x + Math.round(dx / SNAP_STEP) * SNAP_STEP,
    y: startPoint.y + Math.round(dy / SNAP_STEP) * SNAP_STEP,
  };
};

export const calculateAspectPlacementRect = (
  startPoint: Point,
  targetPoint: Point,
  sourceSize: AspectPlacementSourceSize,
): AspectPlacementRect => {
  const sourceWidth = normalizeDimension(sourceSize.width);
  const sourceHeight = normalizeDimension(sourceSize.height);
  const dragWidth = Math.abs(targetPoint.x - startPoint.x);
  const dragHeight = Math.abs(targetPoint.y - startPoint.y);
  const scaleX = dragWidth / sourceWidth;
  const scaleY = dragHeight / sourceHeight;
  const scale = (() => {
    if (dragWidth === 0 && dragHeight === 0) {
      return 0;
    }
    if (dragWidth === 0) {
      return scaleY;
    }
    if (dragHeight === 0) {
      return scaleX;
    }
    return Math.min(scaleX, scaleY);
  })();

  const width = Number.isFinite(scale) && scale > 0 ? sourceWidth * scale : 0;
  const height = Number.isFinite(scale) && scale > 0 ? sourceHeight * scale : 0;

  return {
    x: getDirection(targetPoint.x - startPoint.x) >= 0 ? startPoint.x : startPoint.x - width,
    y: getDirection(targetPoint.y - startPoint.y) >= 0 ? startPoint.y : startPoint.y - height,
    width,
    height,
  };
};

export const createCenteredPlacementRect = (
  center: Point,
  sourceSize: AspectPlacementSourceSize,
): AspectPlacementRect => {
  const width = normalizeDimension(sourceSize.width);
  const height = normalizeDimension(sourceSize.height);

  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
};

export const isPlacementDragSufficient = (
  startPoint: Point,
  targetPoint: Point,
): boolean => {
  const dx = targetPoint.x - startPoint.x;
  const dy = targetPoint.y - startPoint.y;
  return Math.sqrt(dx * dx + dy * dy) >= MIN_SHAPE_CREATION_DISTANCE;
};

export const createAspectPlacementFeedback = (
  rect: AspectPlacementRect,
  isShiftPressed: boolean,
): AspectPlacementFeedback => ({
  width: Math.round(rect.width),
  height: Math.round(rect.height),
  visible: rect.width > 0 && rect.height > 0,
  isShiftPressed,
  isMultipleOf10: isShiftPressed,
});
