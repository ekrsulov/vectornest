/**
 * GizmoHandle — Reusable on-canvas handle primitives for native-shape gizmos.
 *
 * Each handle is a small SVG element (circle / diamond) that responds to
 * pointer-down events and shows a tooltip-style label on hover.
 */

import React, { useState } from 'react';

/* ─── constants ─── */
const HANDLE_RADIUS = 4;        // Visual radius (px in screen space, scaled by 1/zoom)
const HIT_RADIUS = 10;          // Invisible hit-area radius
const LABEL_OFFSET_Y = -12;     // Label offset above handle
const LABEL_FONT_SIZE = 10;
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 6;
const LABEL_BASELINE_ADJUST = 0.32;

/* ─── colors ─── */
export const GIZMO_ACCENT = '#6366f1';      // Indigo-500
export const GIZMO_ACCENT_ALT = '#8b5cf6';  // Violet-500
export const GIZMO_WARNING = '#f59e0b';      // Amber-500
export const GIZMO_SUCCESS = '#10b981';      // Emerald-500
export const GIZMO_LINE = '#a5b4fc';         // Indigo-300
export const GIZMO_LINE_DARK = '#818cf8';    // Indigo-400

/* ─── CircleHandle ─── */
export interface CircleHandleProps {
  cx: number;
  cy: number;
  zoom: number;
  color?: string;
  label?: string;
  cursor?: string;
  onPointerDown: (e: React.PointerEvent) => void;
}

export const CircleHandle: React.FC<CircleHandleProps> = React.memo(
  ({ cx, cy, zoom, color = GIZMO_ACCENT, label, cursor = 'pointer', onPointerDown }) => {
    const [hovered, setHovered] = useState(false);
    const r = HANDLE_RADIUS / zoom;
    const hitR = HIT_RADIUS / zoom;
    const strokeW = 1.5 / zoom;
    const labelWidth = ((label?.length ?? 0) * (LABEL_FONT_SIZE * 0.55) + LABEL_PADDING_X) / zoom;
    const labelHeight = (LABEL_FONT_SIZE + LABEL_PADDING_Y) / zoom;
    const labelCenterY = cy + LABEL_OFFSET_Y / zoom;
    const labelTextY = labelCenterY + (LABEL_FONT_SIZE * LABEL_BASELINE_ADJUST) / zoom;

    return (
      <g>
        {/* Label on hover */}
        {hovered && label && (
          <g pointerEvents="none">
            <rect
              x={cx - labelWidth / 2}
              y={labelCenterY - labelHeight / 2}
              width={labelWidth}
              height={labelHeight}
              rx={3 / zoom}
              fill="rgba(0,0,0,0.75)"
            />
            <text
              x={cx}
              y={labelTextY}
              textAnchor="middle"
              fill="#fff"
              fontSize={LABEL_FONT_SIZE / zoom}
              fontFamily="system-ui, sans-serif"
              pointerEvents="none"
            >
              {label}
            </text>
          </g>
        )}
        {/* Visual circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#fff"
          stroke={color}
          strokeWidth={strokeW}
          pointerEvents="none"
        />
        {/* Invisible hit area */}
        <circle
          cx={cx}
          cy={cy}
          r={hitR}
          fill="transparent"
          style={{ cursor, pointerEvents: 'all' }}
          onPointerDown={onPointerDown}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        />
      </g>
    );
  },
);
CircleHandle.displayName = 'CircleHandle';

/* ─── DiamondHandle ─── */
export interface DiamondHandleProps {
  cx: number;
  cy: number;
  zoom: number;
  color?: string;
  label?: string;
  cursor?: string;
  onPointerDown: (e: React.PointerEvent) => void;
}

