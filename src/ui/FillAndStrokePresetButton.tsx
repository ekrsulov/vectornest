import React from 'react';
import { Button } from '@chakra-ui/react';
import ConditionalTooltip from './ConditionalTooltip';
import { useCanvasStore } from '../store/canvasStore';
import type { Preset } from '../utils/stylePresetRegistry';
import { paintTypeRegistry, type PaintInstance } from '../utils/paintTypeRegistry';

const SVG_PREVIEW_STYLE: React.CSSProperties = { borderRadius: '2px' };

interface PresetButtonProps {
  preset: Preset;
  onClick: (preset: Preset) => void;
  isActive?: boolean;
}

type PaintResolution = {
  paint: string;
  def?: React.ReactNode;
  baseId?: string;
};

const extractPaintId = (paint: string): string | null => {
  const match = paint.match(/url\(#([^)]+)\)/);
  return match ? match[1] : null;
};

const resolvePaint = (
  paint: string,
  presetPaint: PaintInstance | undefined,
  ensureLocalId: (paintId: string) => string,
  store: ReturnType<typeof useCanvasStore.getState>
): PaintResolution => {
  if (!presetPaint || presetPaint.kind === 'solid') {
    return { paint: paint === 'none' ? 'transparent' : paint };
  }

  const baseId = 'id' in presetPaint ? presetPaint.id : extractPaintId(paint) ?? `paint-${presetPaint.kind}`;
  const localId = ensureLocalId(baseId);
  const def = paintTypeRegistry.renderSwatchDef(presetPaint, { localId, store });
  const resolvedPaint = paintTypeRegistry.getPaintValue(presetPaint, { idOverride: localId });

  return { paint: resolvedPaint, def, baseId };
};

export const PresetButton: React.FC<PresetButtonProps> = ({ preset, onClick, isActive = false }) => {
  const uniqueSuffix = React.useId().replace(/:/g, '');
  const paintIdMap = React.useMemo(() => new Map<string, string>(), []);

  const handleClick = () => {
    onClick(preset);
  };

  const ensureLocalId = React.useCallback(
    (paintId: string) => {
      if (!paintIdMap.has(paintId)) {
        paintIdMap.set(paintId, `${paintId}-${uniqueSuffix}`);
      }
      return paintIdMap.get(paintId) as string;
    },
    [paintIdMap, uniqueSuffix]
  );

  const fillPaint = React.useMemo(
    () => resolvePaint(preset.fillColor, preset.fillPaint, ensureLocalId, useCanvasStore.getState()),
    [preset.fillColor, preset.fillPaint, ensureLocalId]
  );
  const strokePaint = React.useMemo(
    () => resolvePaint(preset.strokeColor, preset.strokePaint, ensureLocalId, useCanvasStore.getState()),
    [preset.strokeColor, preset.strokePaint, ensureLocalId]
  );

  const defs = React.useMemo(() => {
    const seen = new Set<string>();
    const nodes: React.ReactNode[] = [];
    [fillPaint, strokePaint].forEach((paint) => {
      if (!paint.def || !paint.baseId) return;
      if (seen.has(paint.baseId)) return;
      seen.add(paint.baseId);
      nodes.push(paint.def);
    });
    if (!nodes.length) return null;
    return <defs>{nodes}</defs>;
  }, [fillPaint, strokePaint]);

  const fillValue = fillPaint.paint === 'none' ? 'transparent' : fillPaint.paint;
  const strokeValue = strokePaint.paint === 'none' ? 'transparent' : strokePaint.paint;

  return (
    <ConditionalTooltip label={preset.name}>
      <Button
        onClick={handleClick}
        w="20px"
        h="20px"
        minW="20px"
        p="1px"
        bg="transparent"
        borderRadius="md"
        border="none"
        boxShadow={isActive ? '0 0 0 1px var(--chakra-colors-blue-500)' : 'none'}
        _hover={{ transform: 'scale(1.5)' }}
        _dark={{
          bg: 'transparent',
          _hover: {
            bg: 'transparent'
          }
        }}
        transition="all 0.2s ease"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          style={SVG_PREVIEW_STYLE}
        >
          {defs}
          {/* Sample shape with preset styling - full size */}
          <circle
            cx="10"
            cy="10"
            r="9"
            fill={fillValue}
            fillOpacity={preset.fillOpacity}
            stroke={strokeValue}
            strokeWidth={Math.max(0.5, preset.strokeWidth * 0.25)} // Scale down for preview
            strokeOpacity={preset.strokeOpacity}
          />
        </svg>
      </Button>
    </ConditionalTooltip>
  );
};
