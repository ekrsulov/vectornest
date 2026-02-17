import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { PathData, Point } from '../../types';
import { measurePath } from '../../utils/measurementUtils';
import { translatePathData } from '../../utils/transformationUtils';
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
  setPlacingSymbolId: (id: string | null) => void;
  createSymbolFromSelection: () => void;
  placeSymbolInstance: (symbolId: string, point: Point) => void;
  removeSymbol: (symbolId: string) => void;
  renameSymbol: (symbolId: string, name: string) => void;
  updateSymbol: (symbolId: string, updates: Partial<SymbolDefinition>) => void;
}

const makeSymbolId = () => `symbol-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const createDefinition = (pathData: PathData, name: string, bounds: SymbolBounds): SymbolDefinition => ({
  id: makeSymbolId(),
  name,
  pathData,
  bounds,
});

export const createSymbolsSlice: StateCreator<CanvasStore, [], [], SymbolPluginSlice> = (set, get) => {
  // Preserve persisted state if it exists
  const currentState = get();
  const persistedSymbols = (currentState as unknown as SymbolPluginSlice).symbols;

  return {
    symbols: Array.isArray(persistedSymbols) && persistedSymbols.length > 0 ? persistedSymbols : [],
    placingSymbolId: null,
    setPlacingSymbolId: (id) => {
      set((state) => ({
        ...state,
        placingSymbolId: id,
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
      const translateX = point.x - width / 2;
      const translateY = point.y - height / 2;
      
      // For symbols with rawContent (complex symbols), don't include pathData or style overrides
      // This causes the renderer to use <use> referencing the symbol in defs
      // and preserves the original colors of each element within the symbol
      const isComplexSymbol = Boolean(symbol.rawContent);
      const pathData = isComplexSymbol ? undefined : symbol.pathData;
      
      // Only apply style settings to simple symbols (without rawContent)
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
      
      store.addElement?.({
        type: 'symbolInstance',
        data: {
          symbolId,
          width,
          height,
          ...(pathData && { pathData }),
          transform: {
            translateX,
            translateY,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
          ...styleOverrides,
        },
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