export const DiamondHandle: React.FC<DiamondHandleProps> = React.memo(
  ({ cx, cy, zoom, color = GIZMO_ACCENT_ALT, label, cursor = 'pointer', onPointerDown }) => {
    const [hovered, setHovered] = useState(false);
    const s = HANDLE_RADIUS / zoom;
    const hitR = HIT_RADIUS / zoom;
    const strokeW = 1.5 / zoom;
    const pts = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
    const labelWidth = ((label?.length ?? 0) * (LABEL_FONT_SIZE * 0.55) + LABEL_PADDING_X) / zoom;
    const labelHeight = (LABEL_FONT_SIZE + LABEL_PADDING_Y) / zoom;
    const labelCenterY = cy + LABEL_OFFSET_Y / zoom;
    const labelTextY = labelCenterY + (LABEL_FONT_SIZE * LABEL_BASELINE_ADJUST) / zoom;

    return (
      <g>
        {hovered && label && (
          <g pointerEvents="none">
            <rect
              x={cx - labelWidth / 2}
              y={labelCenterY - labelHeight / 2}
              width={labelWidth}
              height={labelHeight}
              rx={3 / zoom}
              fill="rgba(0,0,0,0.75)"
            />
            <text
              x={cx}
              y={labelTextY}
              textAnchor="middle"
              fill="#fff"
              fontSize={LABEL_FONT_SIZE / zoom}
              fontFamily="system-ui, sans-serif"
              pointerEvents="none"
            >
              {label}
            </text>
          </g>
        )}
        <polygon
          points={pts}
          fill="#fff"
          stroke={color}
          strokeWidth={strokeW}
          pointerEvents="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={hitR}
          fill="transparent"
          style={{ cursor, pointerEvents: 'all' }}
          onPointerDown={onPointerDown}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        />
      </g>
    );
  },
);
DiamondHandle.displayName = 'DiamondHandle';

/* ─── GizmoDashedLine ─── */
export interface GizmoDashedLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  zoom: number;
  color?: string;
}

export const GizmoDashedLine: React.FC<GizmoDashedLineProps> = React.memo(
  ({ x1, y1, x2, y2, zoom, color = GIZMO_LINE }) => (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={1 / zoom}
      strokeDasharray={`${4 / zoom} ${3 / zoom}`}
      pointerEvents="none"
      opacity={0.7}
    />
  ),
);
GizmoDashedLine.displayName = 'GizmoDashedLine';

/* ─── GizmoArc ─── */
export interface GizmoArcProps {
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  zoom: number;
  color?: string;
}

export const GizmoArc: React.FC<GizmoArcProps> = React.memo(
  ({ cx, cy, radius, startAngle, endAngle, zoom, color = GIZMO_LINE }) => {
    const start = {
      x: cx + Math.cos(startAngle) * radius,
      y: cy + Math.sin(startAngle) * radius,
    };
    const end = {
      x: cx + Math.cos(endAngle) * radius,
      y: cy + Math.sin(endAngle) * radius,
    };
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    const sweep = endAngle > startAngle ? 1 : 0;
    const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
    return (
      <path
        d={d}
        stroke={color}
        strokeWidth={1 / zoom}
        fill="none"
        strokeDasharray={`${4 / zoom} ${3 / zoom}`}
        pointerEvents="none"
        opacity={0.6}
      />
    );
  },
);
GizmoArc.displayName = 'GizmoArc';

/* ─── GizmoValueLabel ─── */
export interface GizmoValueLabelProps {
  x: number;
  y: number;
  value: string;
  zoom: number;
  color?: string;
}

export const GizmoValueLabel: React.FC<GizmoValueLabelProps> = React.memo(
  ({ x, y, value, zoom, color = '#fff' }) => {
    const fontSize = 10 / zoom;
    const padX = 4 / zoom;
    const padY = 2 / zoom;
    const charWidth = fontSize * 0.55;
    const bgW = value.length * charWidth + padX * 2;
    const bgH = fontSize + padY * 2;
    return (
      <g pointerEvents="none">
        <rect
          x={x - bgW / 2}
          y={y - bgH / 2}
          width={bgW}
          height={bgH}
          rx={3 / zoom}
          fill="rgba(0,0,0,0.7)"
        />
        <text
          x={x}
          y={y + fontSize * 0.35}
          textAnchor="middle"
          fill={color}
          fontSize={fontSize}
          fontFamily="system-ui, sans-serif"
        >
          {value}
        </text>
      </g>
    );
  },
);
GizmoValueLabel.displayName = 'GizmoValueLabel';
