import React, { useMemo, useCallback } from 'react';
import { VStack, HStack, Text, Box, Badge } from '@chakra-ui/react';
import { CustomSelect } from '../../../ui/CustomSelect';
import { extractDefReferences } from './defReferences';
import type { CanvasElement } from '../../../types';
import type { AnimationTargetPath, DefTargetType } from '../types';
import type { GradientDef } from '../../gradients/slice';
import type { PatternDef } from '../../patterns/slice';
import type { FilterSlice } from '../../filter/slice';
import type { MaskDefinition } from '../../masks/types';
import type { MarkerDefinition } from '../../markers/slice';
import type { SymbolDefinition } from '../../symbols/slice';

export interface AnimationTargetSelectorProps {
  /** Currently selected element */
  selectedElement?: CanvasElement;
  /** All canvas elements for finding def usages */
  elements: CanvasElement[];
  /** Gradients defined in the workspace */
  gradients?: GradientDef[];
  /** Patterns defined in the workspace */
  patterns?: PatternDef[];
  /** Filters defined in the workspace */
  filters?: FilterSlice['filters'];
  /** Imported filters */
  importedFilters?: FilterSlice['importedFilters'];
  /** Masks */
  masks?: MaskDefinition[];
  /** Markers */
  markers?: MarkerDefinition[];
  /** Symbols */
  symbols?: SymbolDefinition[];
  /** Current target path value */
  value: AnimationTargetPath;
  /** Callback when target path changes */
  onChange: (path: AnimationTargetPath) => void;
  /** Label width for alignment */
  labelWidth?: string;
}

const labelStyle = { fontSize: '11px', color: 'gray.600', _dark: { color: 'gray.400' } };

/**
 * Component for selecting animation target path including transitive targets (defs)
 */
