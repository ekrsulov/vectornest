import { useCanvasStore } from '../store/canvasStore';

// Style properties that should be read from textPath when nativeText plugin is active
const TEXTPATH_STYLE_KEYS = new Set([
  'fillColor', 'fillOpacity', 'strokeColor', 'strokeWidth', 'strokeOpacity', 'opacity',
]);

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
      // In nativeText mode, style properties are read from textPath sub-data so the
      // Editor panel reflects and edits the text style (not the carrier path's shape style).
      if (
        state.activePlugin === 'nativeText' &&
        stylable.type === 'path' &&
        TEXTPATH_STYLE_KEYS.has(property)
      ) {
        const textPath = (stylable.data as Record<string, unknown>).textPath as Record<string, unknown> | undefined;
        if (textPath && property in textPath && textPath[property] !== undefined && textPath[property] !== null) {
          return textPath[property] as V;
        }
      }

      const data = stylable.data as Record<string, unknown>;
      if (property in data && data[property] !== undefined && data[property] !== null) {
        return data[property] as V;
      }
    }

    return fallbackValue;
  });

  return propertyValue;
}
