import type { CanvasElement } from '../../../types';
import type { FilterSlice } from '../../filter/slice';
import type { GradientDef } from '../../gradients/slice';
import type { PatternDef } from '../../patterns/slice';
import type { DefTargetType } from '../types';
import type { MaskDefinition } from '../../masks/types';
import type { MarkerDefinition } from '../../markers/slice';
import type { SymbolDefinition } from '../../symbols/slice';

interface DefReference {
  type: DefTargetType;
  id: string;
  label: string;
  stopCount?: number; // For gradients
  primitiveCount?: number; // For filters
}

/**
 * Extract def references from an element's data.
 */
export function extractDefReferences(
  element: CanvasElement,
  gradients?: GradientDef[],
  patterns?: PatternDef[],
  filters?: FilterSlice['filters'],
  importedFilters?: FilterSlice['importedFilters'],
  masks?: MaskDefinition[],
  markers?: MarkerDefinition[],
  symbols?: SymbolDefinition[],
): DefReference[] {
  const refs: DefReference[] = [];
  const data = element.data as Record<string, unknown>;

  // Extract paint references (gradients and patterns)
  const extractPaintId = (paint: unknown): string | undefined => {
    if (typeof paint !== 'string') return undefined;
    const match = paint.match(/url\(#([^)]+)\)/);
    return match ? match[1] : undefined;
  };

  const fillId = extractPaintId(data.fillColor);
  const strokeId = extractPaintId(data.strokeColor);
  const paintIds = [fillId, strokeId].filter(Boolean) as string[];

  // Gradients
  for (const paintId of paintIds) {
    const gradient = gradients?.find((g) => g.id === paintId);
    if (gradient) {
      refs.push({
        type: 'gradient',
        id: gradient.id,
        label: `Gradient: ${gradient.type} (${gradient.stops.length} stops)`,
        stopCount: gradient.stops.length,
      });
    }

    // Patterns
    const pattern = patterns?.find((p) => p.id === paintId);
    if (pattern) {
      refs.push({
        type: 'pattern',
        id: pattern.id,
        label: `Pattern: ${pattern.type}`,
      });
    }
  }

  // Filters
  const filterId = data.filterId as string | undefined;
  if (filterId) {
    const filterDef = filters?.[filterId] || importedFilters?.find((f) => f.id === filterId);
    if (filterDef) {
      const primitiveCount = 'primitives' in filterDef ? (filterDef.primitives as unknown[])?.length : undefined;
      refs.push({
        type: 'filter',
        id: filterId,
        label: `Filter: ${filterDef.type}${primitiveCount ? ` (${primitiveCount} primitives)` : ''}`,
        primitiveCount,
      });
    }
  }

  // Clip paths
  const clipPathId = (data.clipPathTemplateId as string | undefined) ?? (data.clipPathId as string | undefined);
  if (clipPathId) {
    refs.push({
      type: 'clipPath',
      id: clipPathId,
      label: `ClipPath: ${clipPathId}`,
    });
  }

  // Masks
  const maskId = (data as { maskId?: string }).maskId;
  if (maskId) {
    const maskDef = masks?.find((m) => m.id === maskId);
    refs.push({
      type: 'mask',
      id: maskId,
      label: maskDef ? `Mask: ${maskDef.name ?? maskDef.id}` : `Mask: ${maskId}`,
    });
  }

  // Markers
  const markerStart = (data as { markerStart?: string }).markerStart;
  const markerMid = (data as { markerMid?: string }).markerMid;
  const markerEnd = (data as { markerEnd?: string }).markerEnd;
  [markerStart, markerMid, markerEnd].forEach((markerId) => {
    if (!markerId) return;
    const markerDef = markers?.find((m) => m.id === markerId);
    refs.push({
      type: 'marker',
      id: markerId,
      label: markerDef ? `Marker: ${markerDef.name}` : `Marker: ${markerId}`,
    });
  });

  // Symbols
  const symbolId = (data as { symbolId?: string }).symbolId;
  if (symbolId) {
    const sym = symbols?.find((s) => s.id === symbolId);
    refs.push({
      type: 'symbol',
      id: symbolId,
      label: sym ? `Symbol: ${sym.name}` : `Symbol: ${symbolId}`,
    });
  }

  return refs;
}
