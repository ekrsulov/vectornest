import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { logger } from '../../utils/logger';
import { insertIconifyIconAtPoint, insertIconifyIconAtRect } from './placement';

export interface IconifyLibraryState {
  query: string;
  collectionQuery: string;
  activeCollectionPrefix: string | null;
  selectedIconId: string | null;
  placingIconId: string | null;
  placementError: string | null;
  isPlacementPending: boolean;
  searchPage: number;
  browsePage: number;
}

export interface IconifyLibrarySlice {
  iconifyLibrary: IconifyLibraryState;
  iconifyPlacementInteraction: {
    isActive: boolean;
    pointerId: number | null;
    startPoint: Point | null;
    targetPoint: Point | null;
    sourceWidth: number;
    sourceHeight: number;
    isShiftPressed: boolean;
  };
  setIconifyQuery: (query: string) => void;
  setIconifyCollectionQuery: (query: string) => void;
  setIconifyActiveCollectionPrefix: (prefix: string | null) => void;
  setIconifySelectedIconId: (iconId: string | null) => void;
  setIconifyPlacingIconId: (iconId: string | null) => void;
  setIconifyPlacementInteraction: (
    updates: Partial<IconifyLibrarySlice['iconifyPlacementInteraction']>
  ) => void;
  clearIconifyPlacementError: () => void;
  placeIconifyIcon: (iconId: string, point: Point) => Promise<void>;
  placeIconifyIconAtRect: (
    iconId: string,
    rect: { x: number; y: number; width: number; height: number }
  ) => Promise<void>;
  setIconifySearchPage: (page: number) => void;
  setIconifyBrowsePage: (page: number) => void;
}

const INITIAL_STATE: IconifyLibraryState = {
  query: '',
  collectionQuery: '',
  activeCollectionPrefix: null,
  selectedIconId: null,
  placingIconId: null,
  placementError: null,
  isPlacementPending: false,
  searchPage: 0,
  browsePage: 0,
};

export const createIconifyLibrarySlice: StateCreator<
  CanvasStore,
  [],
  [],
  IconifyLibrarySlice
> = (set, get) => ({
  iconifyLibrary: INITIAL_STATE,
  iconifyPlacementInteraction: {
    isActive: false,
    pointerId: null,
    startPoint: null,
    targetPoint: null,
    sourceWidth: 1,
    sourceHeight: 1,
    isShiftPressed: false,
  },
  setIconifyQuery: (query) => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        query,
        searchPage: 0,
        placementError: null,
        selectedIconId: query.trim() ? state.iconifyLibrary.selectedIconId : null,
      },
    }));
  },
  setIconifyCollectionQuery: (query) => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        collectionQuery: query,
        placementError: null,
      },
    }));
  },
  setIconifyActiveCollectionPrefix: (prefix) => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        activeCollectionPrefix: prefix,
        browsePage: 0,
        selectedIconId: null,
        placingIconId: null,
        placementError: null,
      },
      iconifyPlacementInteraction: {
        ...state.iconifyPlacementInteraction,
        isActive: false,
        pointerId: null,
        startPoint: null,
        targetPoint: null,
        isShiftPressed: false,
      },
    }));
  },
  setIconifySelectedIconId: (iconId) => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        selectedIconId: iconId,
        placementError: null,
      },
    }));
  },
  setIconifyPlacingIconId: (iconId) => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        placingIconId: iconId,
        placementError: null,
      },
      iconifyPlacementInteraction: {
        ...state.iconifyPlacementInteraction,
        isActive: false,
        pointerId: null,
        startPoint: null,
        targetPoint: null,
        isShiftPressed: false,
      },
    }));
  },
  setIconifyPlacementInteraction: (updates) => {
    set((state) => ({
      iconifyPlacementInteraction: {
        ...state.iconifyPlacementInteraction,
        ...updates,
      },
    }));
  },
  clearIconifyPlacementError: () => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        placementError: null,
      },
    }));
  },
  placeIconifyIcon: async (iconId, point) => {
    const currentStore = get() as CanvasStore & IconifyLibrarySlice;
    if (currentStore.iconifyLibrary.isPlacementPending) {
      return;
    }

    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        isPlacementPending: true,
        placementError: null,
      },
    }));

    try {
      await insertIconifyIconAtPoint(get(), iconId, point);
      set((state) => ({
        iconifyLibrary: {
          ...state.iconifyLibrary,
          placingIconId: state.iconifyLibrary.placingIconId === iconId
            ? null
            : state.iconifyLibrary.placingIconId,
          isPlacementPending: false,
          placementError: null,
        },
      }));
    } catch (error) {
      logger.error('Failed to place Iconify icon', error, { iconId });
      set((state) => ({
        iconifyLibrary: {
          ...state.iconifyLibrary,
          isPlacementPending: false,
          placementError: 'No se pudo insertar el icono en el canvas.',
        },
      }));
    }
  },
  placeIconifyIconAtRect: async (iconId, rect) => {
    const currentStore = get() as CanvasStore & IconifyLibrarySlice;
    if (currentStore.iconifyLibrary.isPlacementPending) {
      return;
    }

    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        isPlacementPending: true,
        placementError: null,
      },
    }));

    try {
      await insertIconifyIconAtRect(get(), iconId, rect);
      set((state) => ({
        iconifyLibrary: {
          ...state.iconifyLibrary,
          placingIconId: state.iconifyLibrary.placingIconId === iconId
            ? null
            : state.iconifyLibrary.placingIconId,
          isPlacementPending: false,
          placementError: null,
        },
      }));
    } catch (error) {
      logger.error('Failed to place Iconify icon at rect', error, { iconId, rect });
      set((state) => ({
        iconifyLibrary: {
          ...state.iconifyLibrary,
          isPlacementPending: false,
          placementError: 'No se pudo insertar el icono en el canvas.',
        },
      }));
    }
  },
  setIconifySearchPage: (page) => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        searchPage: page,
      },
    }));
  },
  setIconifyBrowsePage: (page) => {
    set((state) => ({
      iconifyLibrary: {
        ...state.iconifyLibrary,
        browsePage: page,
      },
    }));
  },
});
