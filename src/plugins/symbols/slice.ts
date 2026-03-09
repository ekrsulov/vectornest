import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { PathData, Point } from '../../types';
import { generateShortId } from '../../utils/idGenerator';
import { measurePath } from '../../utils/measurementUtils';
import { scalePathData, translatePathData } from '../../utils/transformationUtils';
import type { SymbolInstanceData } from './types';
import type { SymbolInstanceElement } from './types';

const ensurePositiveDimension = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 1;

export interface SymbolBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface SymbolDefinition {
  id: string;
  name: string;
  pathData: PathData;
  bounds: SymbolBounds;
  rawContent?: string;
}

export interface SymbolPluginSlice {
  symbols: SymbolDefinition[];
  placingSymbolId: string | null;
  symbolPlacementInteraction: {
    isActive: boolean;
    pointerId: number | null;
    startPoint: Point | null;
    targetPoint: Point | null;
    sourceWidth: number;
    sourceHeight: number;
    isShiftPressed: boolean;
  };
  setPlacingSymbolId: (id: string | null) => void;
  setSymbolPlacementInteraction: (
    updates: Partial<SymbolPluginSlice['symbolPlacementInteraction']>
  ) => void;
  createSymbolFromSelection: () => void;
  placeSymbolInstance: (symbolId: string, point: Point) => void;
  placeSymbolInstanceAtRect: (
    symbolId: string,
    rect: { x: number; y: number; width: number; height: number }
  ) => void;
  removeSymbol: (symbolId: string) => void;
  renameSymbol: (symbolId: string, name: string) => void;
  updateSymbol: (symbolId: string, updates: Partial<SymbolDefinition>) => void;
}

const makeSymbolId = () => generateShortId('symbol');

const createDefinition = (pathData: PathData, name: string, bounds: SymbolBounds): SymbolDefinition => ({
  id: makeSymbolId(),
  name,
  pathData,
  bounds,
});

const createSymbolInstanceData = (
  symbol: SymbolDefinition,
  store: CanvasStore,
  placement: { x: number; y: number; width: number; height: number }
): SymbolInstanceData => {
  const width = ensurePositiveDimension(placement.width);
  const height = ensurePositiveDimension(placement.height);

  const isComplexSymbol = Boolean(symbol.rawContent);
  const pathData = (() => {
    if (isComplexSymbol) {
      return undefined;
    }

    const baseWidth = ensurePositiveDimension(symbol.bounds.width);
    const baseHeight = ensurePositiveDimension(symbol.bounds.height);
    const scaleX = width / baseWidth;
    const scaleY = height / baseHeight;

    if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) {
      return symbol.pathData;
    }

    return scalePathData(symbol.pathData, scaleX, scaleY, 0, 0);
  })();

  const styleOverrides = isComplexSymbol ? {} : {
    strokeColor: store.style.strokeColor,
    strokeWidth: store.style.strokeWidth,
    strokeOpacity: store.style.strokeOpacity,
    strokeLinecap: store.style.strokeLinecap,
    strokeLinejoin: store.style.strokeLinejoin,
    strokeDasharray: store.style.strokeDasharray,
    fillColor: store.style.fillColor,
    fillOpacity: store.style.fillOpacity,
    fillRule: store.style.fillRule,
  };

  return {
    symbolId: symbol.id,
    width,
    height,
    ...(pathData && { pathData }),
    transform: {
      translateX: placement.x,
      translateY: placement.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    ...styleOverrides,
  };
};

