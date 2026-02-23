/**
 * EasingCurveEditor — Shared interactive cubic bezier curve editor.
 *
 * Renders an SVG canvas where users drag two control points to define easing.
 * Includes a preset grid and optional dropdown for quick selection.
 * Uses pointer events throughout for desktop + mobile compatibility.
 * Uses refs to prevent stale-closure issues during drag.
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { Box, VStack, Text, Flex } from '@chakra-ui/react';
import { useThemeColors } from '../hooks';
import { CustomSelect } from './CustomSelect';
import { EASING_PRESETS } from './easingPresets';
import type { CubicBezierPoints } from './easingPresets';

// ─── Constants ──────────────────────────────────────────────────────────────

const CANVAS_SIZE = 160;
const CANVAS_PAD = 20;
const GRAPH_SIZE = CANVAS_SIZE - CANVAS_PAD * 2;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface EasingCurveEditorProps {
  /** Cubic bezier control points [x1, y1, x2, y2] */
  value: CubicBezierPoints;
  /** Called when control points change */
  onChange: (points: CubicBezierPoints) => void;
  /** Optional extra label displayed beside the values (e.g. calcMode) */
  infoLabel?: string;
  /** Whether to allow Y values outside 0-1 for bounce/elastic effects. Default true. */
  allowOvershoot?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const EasingCurveEditor: React.FC<EasingCurveEditorProps> = ({
  value,
  onChange,
  infoLabel,
  allowOvershoot = true,
}) => {
  const { input } = useThemeColors();
  const svgRef = useRef<SVGSVGElement>(null);

  // Refs to keep latest values accessible in pointer callbacks without stale closures
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const draggingRef = useRef<1 | 2 | null>(null);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [x1, y1, x2, y2] = value;

  const yMin = allowOvershoot ? -0.5 : 0;
  const yMax = allowOvershoot ? 1.5 : 1;

  // Convert normalized [0-1] to SVG coordinates
  const toSvg = useCallback(
    (nx: number, ny: number): [number, number] => [
      CANVAS_PAD + nx * GRAPH_SIZE,
      CANVAS_PAD + (1 - ny) * GRAPH_SIZE,
    ],
    [],
  );

  // Convert SVG coordinates to normalized
  const fromSvg = useCallback(
    (sx: number, sy: number): [number, number] => [
      Math.max(0, Math.min(1, (sx - CANVAS_PAD) / GRAPH_SIZE)),
      Math.max(yMin, Math.min(yMax, 1 - (sy - CANVAS_PAD) / GRAPH_SIZE)),
    ],
    [yMin, yMax],
  );

  const handlePointerDown = useCallback(
    (point: 1 | 2) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = point;
      (e.target as SVGElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const activeDrag = draggingRef.current;
      if (!activeDrag || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const [nx, ny] = fromSvg(sx, sy);
      const cur = valueRef.current;

      const rounded = (v: number) => Number(v.toFixed(3));
      if (activeDrag === 1) {
        onChangeRef.current([rounded(nx), rounded(ny), cur[2], cur[3]]);
      } else {
        onChangeRef.current([cur[0], cur[1], rounded(nx), rounded(ny)]);
      }
    },
    [fromSvg],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  // Find matching preset
  const matchingPreset = useMemo(
    () =>
      EASING_PRESETS.find(
        (p) =>
          Math.abs(p.points[0] - x1) < 0.01 &&
          Math.abs(p.points[1] - y1) < 0.01 &&
          Math.abs(p.points[2] - x2) < 0.01 &&
          Math.abs(p.points[3] - y2) < 0.01,
      ),
    [x1, y1, x2, y2],
  );

  // SVG coordinates for control points
  const [sx1, sy1] = toSvg(x1, y1);
  const [sx2, sy2] = toSvg(x2, y2);
  const [startX, startY] = toSvg(0, 0);
  const [endX, endY] = toSvg(1, 1);

  return (
    <VStack spacing={2} align="stretch">
      {/* Curve canvas */}
      <Box
        borderRadius="md"
        border="1px solid"
        borderColor={input.borderColor}
        bg="whiteAlpha.50"
        overflow="visible"
        mx="auto"
        w={`${CANVAS_SIZE}px`}
      >
        <svg
          ref={svgRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          style={{ display: 'block', overflow: 'visible', touchAction: 'none', cursor: draggingRef.current ? 'grabbing' : 'default' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Grid border */}
          <rect
            x={CANVAS_PAD}
            y={CANVAS_PAD}
            width={GRAPH_SIZE}
            height={GRAPH_SIZE}
            fill="none"
            stroke="gray"
            strokeOpacity={0.15}
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
          {/* Diagonal guide (linear reference) */}
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="gray"
            strokeOpacity={0.2}
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />

          {/* Control point lines */}
          <line
            x1={startX} y1={startY} x2={sx1} y2={sy1}
            stroke="#63B3ED" strokeWidth={1} strokeOpacity={0.6}
          />
          <line
            x1={endX} y1={endY} x2={sx2} y2={sy2}
            stroke="#F6AD55" strokeWidth={1} strokeOpacity={0.6}
          />

          {/* Bezier curve */}
          <path
            d={`M ${startX} ${startY} C ${sx1} ${sy1}, ${sx2} ${sy2}, ${endX} ${endY}`}
            fill="none"
            stroke="#9F7AEA"
            strokeWidth={2}
          />

          {/* Start/End points */}
          <circle cx={startX} cy={startY} r={3} fill="#718096" />
          <circle cx={endX} cy={endY} r={3} fill="#718096" />

          {/* Control point 1 — draggable */}
          <circle
            cx={sx1} cy={sy1} r={6}
            fill="#63B3ED"
            stroke="white"
            strokeWidth={1.5}
            cursor="grab"
            onPointerDown={handlePointerDown(1)}
            style={{ touchAction: 'none' }}
          />

          {/* Control point 2 — draggable */}
          <circle
            cx={sx2} cy={sy2} r={6}
            fill="#F6AD55"
            stroke="white"
            strokeWidth={1.5}
            cursor="grab"
            onPointerDown={handlePointerDown(2)}
            style={{ touchAction: 'none' }}
          />
        </svg>
      </Box>

      {/* Preset selector */}
      <CustomSelect
        value={matchingPreset?.value ?? 'custom'}
        onChange={(val) => {
          const preset = EASING_PRESETS.find((p) => p.value === val);
          if (preset) onChange(preset.points);
        }}
        options={[
          ...EASING_PRESETS.map((p) => ({ value: p.value, label: p.label })),
          ...(!matchingPreset ? [{ value: 'custom', label: 'Custom' }] : []),
        ]}
        size="sm"
      />

      {/* Value display */}
      <Flex justify="space-between" px={1}>
        <Text fontSize="9px" color="gray.500">
          {x1.toFixed(2)}, {y1.toFixed(2)}, {x2.toFixed(2)}, {y2.toFixed(2)}
        </Text>
        {infoLabel && (
          <Text fontSize="9px" color="gray.500">
            {infoLabel}
          </Text>
        )}
      </Flex>
    </VStack>
  );
};
