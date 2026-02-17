import type { Command, CanvasElement, GroupElement, PathData, PathElement } from '../../types';
import type { NativeShapeElement } from '../nativeShapes/types';
import { parsePathD, extractSubpaths } from '../../utils/pathParserUtils';
import { BEZIER_CIRCLE_KAPPA } from '../../utils/bezierCircle';
import { normalizeMarkerId } from '../../utils/markerUtils';
import { type Matrix } from '../../utils/matrixUtils';
import { useCanvasStore } from '../../store/canvasStore';
import { buildNativeShapeMatrix } from '../../utils/selectPanelHelpers';
import { normalizeToMLCZ } from '../../utils/svg/normalizer';

const isIdentityMatrix = (matrix?: Matrix): boolean => {
  if (!matrix) return true;
  return (
    Math.abs(matrix[0] - 1) < 1e-6 &&
    Math.abs(matrix[1]) < 1e-6 &&
    Math.abs(matrix[2]) < 1e-6 &&
    Math.abs(matrix[3] - 1) < 1e-6 &&
    Math.abs(matrix[4]) < 1e-6 &&
    Math.abs(matrix[5]) < 1e-6
  );
};

const shapeDataToPathString = (data: NativeShapeElement['data']): string | null => {
  switch (data.kind) {
    case 'rect':
    case 'square': {
      const width = data.kind === 'square' ? Math.min(data.width, data.height) : data.width;
      const height = data.kind === 'square' ? Math.min(data.width, data.height) : data.height;
      const rx = data.rx ?? 0;
      const ry = data.ry ?? data.rx ?? 0;
      if (rx > 0 || ry > 0) {
        const rxClamped = Math.min(rx, width / 2);
        const ryClamped = Math.min(ry, height / 2);
        return (
          `M ${data.x + rxClamped} ${data.y} ` +
          `L ${data.x + width - rxClamped} ${data.y} ` +
          `Q ${data.x + width} ${data.y} ${data.x + width} ${data.y + ryClamped} ` +
          `L ${data.x + width} ${data.y + height - ryClamped} ` +
          `Q ${data.x + width} ${data.y + height} ${data.x + width - rxClamped} ${data.y + height} ` +
          `L ${data.x + rxClamped} ${data.y + height} ` +
          `Q ${data.x} ${data.y + height} ${data.x} ${data.y + height - ryClamped} ` +
          `L ${data.x} ${data.y + ryClamped} ` +
          `Q ${data.x} ${data.y} ${data.x + rxClamped} ${data.y} Z`
        );
      }
      return `M ${data.x} ${data.y} L ${data.x + width} ${data.y} L ${data.x + width} ${data.y + height} L ${data.x} ${data.y + height} Z`;
    }
    case 'circle': {
      const radius = Math.min(data.width, data.height) / 2;
      const cx = data.x + data.width / 2;
      const cy = data.y + data.height / 2;
      const k = BEZIER_CIRCLE_KAPPA;
      const kr = k * radius;
      return (
        `M ${cx} ${cy - radius} ` +
        `C ${cx + kr} ${cy - radius} ${cx + radius} ${cy - kr} ${cx + radius} ${cy} ` +
        `C ${cx + radius} ${cy + kr} ${cx + kr} ${cy + radius} ${cx} ${cy + radius} ` +
        `C ${cx - kr} ${cy + radius} ${cx - radius} ${cy + kr} ${cx - radius} ${cy} ` +
        `C ${cx - radius} ${cy - kr} ${cx - kr} ${cy - radius} ${cx} ${cy - radius} Z`
      );
    }
    case 'ellipse': {
      const rx = data.width / 2;
      const ry = data.height / 2;
      const cx = data.x + rx;
      const cy = data.y + ry;
      const k = BEZIER_CIRCLE_KAPPA;
      const krx = k * rx;
      const kry = k * ry;
      return (
        `M ${cx} ${cy - ry} ` +
        `C ${cx + krx} ${cy - ry} ${cx + rx} ${cy - kry} ${cx + rx} ${cy} ` +
        `C ${cx + rx} ${cy + kry} ${cx + krx} ${cy + ry} ${cx} ${cy + ry} ` +
        `C ${cx - krx} ${cy + ry} ${cx - rx} ${cy + kry} ${cx - rx} ${cy} ` +
        `C ${cx - rx} ${cy - kry} ${cx - krx} ${cy - ry} ${cx} ${cy - ry} Z`
      );
    }
    case 'line': {
      const x1 = data.x;
      const y1 = data.y;
      const x2 = data.x + data.width;
      const y2 = data.y + data.height;
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    case 'polygon':
    case 'polyline': {
      const points = data.points ?? [];
      if (points.length === 0) return null;
      const [first, ...rest] = points;
      const segments = rest.map((pt) => `L ${pt.x} ${pt.y}`).join(' ');
      const closeCmd = data.kind === 'polygon' ? ' Z' : '';
      return `M ${first.x} ${first.y}${segments ? ` ${segments}` : ''}${closeCmd}`;
    }
    default:
      return null;
  }
};

const pathStringToSubPaths = (pathData: string): Command[][] => {
  const normalized = normalizeToMLCZ(pathData);
  const commands = parsePathD(normalized);
  return extractSubpaths(commands).map((subPath) => subPath.commands);
};

const nativeShapeToPathElement = (element: NativeShapeElement): PathElement | null => {
  const pathString = shapeDataToPathString(element.data);
  if (!pathString) return null;

  const subPaths = pathStringToSubPaths(pathString);
  if (subPaths.length === 0) return null;

  const transformMatrix = element.data.transformMatrix ?? buildNativeShapeMatrix(element.data);

  const pathData: PathData = {
    subPaths,
    strokeWidth: element.data.strokeWidth ?? 1,
    strokeColor: element.data.strokeColor ?? '#000000',
    strokeOpacity: element.data.strokeOpacity ?? 1,
    fillColor: element.data.fillColor ?? 'none',
    fillOpacity: element.data.fillOpacity ?? 1,
    strokeLinecap: element.data.strokeLinecap,
    strokeLinejoin: element.data.strokeLinejoin,
    strokeDasharray: element.data.strokeDasharray ?? 'none',
    strokeDashoffset: element.data.strokeDashoffset,
    strokeMiterlimit: element.data.strokeMiterlimit,
    filterId: element.data.filterId,
    clipPathId: element.data.clipPathId,
    clipPathTemplateId: element.data.clipPathTemplateId,
    maskId: element.data.maskId,
    markerStart: normalizeMarkerId(element.data.markerStart),
    markerMid: normalizeMarkerId(element.data.markerMid),
    markerEnd: normalizeMarkerId(element.data.markerEnd),
    opacity: element.data.opacity,
    vectorEffect: element.data.vectorEffect,
    shapeRendering: element.data.shapeRendering,
    mixBlendMode: element.data.mixBlendMode,
    isolation: element.data.isolation,
  };

  if (element.data.sourceId) {
    (pathData as { sourceId?: string }).sourceId = element.data.sourceId;
  }

  if (!isIdentityMatrix(transformMatrix)) {
    pathData.transformMatrix = transformMatrix as Matrix;
  }

  return {
    ...element,
    type: 'path',
    data: pathData,
  };
};

const collectConvertibleShapes = (
  selectedIds: string[],
  elementMap: Map<string, CanvasElement>
): NativeShapeElement[] => {
  const results: NativeShapeElement[] = [];
  const visited = new Set<string>();

  const getChildren = (id: string): CanvasElement[] => {
    const el = elementMap.get(id);
    if (el?.type === 'group') {
      const data = (el as GroupElement).data;
      if (Array.isArray(data.childIds) && data.childIds.length > 0) {
        return data.childIds
          .map((childId) => elementMap.get(childId))
          .filter((child): child is CanvasElement => Boolean(child));
      }
    }
    // Fallback: derive children by parentId for groups that don't have childIds populated (e.g., imported groups)
    return Array.from(elementMap.values()).filter((child) => child.parentId === id);
  };

  const walk = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id);
    const el = elementMap.get(id);
    if (!el) return;

    if (el.type === 'group') {
      getChildren(id).forEach((child) => walk(child.id));
      return;
    }

    if (el.type === 'nativeShape') {
      results.push(el as NativeShapeElement);
    }
  };

  selectedIds.forEach(walk);
  return results;
};

export const countConvertibleShapes = (selectedIds: string[], elements: CanvasElement[]): number => {
  if (!selectedIds.length || !elements.length) return 0;
  const elementMap = new Map<string, CanvasElement>(elements.map((el) => [el.id, el]));
  const count = collectConvertibleShapes(selectedIds, elementMap).length;
  return count;
};

export const convertSelectionToPaths = (): number => {
  const state = useCanvasStore.getState();
  const elements = state.elements || [];
  const selectedIds = state.selectedIds || [];

  if (!selectedIds.length || !elements.length) {
    return 0;
  }

  const elementMap = new Map<string, CanvasElement>(elements.map((el) => [el.id, el]));
  const convertible = collectConvertibleShapes(selectedIds, elementMap);

  if (convertible.length === 0) {
    return 0;
  }

  const replacementMap = new Map<string, PathElement>();
  convertible.forEach((el) => {
    const converted = nativeShapeToPathElement(el);
    if (converted) {
      replacementMap.set(el.id, converted);
    }
  });

  if (replacementMap.size === 0) {
    return 0;
  }

  const updatedElements = elements.map((el) => replacementMap.get(el.id) ?? el);
  useCanvasStore.setState({ elements: updatedElements });

  return replacementMap.size;
};
