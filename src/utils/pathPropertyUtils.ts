import { useCanvasStore } from '../store/canvasStore';

// Hook that reacts to selected elements and returns a property value from the first stylable element (non-group).
// Keeps the optimized selector pattern so controls update when the property value changes.
export function useSelectedPathProperty<T extends string, V>(
  property: T,
  fallbackValue: V,
  includeGroups: boolean = false
): V {
  const propertyValue = useCanvasStore((state) => {
    const selectedIds = state.selectedIds;
    if (selectedIds.length === 0) {
      return fallbackValue;
    }

    const selectedIdSet = new Set(selectedIds);
    const stylable = state.elements.find(
      (el) => selectedIdSet.has(el.id) && (includeGroups || el.type !== 'group')
    );

    if (stylable) {
      const data = stylable.data as Record<string, unknown>;
      if (property in data && data[property] !== undefined && data[property] !== null) {
        return data[property] as V;
      }
    }

    return fallbackValue;
  });

  return propertyValue;
}
