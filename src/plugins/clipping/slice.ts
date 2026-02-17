import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { PathData } from '../../types';
import { measurePath } from '../../utils/measurementUtils';
import { translatePathData } from '../../utils/transformationUtils';

export interface ClipBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface ClipDefinition {
  id: string;
  name: string;
  pathData: PathData;
  bounds: ClipBounds;
  originX: number;
  originY: number;
  clipPathUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  shouldScaleToElement?: boolean;
  rawContent?: string;
  baseElementTag?: string;
  baseElementAttrs?: Record<string, string>;
  baseElementContent?: string;
}

export interface ClippingPluginSlice {
  clips: ClipDefinition[];
  createClipFromSelection: () => void;
  createClipFromPath?: (pathData: PathData, name?: string) => string | undefined;
  addClipFromRawContent?: (rawContent: string, name: string, bounds: ClipBounds) => string;
  assignClipToSelection: (clipId: string) => void;
  clearClipFromSelection: () => void;
  removeClip: (clipId: string) => void;
  renameClip: (clipId: string, name: string) => void;
  updateClip: (clipId: string, updates: Partial<ClipDefinition>) => void;
}

const makeClipId = () => `clip-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const ensurePositiveDimension = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 1;

export const createClippingSlice: StateCreator<CanvasStore, [], [], ClippingPluginSlice> = (set, get) => {
  // Preserve persisted state if it exists
  const currentState = get();
  const persistedClips = (currentState as unknown as ClippingPluginSlice).clips;
  
  return {
  clips: Array.isArray(persistedClips) && persistedClips.length > 0 ? persistedClips : [],
  createClipFromSelection: () => {
    const store = get();
    const pathElement = store.elements.find((element) => store.selectedIds.includes(element.id) && element.type === 'path');
    if (!pathElement) return;

    const pathData = pathElement.data as PathData;
    const bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    if (width === 0 && height === 0) {
      return;
    }
    const safeWidth = ensurePositiveDimension(width);
    const safeHeight = ensurePositiveDimension(height);

    const storedPathData = JSON.parse(JSON.stringify(pathData)) as PathData;
    const normalizedPathData = translatePathData(storedPathData, -bounds.minX, -bounds.minY);
    const clip = {
      id: makeClipId(),
      name: `Clip ${get().clips.length + 1}`,
      pathData: normalizedPathData,
      bounds: {
        minX: 0,
        minY: 0,
        width: safeWidth,
        height: safeHeight,
      },
      originX: bounds.minX,
      originY: bounds.minY,
      clipPathUnits: 'userSpaceOnUse',
      shouldScaleToElement: true,
    };

    set((state) => ({
      clips: [...state.clips, clip],
    }));
  },
  // Create a clip from provided path data (used by presets)
  createClipFromPath: (pathData: import('../../types').PathData, name?: string) => {
    const bounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    if (width === 0 && height === 0) return;
    const safeWidth = ensurePositiveDimension(width);
    const safeHeight = ensurePositiveDimension(height);

    const storedPathData = JSON.parse(JSON.stringify(pathData)) as PathData;
    const normalizedPathData = translatePathData(storedPathData, -bounds.minX, -bounds.minY);
    const clip = {
      id: makeClipId(),
      name: name ?? `Clip ${get().clips.length + 1}`,
      pathData: normalizedPathData,
      bounds: {
        minX: 0,
        minY: 0,
        width: safeWidth,
        height: safeHeight,
      },
      originX: bounds.minX,
      originY: bounds.minY,
      clipPathUnits: 'userSpaceOnUse',
      shouldScaleToElement: true,
    };

    set((state) => ({ clips: [...state.clips, clip] }));
    return clip.id;
  },
  // Add clip from raw SVG content (for animated presets)
  addClipFromRawContent: (rawContent: string, name: string, bounds: ClipBounds) => {
    const clip: ClipDefinition = {
      id: makeClipId(),
      name,
      pathData: { subPaths: [], strokeWidth: 1, strokeColor: '#000', strokeOpacity: 1, fillColor: '#000', fillOpacity: 1 },
      bounds,
      originX: bounds.minX,
      originY: bounds.minY,
      clipPathUnits: 'userSpaceOnUse',
      shouldScaleToElement: true,
      rawContent,
    };
    set((state) => ({ clips: [...state.clips, clip] }));
    return clip.id;
  },
  assignClipToSelection: (clipId) => {
    const store = get();
    const { selectedIds, elements, updateElement } = store;

    selectedIds.forEach((id) => {
      const element = elements.find((el) => el.id === id);
      if (!element) return;
      updateElement?.(id, {
        data: {
          ...(element.data as Record<string, unknown>),
          clipPathId: `${clipId}-${id}`,
          clipPathTemplateId: clipId,
        },
      });
    });
  },
  clearClipFromSelection: () => {
    const store = get();
    const { selectedIds, elements, updateElement, temporal } = store;

    temporal?.getState().pause();
    selectedIds.forEach((id) => {
      const element = elements.find((el) => el.id === id);
      if (!element) return;
      updateElement?.(id, {
        data: { 
          clipPathId: undefined,
          clipPathTemplateId: undefined
        },
      });
    });
    temporal?.getState().resume();
  },
  removeClip: (clipId) => {
    set((state) => ({
      clips: state.clips.filter((clip: ClipDefinition) => clip.id !== clipId),
    }));

    const store = get();
    const { elements, updateElement } = store;
    elements.forEach((element) => {
      const data = element.data as Record<string, unknown>;
      if (data.clipPathTemplateId === clipId) {
        const nextData = { ...data };
        delete nextData.clipPathId;
        delete nextData.clipPathTemplateId;
        updateElement?.(element.id, {
          ...element,
          data: nextData,
        });
      }
    });
  },
  renameClip: (clipId, name) => {
    set((state) => ({
      clips: state.clips.map((clip: ClipDefinition) =>
        clip.id === clipId ? { ...clip, name } : clip
      ),
    }));
  },

  updateClip: (clipId, updates) => {
    set((state) => ({
      clips: state.clips.map((clip: ClipDefinition) =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
    }));
  },

  // Selection via library search
  selectedFromSearch: null,
  selectFromSearch: (id: string | null) => set(() => ({ selectedFromSearch: id })),
};
};
