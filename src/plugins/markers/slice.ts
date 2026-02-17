import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { PathData, PathElement } from '../../types';
import type { NativeShapeElement } from '../nativeShapes/types';
import { normalizeMarkerId } from '../../utils/markerUtils';

export type MarkerSide = 'start' | 'mid' | 'end';

export interface MarkerDefinition {
  id: string;
  name: string;
  path: string;
  markerWidth: number;
  markerHeight: number;
  refX: number;
  refY: number;
  orient: 'auto' | 'auto-start-reverse' | string;
  markerUnits?: string;
  viewBox?: string;
  content?: string;
}

export interface MarkersSlice {
  markers: MarkerDefinition[];
  addMarker: (markerOverride?: Partial<MarkerDefinition>) => void;
  updateMarker: (id: string, updates: Partial<MarkerDefinition>) => void;
  removeMarker: (id: string) => void;
  assignMarkerToSelection: (side: MarkerSide, markerId: string | null) => void;
  clearMarkersFromSelection: () => void;
}

const DEFAULT_MARKERS: MarkerDefinition[] = [
  {
    id: 'marker-arrow',
    name: 'Arrow',
    path: 'M0 0 L6 3 L0 6 L2 3 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 6,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-circle',
    name: 'Dot',
    path: 'M3 0 A3 3 0 1 1 3 6 A3 3 0 1 1 3 0 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: '0',
  },
  {
    id: 'marker-diamond',
    name: 'Diamond',
    path: 'M3 0 L6 3 L3 6 L0 3 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-line-vertical',
    name: 'Line Vertical',
    path: 'M2 0 L4 0 L4 6 L2 6 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-chevron',
    name: 'Chevron',
    path: 'M0 0 L3 3 L0 6',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-triangle',
    name: 'Triangle',
    path: 'M0 6 L3 0 L6 6 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-cross',
    name: 'Cross',
    path: 'M2 0 L4 0 L4 2 L6 2 L6 4 L4 4 L4 6 L2 6 L2 4 L0 4 L0 2 L2 2 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-star',
    name: 'Star',
    path: 'M3 0 L3.6 2 L6 2 L4.2 3.4 L4.8 6 L3 4.4 L1.2 6 L1.8 3.4 L0 2 L2.4 2 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-square',
    name: 'Square',
    path: 'M0 0 L6 0 L6 6 L0 6 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-triangle-up',
    name: 'Triangle Up',
    path: 'M0 6 L3 0 L6 6 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
  {
    id: 'marker-triangle-down',
    name: 'Triangle Down',
    path: 'M0 0 L3 6 L6 0 Z',
    markerWidth: 6,
    markerHeight: 6,
    refX: 3,
    refY: 3,
    orient: 'auto',
  },
];

const makeMarkerId = () => `marker-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

type MarkerFieldKey = 'markerStart' | 'markerMid' | 'markerEnd';

const getSideKey = (side: MarkerSide): MarkerFieldKey => {
  switch (side) {
    case 'start':
      return 'markerStart';
    case 'mid':
      return 'markerMid';
    case 'end':
      return 'markerEnd';
  }
};

const MARKER_CAPABLE_NATIVE_KINDS: Array<NativeShapeElement['data']['kind']> = [
  'line',
  'polyline',
  'polygon',
  'rect',
  'square',
  'circle',
  'ellipse',
];

const isMarkerCapableElement = (
  el: unknown
): el is PathElement | NativeShapeElement => {
  if (!el || typeof el !== 'object') return false;
  const candidate = el as { type?: string; data?: unknown };
  if (!candidate.data || typeof candidate.type !== 'string') return false;
  if (candidate.type === 'path') return true;
  if (candidate.type === 'nativeShape') {
    const kind = (candidate.data as Partial<NativeShapeElement['data']>).kind;
    if (typeof kind !== 'string') return false;
    return MARKER_CAPABLE_NATIVE_KINDS.includes(kind);
  }
  return false;
};

export const createMarkersSlice: StateCreator<CanvasStore, [], [], MarkersSlice> = (set, get) => {
  // Preserve persisted state if it exists, otherwise use defaults
  const currentState = get();
  const persistedMarkers = (currentState as unknown as MarkersSlice).markers;
  
  return {
  markers: Array.isArray(persistedMarkers) && persistedMarkers.length > 0 ? persistedMarkers : DEFAULT_MARKERS,
  addMarker: (override = {}) => {
    set((state) => {
      const nextId = makeMarkerId();
      const name = override.name || `Marker ${state.markers.length + 1}`;
      const base = DEFAULT_MARKERS[0];
      const newMarker: MarkerDefinition = {
        id: nextId,
        name,
        path: override.path ?? base.path,
        markerWidth: override.markerWidth ?? base.markerWidth,
        markerHeight: override.markerHeight ?? base.markerHeight,
        refX: override.refX ?? base.refX,
        refY: override.refY ?? base.refY,
        orient: override.orient ?? base.orient,
      };
      return {
        markers: [...state.markers, newMarker],
      };
    });
  },
  updateMarker: (id, updates) => {
    set((state) => ({
      markers: state.markers.map((marker: MarkerDefinition) =>
        marker.id === id ? { ...marker, ...updates } : marker
      ),
    }));
  },
  removeMarker: (id) => {
    set((state) => ({
      markers: state.markers.filter((marker: MarkerDefinition) => marker.id !== id),
    }));

    const store = get();
    const { elements, updateElement } = store;
    const matchesMarker = (value?: string) => normalizeMarkerId(value) === id;
    elements
      .filter(isMarkerCapableElement)
      .forEach((el) => {
        const data = el.data as PathData | NativeShapeElement['data'];
        const needsCleanup =
          matchesMarker((data as PathData).markerStart) ||
          matchesMarker((data as PathData).markerMid) ||
          matchesMarker((data as PathData).markerEnd);

        if (!needsCleanup) return;

        updateElement?.(el.id, {
          data: {
            ...data,
            markerStart: matchesMarker((data as PathData).markerStart) ? undefined : (data as PathData).markerStart,
            markerMid: matchesMarker((data as PathData).markerMid) ? undefined : (data as PathData).markerMid,
            markerEnd: matchesMarker((data as PathData).markerEnd) ? undefined : (data as PathData).markerEnd,
          },
        });
      });
  },
  assignMarkerToSelection: (side, markerId) => {
    const store = get();
    const { selectedIds, elements, updateElement } = store;
    const targetKey = getSideKey(side);
    const normalizedMarkerId = normalizeMarkerId(markerId ?? undefined);

    selectedIds.forEach((id) => {
      const element = elements.find((el) => el.id === id);
      if (!element || !isMarkerCapableElement(element)) return;

      const data = element.data as PathData | NativeShapeElement['data'];
      const updated = { ...data } as PathData | NativeShapeElement['data'];
      const markerFields = updated as Record<MarkerFieldKey, string | undefined>;

      if (normalizedMarkerId) {
        markerFields[targetKey] = normalizedMarkerId;
      } else {
        delete markerFields[targetKey];
      }

      updateElement?.(element.id, { data: updated });
    });
  },
  clearMarkersFromSelection: () => {
    const store = get();
    const { selectedIds, elements, updateElement, temporal } = store;

    temporal?.getState().pause();
    selectedIds.forEach((id) => {
      const element = elements.find((el) => el.id === id);
      if (!element || !isMarkerCapableElement(element)) return;

      const data = element.data as PathData | NativeShapeElement['data'];
      updateElement?.(element.id, { 
        data: {
          ...data,
          markerStart: undefined,
          markerMid: undefined,
          markerEnd: undefined
        }
      });
    });
    temporal?.getState().resume();
  },

  // Selection via library search
  selectedFromSearch: null,
  selectFromSearch: (id: string | null) => set(() => ({ selectedFromSearch: id })),

};
};
