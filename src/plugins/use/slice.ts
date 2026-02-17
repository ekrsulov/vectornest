import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import type { UseElement, UseElementData, UseReferenceType } from './types';
import type { SymbolPluginSlice, SymbolDefinition } from '../symbols/slice';

export interface UsePluginSlice {
  /**
   * Create a use element that references another element
   */
  createUseElement: (
    href: string,
    referenceType: UseReferenceType,
    position: Point,
    options?: Partial<UseElementData>
  ) => string | null;
  
  /**
   * Create a use element from an existing element (clone as reference)
   */
  createUseFromElement: (elementId: string, position: Point) => string | null;
  
  /**
   * Create a use element from a symbol
   */
  createUseFromSymbol: (symbolId: string, position: Point) => string | null;
  
  /**
   * Update the href of a use element
   */
  updateUseHref: (useElementId: string, newHref: string) => void;
  
  /**
   * Detach a use element (convert to independent copy)
   */
  detachUseElement: (useElementId: string) => string | null;
}

export const createUseSlice: StateCreator<CanvasStore, [], [], UsePluginSlice> = (_set, get) => {
  return {
    createUseElement: (href, referenceType, position, options = {}) => {
      const store = get();
      
      const useData: UseElementData = {
        href,
        referenceType,
        x: position.x,
        y: position.y,
        ...options,
      };
      
      return store.addElement?.({
        type: 'use',
        data: useData,
      }) ?? null;
    },
    
    createUseFromElement: (elementId, position) => {
      const store = get();
      const element = store.elements.find(e => e.id === elementId);
      
      if (!element) {
        return null;
      }
      
      // Get bounds of the referenced element to center the use element
      const useData: UseElementData = {
        href: elementId,
        referenceType: 'element',
        x: position.x,
        y: position.y,
      };
      
      return store.addElement?.({
        type: 'use',
        data: useData,
      }) ?? null;
    },
    
    createUseFromSymbol: (symbolId, position) => {
      const store = get();
      const symbolState = store as unknown as SymbolPluginSlice;
      const symbol = symbolState.symbols?.find((s: SymbolDefinition) => s.id === symbolId);
      
      if (!symbol) {
        return null;
      }
      
      const width = symbol.bounds.width;
      const height = symbol.bounds.height;
      
      const useData: UseElementData = {
        href: symbolId,
        referenceType: 'symbol',
        x: position.x - width / 2,
        y: position.y - height / 2,
        width,
        height,
        cachedPathData: symbol.pathData,
        cachedBounds: symbol.bounds,
      };
      
      return store.addElement?.({
        type: 'use',
        data: useData,
      }) ?? null;
    },
    
    updateUseHref: (useElementId, newHref) => {
      const store = get();
      const element = store.elements.find(e => e.id === useElementId && e.type === 'use');
      
      if (!element) {
        return;
      }
      
      const data = element.data as UseElementData;
      store.updateElement?.(useElementId, {
        data: {
          ...data,
          href: newHref,
        },
      });
    },
    
    detachUseElement: (useElementId) => {
      const store = get();
      const useElement = store.elements.find(e => e.id === useElementId && e.type === 'use') as UseElement | undefined;
      
      if (!useElement) {
        return null;
      }
      
      const data = useElement.data;
      
      // If referencing an element, clone it
      if (data.referenceType === 'element') {
        // Find by id or sourceId
        const referencedElement = store.elements.find(e => {
          if (e.id === data.href) return true;
          const elementData = e.data as Record<string, unknown>;
          return elementData.sourceId === data.href;
        });
        if (!referencedElement) {
          return null;
        }
        
        // Clone the referenced element with use position applied
        const clonedData = JSON.parse(JSON.stringify(referencedElement.data));
        
        // Apply x/y offset if present
        if (data.x !== 0 || data.y !== 0) {
          // This will be handled by the specific element type
          // For paths, we need to translate
        }
        
        const newId = store.addElement?.({
          type: referencedElement.type,
          data: clonedData,
        });
        
        // Remove the use element
        store.deleteElements?.([useElementId]);
        
        return newId;
      }
      
      // If referencing a symbol, convert to path
      if (data.referenceType === 'symbol' && data.cachedPathData) {
        const pathData = { ...data.cachedPathData };
        
        // Apply style overrides
        if (data.styleOverrides) {
          if (data.styleOverrides.strokeColor !== undefined) {
            pathData.strokeColor = data.styleOverrides.strokeColor;
          }
          if (data.styleOverrides.fillColor !== undefined) {
            pathData.fillColor = data.styleOverrides.fillColor;
          }
          // ... other style overrides
        }
        
        const newId = store.addElement?.({
          type: 'path',
          data: pathData,
        });
        
        // Remove the use element
        store.deleteElements?.([useElementId]);
        
        return newId;
      }
      
      return null;
    },
  };
};
