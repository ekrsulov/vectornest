import type { Command, SubPath } from '../types';

export interface RawBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RawBoundsOptions {
  includeStroke?: boolean;
  strokeWidth?: number;
  zoom?: number;
}

const createBaseBounds = (): RawBounds => ({
  minX: Infinity,
  minY: Infinity,
  maxX: -Infinity,
  maxY: -Infinity,
});

const includePoint = (bounds: RawBounds, x: number, y: number): void => {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
};

const includeCommand = (bounds: RawBounds, command: Command): void => {
  switch (command.type) {
    case 'M':
    case 'L':
      includePoint(bounds, command.position.x, command.position.y);
      break;
    case 'C':
      includePoint(bounds, command.controlPoint1.x, command.controlPoint1.y);
      includePoint(bounds, command.controlPoint2.x, command.controlPoint2.y);
      includePoint(bounds, command.position.x, command.position.y);
      break;
    case 'Z':
      break;
  }
};

const applyStroke = (bounds: RawBounds, options: RawBoundsOptions): RawBounds => {
  const includeStroke = options.includeStroke ?? false;
  if (!includeStroke) {
    return bounds;
  }

  const strokeWidth = options.strokeWidth ?? 0;
  if (!strokeWidth) {
    return bounds;
  }

  const zoom = options.zoom ?? 1;
  const safeZoom = zoom === 0 ? 1 : zoom;
  const strokeAdjust = (strokeWidth / 2) / safeZoom;

  return {
    minX: bounds.minX - strokeAdjust,
    minY: bounds.minY - strokeAdjust,
    maxX: bounds.maxX + strokeAdjust,
    maxY: bounds.maxY + strokeAdjust,
  };
};

const finalizeBounds = (bounds: RawBounds, options: RawBoundsOptions): RawBounds | null => {
  if (
    !Number.isFinite(bounds.minX) ||
    !Number.isFinite(bounds.minY) ||
    !Number.isFinite(bounds.maxX) ||
    !Number.isFinite(bounds.maxY)
  ) {
    return null;
  }

  return applyStroke(bounds, options);
};

export function calculateRawCommandsBounds(
  commands: Command[],
  options: RawBoundsOptions = {}
): RawBounds | null {
  if (commands.length === 0) {
    return null;
  }

  const bounds = createBaseBounds();
  for (const command of commands) {
    includeCommand(bounds, command);
  }

  return finalizeBounds(bounds, options);
}

export function calculateRawSubPathsBounds(
  subPaths: SubPath[],
  options: RawBoundsOptions = {}
): RawBounds | null {
  if (subPaths.length === 0) {
    return null;
  }

  const bounds = createBaseBounds();
  for (const subPath of subPaths) {
    for (const command of subPath) {
      includeCommand(bounds, command);
    }
  }

  return finalizeBounds(bounds, options);
}