export const AnimationTargetSelector: React.FC<AnimationTargetSelectorProps> = ({
  selectedElement,
  elements,
  gradients,
  patterns,
  filters,
  importedFilters,
  masks,
  markers,
  symbols,
  value,
  onChange,
  labelWidth = '70px',
}) => {
  // Find the element to use for extracting def references
  // Prefer the previewElementId (the element that uses the def), fall back to selectedElement
  const targetElementForRefs = useMemo(() => {
    if (value.previewElementId) {
      const previewEl = elements.find((el) => el.id === value.previewElementId);
      if (previewEl) return previewEl;
    }
    return selectedElement;
  }, [value.previewElementId, elements, selectedElement]);

  // Get def references for the target element
  const defReferences = useMemo(() => {
    if (!targetElementForRefs) return [];
    const refs = extractDefReferences(targetElementForRefs, gradients, patterns, filters, importedFilters, masks, markers, symbols);
    
    // If the value already has a defType and defId that's not in the refs, add it
    // This handles cases where the animation was imported and the def exists
    if (value.defType && value.defId) {
      const exists = refs.some((r) => r.type === value.defType && r.id === value.defId);
      if (!exists) {
        // Try to find the def in the store
        let label = `${value.defType}: ${value.defId}`;
        let stopCount: number | undefined;
        let primitiveCount: number | undefined;
        
        if (value.defType === 'gradient') {
          const gradient = gradients?.find((g) => g.id === value.defId);
          if (gradient) {
            label = `Gradient: ${gradient.type} (${gradient.stops.length} stops)`;
            stopCount = gradient.stops.length;
          }
        } else if (value.defType === 'pattern') {
          const pattern = patterns?.find((p) => p.id === value.defId);
          if (pattern) {
            label = `Pattern: ${pattern.type}`;
          }
        } else if (value.defType === 'filter') {
          const filterDef = filters?.[value.defId] || importedFilters?.find((f) => f.id === value.defId);
          if (filterDef) {
            primitiveCount = 'primitives' in filterDef ? (filterDef.primitives as unknown[])?.length : undefined;
            label = `Filter: ${filterDef.type}${primitiveCount ? ` (${primitiveCount} primitives)` : ''}`;
          }
        } else if (value.defType === 'clipPath') {
          label = `ClipPath: ${value.defId}`;
        }
        
        refs.push({
          type: value.defType,
          id: value.defId,
          label,
          stopCount,
          primitiveCount,
        });
      }
    }
    
    return refs;
  }, [targetElementForRefs, gradients, patterns, filters, importedFilters, masks, markers, symbols, value.defType, value.defId]);

  // Find the selected gradient for stop options
  const selectedGradient = useMemo(() => {
    if (value.defType !== 'gradient' || !value.defId) return undefined;
    return gradients?.find((g) => g.id === value.defId);
  }, [gradients, value.defId, value.defType]);

  // Handle def selection change
  const handleDefChange = useCallback(
    (defIdWithType: string) => {
      // Preserve existing previewElementId or use selectedElement
      const previewId = value.previewElementId ?? selectedElement?.id;
      
      if (!defIdWithType || defIdWithType === 'element') {
        // Clear def selection - animate element directly
        onChange({
          previewElementId: previewId,
          defType: undefined,
          defId: undefined,
          stopIndex: undefined,
          filterPrimitiveIndex: undefined,
        });
        return;
      }

      // Parse type:id format
      const [type, id] = defIdWithType.split(':') as [DefTargetType, string];
      onChange({
        previewElementId: previewId,
        defType: type,
        defId: id,
        stopIndex: undefined,
        filterPrimitiveIndex: undefined,
      });
    },
    [onChange, selectedElement?.id, value.previewElementId]
  );

  // Handle stop index change for gradients
  const handleStopChange = useCallback(
    (stopIndexStr: string) => {
      const stopIndex = stopIndexStr === '' ? undefined : parseInt(stopIndexStr, 10);
      onChange({
        ...value,
        stopIndex: isNaN(stopIndex as number) ? undefined : stopIndex,
      });
    },
    [onChange, value]
  );

  // Handle filter primitive index change
  const handlePrimitiveChange = useCallback(
    (primitiveIndexStr: string) => {
      const primitiveIndex = primitiveIndexStr === '' ? undefined : parseInt(primitiveIndexStr, 10);
      onChange({
        ...value,
        filterPrimitiveIndex: isNaN(primitiveIndex as number) ? undefined : primitiveIndex,
      });
    },
    [onChange, value]
  );

  // Build the current selection value
  const currentDefValue = useMemo(() => {
    if (!value.defType || !value.defId) return 'element';
    return `${value.defType}:${value.defId}`;
  }, [value.defType, value.defId]);

  // Build options for def selector
  const defOptions = useMemo(() => {
    const options = [{ value: 'element', label: 'Element (direct)' }];
    for (const ref of defReferences) {
      options.push({
        value: `${ref.type}:${ref.id}`,
        label: ref.label,
      });
    }
    return options;
  }, [defReferences]);

  // Build stop options for gradients
  const stopOptions = useMemo(() => {
    if (!selectedGradient) return [];
    return [
      { value: '', label: 'Gradient transform' },
      ...selectedGradient.stops.map((stop, idx) => ({
        value: String(idx),
        label: `Stop ${idx + 1}: ${stop.color}`,
      })),
    ];
  }, [selectedGradient]);

  // Get selected filter for primitive options
  const selectedFilter = useMemo(() => {
    if (value.defType !== 'filter' || !value.defId) return undefined;
    return filters?.[value.defId] || importedFilters?.find((f) => f.id === value.defId);
  }, [filters, importedFilters, value.defId, value.defType]);

  // Build primitive options for filters
  const primitiveOptions = useMemo(() => {
    if (!selectedFilter || !('primitives' in selectedFilter)) return [];
    const primitives = selectedFilter.primitives as Array<{ type: string }> | undefined;
    if (!primitives) return [];
    return [
      { value: '', label: 'Filter container' },
      ...primitives.map((p, idx) => ({
        value: String(idx),
        label: `Primitive ${idx + 1}: ${p.type}`,
      })),
    ];
  }, [selectedFilter]);

  // Show the badge indicating animation type
  const targetBadge = useMemo(() => {
    if (!value.defType) return null;

    let label: string = value.defType;
    if (value.defType === 'gradient' && value.stopIndex !== undefined) {
      label = `stop ${value.stopIndex + 1}`;
    } else if (value.defType === 'filter' && value.filterPrimitiveIndex !== undefined) {
      label = `primitive ${value.filterPrimitiveIndex + 1}`;
    }

    return (
      <Badge colorScheme="purple" fontSize="10px">
        {label}
      </Badge>
    );
  }, [value.defType, value.stopIndex, value.filterPrimitiveIndex]);

  if (!selectedElement && !targetElementForRefs) {
    return (
      <Text {...labelStyle}>Select an element to configure animation target</Text>
    );
  }

  return (
    <VStack spacing={2} align="stretch">
      {/* Target element info (show which element will be used for preview) */}
      {targetElementForRefs && targetElementForRefs.id !== selectedElement?.id && (
        <HStack align="center" spacing={2}>
          <Text {...labelStyle} minW={labelWidth} color="blue.500">
            Target
          </Text>
          <Text fontSize="11px" color="blue.500" isTruncated>
            {targetElementForRefs.id}
          </Text>
        </HStack>
      )}
      
      {/* Def target selector (only show if element has defs or already has a def target) */}
      {defReferences.length > 0 && (
        <HStack align="center" spacing={2}>
          <Text {...labelStyle} minW={labelWidth}>
            Target
          </Text>
          <Box flex={1}>
            <CustomSelect
              value={currentDefValue}
              onChange={handleDefChange}
              options={defOptions}
              size="sm"
            />
          </Box>
          {targetBadge}
        </HStack>
      )}

      {/* Stop selector for gradients */}
      {value.defType === 'gradient' && selectedGradient && (
        <HStack align="center" spacing={2}>
          <Text {...labelStyle} minW={labelWidth}>
            Stop
          </Text>
          <Box flex={1}>
            <CustomSelect
              value={value.stopIndex !== undefined ? String(value.stopIndex) : ''}
              onChange={handleStopChange}
              options={stopOptions}
              size="sm"
            />
          </Box>
        </HStack>
      )}

      {/* Primitive selector for filters */}
      {value.defType === 'filter' && primitiveOptions.length > 0 && (
        <HStack align="center" spacing={2}>
          <Text {...labelStyle} minW={labelWidth}>
            Primitive
          </Text>
          <Box flex={1}>
            <CustomSelect
              value={value.filterPrimitiveIndex !== undefined ? String(value.filterPrimitiveIndex) : ''}
              onChange={handlePrimitiveChange}
              options={primitiveOptions}
              size="sm"
            />
          </Box>
        </HStack>
      )}

      {/* Preview element info */}
      {value.defType && value.previewElementId && (
        <HStack align="center" spacing={2}>
          <Text {...labelStyle} minW={labelWidth} color="gray.500">
            Preview via
          </Text>
          <Text fontSize="11px" color="gray.500" isTruncated>
            {value.previewElementId}
          </Text>
        </HStack>
      )}
    </VStack>
  );
};
