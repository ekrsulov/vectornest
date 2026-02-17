import React from 'react';
import { useColorMode } from '@chakra-ui/react';
import type { Point } from '../../types';
import type { NativeShapesPluginSlice } from './slice';

interface NativeShapesPreviewProps {
  kind: NativeShapesPluginSlice['nativeShape']['kind'];
  start: Point;
  end: Point;
  templatePoints?: { x: number; y: number }[];
  viewport: { zoom: number };
}

export const NativeShapesPreview: React.FC<NativeShapesPreviewProps> = ({
  kind,
  start,
  end,
  templatePoints = [],
  viewport,
}) => {
  const { colorMode } = useColorMode();
  const stroke = colorMode === 'dark' ? '#dee2e6' : '#6b7280';
  const strokeWidth = 1 / viewport.zoom;
  const dash = `${2 / viewport.zoom} ${2 / viewport.zoom}`;

  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  if (width === 0 && height === 0) return null;

  if (kind === 'line') {
    return (
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeOpacity={0.7}
        fill="none"
      />
    );
  }

  if (kind === 'circle') {
    const diameter = Math.min(width, height);
    const cx = start.x <= end.x ? minX + diameter / 2 : minX + diameter / 2;
    const cy = start.y <= end.y ? minY + diameter / 2 : minY + diameter / 2;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={diameter / 2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeOpacity={0.7}
        fill="none"
      />
    );
  }

  if (kind === 'ellipse') {
    return (
      <ellipse
        cx={minX + width / 2}
        cy={minY + height / 2}
        rx={width / 2}
        ry={height / 2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeOpacity={0.7}
        fill="none"
      />
    );
  }

  if (kind === 'polygon' || kind === 'polyline') {
    const templateMinX = Math.min(...templatePoints.map((p) => p.x), 0);
    const templateMinY = Math.min(...templatePoints.map((p) => p.y), 0);
    const templateMaxX = Math.max(...templatePoints.map((p) => p.x), 1);
    const templateMaxY = Math.max(...templatePoints.map((p) => p.y), 1);
    const scaleX = width / (templateMaxX - templateMinX || 1);
    const scaleY = height / (templateMaxY - templateMinY || 1);
    let pointsList = (templatePoints.length ? templatePoints : [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 80 },
    ]).map((pt) => {
      const px = minX + (pt.x - templateMinX) * scaleX;
      const py = minY + (pt.y - templateMinY) * scaleY;
      return { x: px, y: py };
    });

    // For polyline stars, ensure the preview is closed by appending the first point
    if (kind === 'polyline' && pointsList.length > 0) {
      const first = pointsList[0];
      const last = pointsList[pointsList.length - 1];
      if (first.x !== last.x || first.y !== last.y) {
        pointsList = [...pointsList, { x: first.x, y: first.y }];
      }
    }

    const pointsAttr = pointsList.map((pt) => `${pt.x},${pt.y}`).join(' ');
    const Tag = kind;
    return (
      <Tag
        points={pointsAttr}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        strokeOpacity={0.7}
        fill="none"
      />
    );
  }

  // rect fallback
  return (
    <rect
      x={minX}
      y={minY}
      width={width}
      height={height}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      strokeOpacity={0.7}
      fill="none"
      rx={kind === 'rect' ? undefined : 0}
      ry={kind === 'rect' ? undefined : 0}
    />
  );
};