export const createSymbolsSlice: StateCreator<CanvasStore, [], [], SymbolPluginSlice> = (set, get) => {
  // Preserve persisted state if it exists
  const currentState = get();
  const persistedSymbols = (currentState as unknown as SymbolPluginSlice).symbols;

  return {
    symbols: Array.isArray(persistedSymbols) && persistedSymbols.length > 0 ? persistedSymbols : [],
    placingSymbolId: null,
    symbolPlacementInteraction: {
      isActive: false,
      pointerId: null,
      startPoint: null,
      targetPoint: null,
      sourceWidth: 1,
      sourceHeight: 1,
      isShiftPressed: false,
    },
    setPlacingSymbolId: (id) => {
      set((state) => ({
        ...state,
        placingSymbolId: id,
        symbolPlacementInteraction: {
          ...state.symbolPlacementInteraction,
          isActive: false,
          pointerId: null,
          startPoint: null,
          targetPoint: null,
          isShiftPressed: false,
        },
      }));
    },
    setSymbolPlacementInteraction: (updates) => {
      set((state) => ({
        ...state,
        symbolPlacementInteraction: {
          ...state.symbolPlacementInteraction,
          ...updates,
        },
      }));
    },
    createSymbolFromSelection: () => {
      const store = get();
      const pathElement = store.elements.find((element) => store.selectedIds.includes(element.id) && element.type === 'path');
      if (!pathElement) {
        return;
      }

      const pathData = pathElement.data as PathData;
      const pathBounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
      const pathWidth = pathBounds.maxX - pathBounds.minX;
      const pathHeight = pathBounds.maxY - pathBounds.minY;
      if (pathWidth === 0 && pathHeight === 0) {
        return;
      }

      const normalized = translatePathData(pathData, -pathBounds.minX, -pathBounds.minY);
      const safeWidth = ensurePositiveDimension(pathWidth);
      const safeHeight = ensurePositiveDimension(pathHeight);
      const definition = createDefinition(
        normalized,
        `Symbol ${get().symbols.length + 1}`,
        {
          minX: 0,
          minY: 0,
          width: safeWidth,
          height: safeHeight,
        }
      );

      set((state) => ({
        symbols: [...state.symbols, definition],
      }));
    },
    // Create a symbol from provided path data (used by presets)
    createSymbolFromPath: (pathData: import('../../types').PathData, name?: string) => {
      const pathBounds = measurePath(pathData.subPaths, pathData.strokeWidth ?? 1, 1);
      const pathWidth = pathBounds.maxX - pathBounds.minX;
      const pathHeight = pathBounds.maxY - pathBounds.minY;
      if (pathWidth === 0 && pathHeight === 0) return;

      const normalized = translatePathData(pathData, -pathBounds.minX, -pathBounds.minY);
      const safeWidth = ensurePositiveDimension(pathWidth);
      const safeHeight = ensurePositiveDimension(pathHeight);
      const definition = createDefinition(
        normalized,
        name ?? `Symbol ${get().symbols.length + 1}`,
        {
          minX: 0,
          minY: 0,
          width: safeWidth,
          height: safeHeight,
        }
      );

      set((state) => ({ symbols: [...state.symbols, definition] }));
      return definition.id;
    },
    placeSymbolInstance: (symbolId, point) => {
      const store = get();
      const symbol = store.symbols.find((item: SymbolDefinition) => item.id === symbolId);
      if (!symbol) {
        return;
      }

      const width = ensurePositiveDimension(symbol.bounds.width);
      const height = ensurePositiveDimension(symbol.bounds.height);

      store.addElement?.({
        type: 'symbolInstance',
        data: createSymbolInstanceData(symbol, store, {
          x: point.x - width / 2,
          y: point.y - height / 2,
          width,
          height,
        }),
      });

      // Disable placement mode after creating instance
      set({ placingSymbolId: null });
    },
    placeSymbolInstanceAtRect: (symbolId, rect) => {
      const store = get();
      const symbol = store.symbols.find((item: SymbolDefinition) => item.id === symbolId);
      if (!symbol) {
        return;
      }

      store.addElement?.({
        type: 'symbolInstance',
        data: createSymbolInstanceData(symbol, store, rect),
      });

      // Disable placement mode after creating instance
      set({ placingSymbolId: null });
    },
    removeSymbol: (symbolId) => {
      set((state) => ({
        symbols: state.symbols.filter((symbol: SymbolDefinition) => symbol.id !== symbolId),
      }));

      const store = get();
      const instances = store.elements.filter(
        (element): element is SymbolInstanceElement => element.type === 'symbolInstance'
      );
      instances.forEach((instance) => {
        if (instance.data.symbolId === symbolId) {
          store.deleteElement?.(instance.id);
        }
      });
    },
    renameSymbol: (symbolId, name) => {
      set((state) => ({
        symbols: state.symbols.map((symbol: SymbolDefinition) =>
          symbol.id === symbolId ? { ...symbol, name } : symbol
        ),
      }));
    },
    updateSymbol: (symbolId, updates) => {
      set((state) => ({
        symbols: state.symbols.map((symbol: SymbolDefinition) =>
          symbol.id === symbolId ? { ...symbol, ...updates } : symbol
        ),
      }));
    },
  };
};
