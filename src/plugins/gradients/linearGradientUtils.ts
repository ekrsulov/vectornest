import type { GradientDef } from './slice';

type LinearGradientCoordinates = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const DEFAULT_LINEAR_COORDINATES: LinearGradientCoordinates = {
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 0,
};

const isFiniteNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const coordinatesFromAngle = (angle: number): LinearGradientCoordinates => {
  const rad = ((Number.isFinite(angle) ? angle : 90) - 90) * Math.PI / 180;
  return {
    x1: 50 - 50 * Math.cos(rad),
    y1: 50 - 50 * Math.sin(rad),
    x2: 50 + 50 * Math.cos(rad),
    y2: 50 + 50 * Math.sin(rad),
  };
};

export const resolveLinearGradientCoordinates = (
  gradient: Pick<GradientDef, 'angle' | 'x1' | 'y1' | 'x2' | 'y2' | 'gradientUnits'>
): LinearGradientCoordinates => {
  if (gradient.gradientUnits === 'userSpaceOnUse') {
    return {
      x1: gradient.x1 ?? DEFAULT_LINEAR_COORDINATES.x1,
      y1: gradient.y1 ?? DEFAULT_LINEAR_COORDINATES.y1,
      x2: gradient.x2 ?? DEFAULT_LINEAR_COORDINATES.x2,
      y2: gradient.y2 ?? DEFAULT_LINEAR_COORDINATES.y2,
    };
  }

  if (
    isFiniteNumber(gradient.x1) &&
    isFiniteNumber(gradient.y1) &&
    isFiniteNumber(gradient.x2) &&
    isFiniteNumber(gradient.y2)
  ) {
    return {
      x1: gradient.x1,
      y1: gradient.y1,
      x2: gradient.x2,
      y2: gradient.y2,
    };
  }

  if (isFiniteNumber(gradient.angle)) {
    return coordinatesFromAngle(gradient.angle);
  }

  return DEFAULT_LINEAR_COORDINATES;
};
