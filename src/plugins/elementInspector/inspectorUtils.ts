import type { CanvasElement, SubPath, Command } from '../../types';

export interface GeometryInfo {
  subPathCount: number;
  totalNodes: number;
  totalSegments: number;
  lineCount: number;
  curveCount: number;
  closeCount: number;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  center: { x: number; y: number } | null;
  estimatedLength: number;
}

export interface StyleInfo {
  fillColor: string;
  fillOpacity: number;
  fillRule?: string;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  strokeLinecap?: string;
  strokeLinejoin?: string;
  strokeDasharray?: string;
  opacity?: number;
  mixBlendMode?: string;
  visibility?: string;
  vectorEffect?: string;
}

export interface PropertyEntry {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'object';
}

function lineLength(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function inspectGeometry(el: CanvasElement): GeometryInfo | null {
  if (el.type !== 'path') return null;

  let totalNodes = 0;
  let lineCount = 0;
  let curveCount = 0;
  let closeCount = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;
  let estimatedLength = 0;
  let lastPos: { x: number; y: number } | null = null;

  el.data.subPaths.forEach((sp: SubPath) => {
    sp.forEach((cmd: Command) => {
      if (cmd.type === 'Z') {
        closeCount++;
        return;
      }
      totalNodes++;
      const p = cmd.position;
      hasPoints = true;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;

      if (lastPos) {
        if (cmd.type === 'L' || cmd.type === 'M') {
          estimatedLength += lineLength(lastPos, p);
        } else if (cmd.type === 'C') {
          // Rough approximation: chord + control polygon / 2
          const chord = lineLength(lastPos, p);
          const cp1 = lineLength(lastPos, cmd.controlPoint1);
          const cp2 = lineLength(cmd.controlPoint1, cmd.controlPoint2);
          const cp3 = lineLength(cmd.controlPoint2, p);
          estimatedLength += (chord + cp1 + cp2 + cp3) / 2;
        }
      }

      if (cmd.type === 'L') lineCount++;
      if (cmd.type === 'C') curveCount++;
      lastPos = p;
    });
  });

  return {
    subPathCount: el.data.subPaths.length,
    totalNodes,
    totalSegments: lineCount + curveCount,
    lineCount,
    curveCount,
    closeCount,
    boundingBox: hasPoints ? {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    } : null,
    center: hasPoints ? {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    } : null,
    estimatedLength,
  };
}

export function inspectStyle(el: CanvasElement): StyleInfo | null {
  if (el.type !== 'path') return null;
  const d = el.data;
  return {
    fillColor: d.fillColor,
    fillOpacity: d.fillOpacity,
    fillRule: d.fillRule,
    strokeColor: d.strokeColor,
    strokeWidth: d.strokeWidth,
    strokeOpacity: d.strokeOpacity,
    strokeLinecap: d.strokeLinecap,
    strokeLinejoin: d.strokeLinejoin,
    strokeDasharray: d.strokeDasharray,
    opacity: d.opacity,
    mixBlendMode: d.mixBlendMode,
    visibility: d.visibility,
    vectorEffect: d.vectorEffect,
  };
}

export function getElementProperties(el: CanvasElement): PropertyEntry[] {
  const entries: PropertyEntry[] = [
    { key: 'id', value: el.id, type: 'string' },
    { key: 'type', value: el.type, type: 'string' },
    { key: 'zIndex', value: String(el.zIndex), type: 'number' },
    { key: 'parentId', value: el.parentId ?? 'none', type: 'string' },
  ];

  if (el.type === 'path') {
    entries.push({ key: 'isPencilPath', value: String(el.data.isPencilPath ?? false), type: 'boolean' });
    entries.push({ key: 'hasTextPath', value: String(!!el.data.textPath), type: 'boolean' });
    entries.push({ key: 'hasTransform', value: String(!!el.data.transform), type: 'boolean' });
    entries.push({ key: 'isTextPathRef', value: String(el.data.isTextPathRef ?? false), type: 'boolean' });

    if (el.data.filterId) entries.push({ key: 'filterId', value: el.data.filterId, type: 'string' });
    if (el.data.clipPathId) entries.push({ key: 'clipPathId', value: el.data.clipPathId, type: 'string' });
    if (el.data.maskId) entries.push({ key: 'maskId', value: el.data.maskId, type: 'string' });
    if (el.data.markerStart) entries.push({ key: 'markerStart', value: el.data.markerStart, type: 'string' });
    if (el.data.markerEnd) entries.push({ key: 'markerEnd', value: el.data.markerEnd, type: 'string' });
    if (el.data.transformMatrix) {
      entries.push({ key: 'transformMatrix', value: `[${el.data.transformMatrix.join(', ')}]`, type: 'object' });
    }
  }

  if (el.type === 'group') {
    entries.push({ key: 'name', value: el.data.name, type: 'string' });
    entries.push({ key: 'childCount', value: String(el.data.childIds.length), type: 'number' });
    entries.push({ key: 'isLocked', value: String(el.data.isLocked), type: 'boolean' });
    entries.push({ key: 'isHidden', value: String(el.data.isHidden), type: 'boolean' });
    entries.push({ key: 'isExpanded', value: String(el.data.isExpanded), type: 'boolean' });
  }

  return entries;
}
