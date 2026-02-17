import type { CanvasElement, PathData } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { calculateMultiElementBounds } from '../../utils/selectionBoundsUtils';
import { commandsToString } from '../../utils/pathParserUtils';

export interface LlmAssistantSelectionEntry {
  id: string;
  type: string;
  parentId: string | null;
  data: Record<string, unknown>;
}

export interface LlmAssistantContext {
  document: {
    documentName: string;
    elementCount: number;
    viewport: CanvasStore['viewport'];
    activeGroupId: string | null;
    insertAt: { x: number; y: number };
  };
  selection: {
    ids: string[];
    bounds: null | {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      centerX: number;
      centerY: number;
      width: number;
      height: number;
    };
    elements: LlmAssistantSelectionEntry[];
  };
  styleDefaults: Partial<{
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;
    fillColor: string;
    fillOpacity: number;
    opacity: number;
  }>;
}

const MAX_D_CHARS = 2000;

const toCompactPathData = (pathData: PathData): Record<string, unknown> => {
  const d = commandsToString(pathData.subPaths.flat());
  const maybeTruncated = d.length > MAX_D_CHARS;
  const dCompact = maybeTruncated ? `${d.slice(0, MAX_D_CHARS)}…` : d;

  return {
    d: dCompact,
    dIsTruncated: maybeTruncated,
    strokeColor: pathData.strokeColor,
    strokeWidth: pathData.strokeWidth,
    strokeOpacity: pathData.strokeOpacity,
    fillColor: pathData.fillColor,
    fillOpacity: pathData.fillOpacity,
    opacity: pathData.opacity,
    transformMatrix: pathData.transformMatrix,
  };
};

const computeDocumentInsertPoint = (elements: CanvasElement[]): { x: number; y: number } => {
  const pathElements = elements.filter((el) => el.type === 'path');
  if (pathElements.length === 0) {
    return { x: 0, y: 0 };
  }

  const bounds = calculateMultiElementBounds(pathElements);
  if (!Number.isFinite(bounds.centerX) || !Number.isFinite(bounds.centerY)) {
    return { x: 0, y: 0 };
  }
  return { x: bounds.centerX, y: bounds.centerY };
};

export function buildLlmAssistantContext(state: CanvasStore): LlmAssistantContext {
  const selectedIds = state.selectedIds ?? [];
  const elements = state.elements ?? [];
  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const selectedPathElements = selectedElements.filter((el) => el.type === 'path');

  const bounds =
    selectedPathElements.length > 0
      ? calculateMultiElementBounds(selectedPathElements, { includeStroke: true, zoom: state.viewport.zoom })
      : null;

  const insertAt = selectedIds.length > 0 && bounds
    ? { x: bounds.centerX, y: bounds.centerY }
    : computeDocumentInsertPoint(elements);

  const groupEditor = (state as unknown as { groupEditor?: { activeGroupId: string | null; isEditing: boolean } }).groupEditor;
  const activeGroupId = groupEditor?.isEditing ? groupEditor.activeGroupId ?? null : null;

  const style = (state as unknown as { style?: Record<string, unknown> }).style as
    | {
        strokeWidth: number;
        strokeColor: string;
        strokeOpacity: number;
        fillColor: string;
        fillOpacity: number;
        opacity: number;
      }
    | undefined;

  return {
    document: {
      documentName: state.documentName ?? 'VectorNest',
      elementCount: elements.length,
      viewport: state.viewport,
      activeGroupId,
      insertAt,
    },
    selection: {
      ids: selectedIds,
      bounds,
      elements: selectedElements.map((el) => ({
        id: el.id,
        type: el.type,
        parentId: el.parentId,
        data: el.type === 'path' ? toCompactPathData(el.data as PathData) : (el.data as Record<string, unknown>),
      })),
    },
    styleDefaults: style
      ? {
          strokeWidth: style.strokeWidth,
          strokeColor: style.strokeColor,
          strokeOpacity: style.strokeOpacity,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
          opacity: style.opacity,
        }
      : {},
  };
}
