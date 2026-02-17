import React, { useId } from 'react';
import { SimpleGrid, Box, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { PatternDef, PatternsSlice } from './slice';
import type { PaintPickerProps } from '../../utils/paintContributionRegistry';
import { normalizeRawPatternContent, resolvePatternTileGeometry } from './patternPreviewUtils';

const renderPatternDef = (pattern: PatternDef, id: string) => {
  const geometry = resolvePatternTileGeometry(pattern);

  if (pattern.type === 'raw') {
    const raw = normalizeRawPatternContent(pattern.rawContent);
    const fallback = `<rect width="${geometry.contentWidth}" height="${geometry.contentHeight}" fill="${pattern.bg}" />`;
    return (
      <pattern
        id={id}
        patternUnits={geometry.units}
        width={geometry.tileWidth}
        height={geometry.tileHeight}
        viewBox={geometry.viewBox}
        patternTransform={pattern.patternTransform}
        dangerouslySetInnerHTML={{ __html: raw || fallback }}
      />
    );
  }

  switch (pattern.type) {
    case 'dots':
      return (
        <pattern id={id} patternUnits={geometry.units} width={geometry.tileWidth} height={geometry.tileHeight} viewBox={geometry.viewBox}>
          <rect width={pattern.size} height={pattern.size} fill={pattern.bg} />
          <circle cx={pattern.size / 2} cy={pattern.size / 2} r={pattern.size / 3} fill={pattern.fg} />
        </pattern>
      );
    case 'grid':
      return (
        <pattern id={id} patternUnits={geometry.units} width={geometry.tileWidth} height={geometry.tileHeight} viewBox={geometry.viewBox}>
          <rect width={pattern.size} height={pattern.size} fill={pattern.bg} />
          <path
            d={`M0 0 H${pattern.size} V${pattern.size} H0 Z`}
            fill="none"
            stroke={pattern.fg}
            strokeWidth={Math.max(1, pattern.size / 10)}
          />
        </pattern>
      );
    case 'crosshatch':
      return (
        <pattern
          id={id}
          patternUnits={geometry.units}
          width={geometry.tileWidth}
          height={geometry.tileHeight}
          viewBox={geometry.viewBox}
          patternTransform={pattern.patternTransform ?? 'rotate(45)'}
        >
          <rect width={pattern.size} height={pattern.size} fill={pattern.bg} />
          <rect width={Math.max(1, pattern.size / 4)} height={pattern.size} fill={pattern.fg} />
        </pattern>
      );
    case 'checker':
      return (
        <pattern id={id} patternUnits={geometry.units} width={geometry.tileWidth} height={geometry.tileHeight} viewBox={geometry.viewBox}>
          <rect width={pattern.size} height={pattern.size} fill={pattern.bg} />
          <rect width={pattern.size / 2} height={pattern.size / 2} fill={pattern.fg} />
          <rect
            x={pattern.size / 2}
            y={pattern.size / 2}
            width={pattern.size / 2}
            height={pattern.size / 2}
            fill={pattern.fg}
          />
        </pattern>
      );
    case 'diamonds':
      return (
        <pattern id={id} patternUnits={geometry.units} width={geometry.tileWidth} height={geometry.tileHeight} viewBox={geometry.viewBox}>
          <rect width={pattern.size} height={pattern.size} fill={pattern.bg} />
          <path
            d={`M${pattern.size / 2} 0 L ${pattern.size} ${pattern.size / 2} L ${pattern.size / 2} ${pattern.size} L 0 ${pattern.size / 2} Z`}
            fill={pattern.fg}
          />
        </pattern>
      );
    case 'stripes':
    default:
      return (
        <pattern
          id={id}
          patternUnits={geometry.units}
          width={geometry.tileWidth}
          height={geometry.tileHeight}
          viewBox={geometry.viewBox}
          patternTransform={pattern.patternTransform ?? 'rotate(45)'}
        >
          <rect width={pattern.size} height={pattern.size} fill={pattern.bg} />
          <rect width={pattern.size / 2} height={pattern.size} fill={pattern.fg} />
        </pattern>
      );
  }
};

export const PatternPicker: React.FC<PaintPickerProps> = ({ onSelect }) => {
  const patterns = useCanvasStore((state) => (state as unknown as PatternsSlice).patterns ?? []);
  const borderColor = useColorModeValue('gray.300', 'whiteAlpha.300');
  const hoverBorder = useColorModeValue('blue.400', 'blue.200');
  const previewSize = 28;
  const instanceId = useId().replace(/:/g, '');

  return (
    <SimpleGrid columns={6} spacing={1} p={1}>
      {patterns.map((p) => {
        const localPatternId = `${instanceId}-picker-preview-pattern-${p.id}`;
        return (
          <Box
            key={p.id}
            borderWidth="1px"
            borderRadius="0"
            cursor="pointer"
            onClick={() => onSelect(`url(#${p.id})`)}
            h="28px"
            borderColor={borderColor}
            _hover={{ borderColor: hoverBorder }}
            overflow="hidden"
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${previewSize} ${previewSize}`}
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
            >
              <defs>{renderPatternDef(p, localPatternId)}</defs>
              <rect width={previewSize} height={previewSize} fill={`url(#${localPatternId})`} />
            </svg>
          </Box>
        );
      })}
    </SimpleGrid>
  );
};
