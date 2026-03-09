import type { CanvasElementInput, Command } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { measureCommandsBounds } from '../../utils/measurementUtils';
import { parsePathD } from '../../utils/path';
import { scaleCommands, translateCommands } from '../../utils/transformationUtils';
import type { AspectPlacementRect, AspectPlacementSourceSize } from '../../utils/aspectPlacement';
import type { TextPathPreset } from './presets';

export const TEXT_PATH_DEFAULT_SIZE = 200;

interface TextPathPresetMetrics {
  commands: Command[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  sourceSize: AspectPlacementSourceSize;
}

const presetMetricsCache = new Map<string, TextPathPresetMetrics>();

const getPresetMetrics = (preset: TextPathPreset): TextPathPresetMetrics => {
  const cached = presetMetricsCache.get(preset.id);
  if (cached) {
    return cached;
  }

  const commands = parsePathD(preset.generatePath(TEXT_PATH_DEFAULT_SIZE));
  const measuredBounds = measureCommandsBounds(commands);
  const bounds = measuredBounds ?? {
    minX: 0,
    minY: 0,
    maxX: TEXT_PATH_DEFAULT_SIZE,
    maxY: TEXT_PATH_DEFAULT_SIZE,
  };

  const metrics: TextPathPresetMetrics = {
    commands,
    bounds,
    sourceSize: {
      width: Math.max(1, bounds.maxX - bounds.minX),
      height: Math.max(1, bounds.maxY - bounds.minY),
    },
  };

  presetMetricsCache.set(preset.id, metrics);
  return metrics;
};

export const getTextPathPresetSourceSize = (
  preset: TextPathPreset,
): AspectPlacementSourceSize => getPresetMetrics(preset).sourceSize;

export const createTextPathElementInput = (
  preset: TextPathPreset,
  rect: AspectPlacementRect,
  storeStyle: CanvasStore['style'] | undefined,
): CanvasElementInput => {
  const metrics = getPresetMetrics(preset);
  const normalizedCommands = translateCommands(
    metrics.commands,
    -metrics.bounds.minX,
    -metrics.bounds.minY,
  );
  const scaledCommands = scaleCommands(
    normalizedCommands,
    rect.width / metrics.sourceSize.width,
    rect.height / metrics.sourceSize.height,
    0,
    0,
  );
  const translatedCommands = translateCommands(
    scaledCommands,
    rect.x,
    rect.y,
  );

  const fillColor = storeStyle?.fillColor === 'none'
    ? '#000000'
    : (storeStyle?.fillColor ?? '#000000');

  return {
    type: 'path',
    data: {
      subPaths: [translatedCommands],
      strokeColor: 'none',
      strokeWidth: 0,
      fillColor: 'none',
      fillOpacity: 0,
      strokeOpacity: 1,
      textPath: {
        text: 'Text on path',
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal' as const,
        textAnchor: preset.defaultTextAnchor,
        startOffset: preset.defaultStartOffset,
        fillColor,
        fillOpacity: storeStyle?.fillOpacity ?? 1,
        strokeColor: 'none',
        strokeWidth: 0,
        strokeOpacity: 1,
        dominantBaseline: 'alphabetic' as const,
      },
    },
  };
};
