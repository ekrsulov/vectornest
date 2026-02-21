/**
 * Paints Panel
 * Displays a list of paints (colors, gradients, patterns) used in the canvas
 * Ordered by usage count (fill + stroke instances)
 * 
 * Features:
 * - Show paint usage statistics
 * - Apply color to selected elements (fill or stroke)
 * - Replace paint globally when no selection
 * - Merge paints functionality
 * - Options: max paints to show, split by opacity
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Badge,
} from '@chakra-ui/react';
import { Merge, MoreVertical } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { ToggleButton } from '../../ui/ToggleButton';
import { MultiPaintPicker } from '../../ui/MultiPaintPicker';
import type { PaintsSlice } from './slice';
import type { CanvasElement } from '../../types';
import type { CanvasStore } from '../../store/canvasStore';
import { useThemeColors } from '../../hooks';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import type { PanelComponentProps } from '../../types/panel';
import { useSidebarPanelState } from '../../contexts/sidebarPanelState';

interface PaintInfo {
  /** The paint value (color, url(#gradient), url(#pattern)) */
  value: string;
  /** Normalized value (lowercase, trimmed) used for comparisons */
  normalizedValue: string;
  /** Unique key, includes opacity when splitByOpacity is enabled */
  paintKey: string;
  /** Opacity value (if splitByOpacity is true) */
  opacity?: number;
  /** Number of times used in fill */
  fillCount: number;
  /** Number of times used in stroke */
  strokeCount: number;
  /** Total usage count */
  totalCount: number;
  /** Element IDs that use this paint in fill */
  fillElementIds: string[];
  /** Element IDs that use this paint in stroke */
  strokeElementIds: string[];
}

/**
 * Normalize paint value for comparison
 */
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function normalizePaint(value: string | undefined): string {
  if (!value) return 'none';
  return value.trim().toLowerCase();
}

function formatDisplayPaintValue(value: string): string {
  const trimmed = value.trim();
  if (HEX_COLOR_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

/**
 * Generate a unique key for a paint (with optional opacity)
 */
function getPaintKey(value: string, opacity: number | undefined, splitByOpacity: boolean): string {
  const normalizedValue = normalizePaint(value);
  if (splitByOpacity && opacity !== undefined && opacity !== 1) {
    return `${normalizedValue}@${opacity.toFixed(2)}`;
  }
  return normalizedValue;
}

/**
 * Extract paints from canvas elements
 */
function extractPaints(
  elements: CanvasElement[],
  splitByOpacity: boolean
): PaintInfo[] {
  const paintMap = new Map<string, PaintInfo>();

  const addPaint = (
    color: string,
    opacity: number | undefined,
    elementId: string,
    type: 'fill' | 'stroke'
  ) => {
    const trimmedColor = color.trim();
    if (!trimmedColor) return;

    const displayColor = formatDisplayPaintValue(trimmedColor);
    const normalizedValue = normalizePaint(trimmedColor);
    const paintKey = getPaintKey(trimmedColor, opacity, splitByOpacity);
    const existing = paintMap.get(paintKey);

    if (existing) {
      existing[type === 'fill' ? 'fillCount' : 'strokeCount']++;
      existing.totalCount++;
      if (type === 'fill') {
        existing.fillElementIds.push(elementId);
      } else {
        existing.strokeElementIds.push(elementId);
      }
    } else {
      paintMap.set(paintKey, {
        value: displayColor,
        normalizedValue,
        paintKey,
        opacity,
        fillCount: type === 'fill' ? 1 : 0,
        strokeCount: type === 'stroke' ? 1 : 0,
        totalCount: 1,
        fillElementIds: type === 'fill' ? [elementId] : [],
        strokeElementIds: type === 'stroke' ? [elementId] : [],
      });
    }
  };

  for (const element of elements) {
    if (element.type === 'group') continue;

    const data = element.data as Record<string, unknown>;

    const fillColor = typeof data.fillColor === 'string' ? data.fillColor : undefined;
    if (fillColor && fillColor !== 'none') {
      const fillOpacity = splitByOpacity
        ? (typeof data.fillOpacity === 'number' ? data.fillOpacity : 1)
        : undefined;
      addPaint(fillColor, fillOpacity, element.id, 'fill');
    }

    const strokeColor = typeof data.strokeColor === 'string' ? data.strokeColor : undefined;
    if (strokeColor && strokeColor !== 'none') {
      const strokeOpacity = splitByOpacity
        ? (typeof data.strokeOpacity === 'number' ? data.strokeOpacity : 1)
        : undefined;
      addPaint(strokeColor, strokeOpacity, element.id, 'stroke');
    }
  }

  // Sort by total usage count (descending)
  return Array.from(paintMap.values()).sort((a, b) => b.totalCount - a.totalCount);
}

interface PaintSwatchProps {
  paint: PaintInfo;
  isSelected: boolean;
  isMergeSource: boolean;
  isMergeMode: boolean;
  onClick: () => void;
  onApplyToFill: (newColor: string) => void;
  onApplyToStroke: (newColor: string) => void;
  hasSelection: boolean;
  applyTarget: 'fill' | 'stroke';
}

const PaintSwatch: React.FC<PaintSwatchProps> = ({
  paint,
  isSelected,
  isMergeSource,
  isMergeMode,
  onClick,
  onApplyToFill,
  onApplyToStroke,
  hasSelection,
  applyTarget,
}) => {
  const { panelButton } = useThemeColors();
  const isPatternOrGradient = paint.value.startsWith('url(');
  const swatchSize = 24;
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const swatchStyle = isPatternOrGradient
    ? {
      backgroundImage: paint.value,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
    : {
      background: paint.value,
    };

  const handleColorChange = useCallback((newColor: string) => {
    if (hasSelection) {
      // Apply to selected elements based on target
      if (applyTarget === 'fill') {
        onApplyToFill(newColor);
      } else {
        onApplyToStroke(newColor);
      }
    } else {
      // Replace globally - apply to both fill and stroke elements
      onApplyToFill(newColor);
      onApplyToStroke(newColor);
    }
  }, [hasSelection, applyTarget, onApplyToFill, onApplyToStroke]);

  const handleColorLabelClick = useCallback(() => {
    if (!hasSelection || isMergeMode) return;
    handleColorChange(paint.value);
  }, [hasSelection, isMergeMode, handleColorChange, paint.value]);

  return (
    <Box
      position="relative"
      borderRadius="md"
      p={1}
      bg={isSelected || isMergeSource ? panelButton.hoverBg : 'transparent'}
      border="1px solid"
      borderColor={isMergeSource ? 'blue.400' : isSelected ? panelButton.borderColor : 'transparent'}
      cursor={isMergeMode ? 'pointer' : 'default'}
      onClick={isMergeMode ? onClick : undefined}
      _hover={{ bg: panelButton.hoverBg }}
      transition="all 0.15s"
    >
      <HStack spacing={2} align="center">
        {/* Color swatch with picker */}
        <Box position="relative">
          {!isMergeMode && (
            <MultiPaintPicker
              label="Paint"
              value={paint.value}
              onChange={handleColorChange}
              defaultColor={paint.value}
              mode={applyTarget}
              floatingContainerRef={pickerContainerRef}
              fullWidth={false}
            />
          )}
          {isMergeMode && (
            <Box
              w={`${swatchSize}px`}
              h={`${swatchSize}px`}
              borderRadius="full"
              border="1px solid"
              borderColor={panelButton.borderColor}
              {...swatchStyle}
              opacity={paint.opacity ?? 1}
            />
          )}
        </Box>

        {/* Paint info */}
        <VStack spacing={0} align="start" flex={1} minW={0}>
          <Text
            fontSize="xs"
            fontFamily="mono"
            color="gray.600"
            _dark={{ color: 'gray.400' }}
            isTruncated
            maxW="100%"
            cursor={hasSelection && !isMergeMode ? 'pointer' : 'default'}
            onClick={hasSelection && !isMergeMode ? handleColorLabelClick : undefined}
          >
            {paint.value.length > 20 ? `${paint.value.substring(0, 20)}...` : paint.value}
          </Text>
          {paint.opacity !== undefined && paint.opacity !== 1 && (
            <Text fontSize="xs" color="gray.500">
              {Math.round(paint.opacity * 100)}% opacity
            </Text>
          )}
        </VStack>

        {/* Usage badges */}
        <HStack spacing={1}>
          {paint.fillCount > 0 && (
            <ConditionalTooltip label={`${paint.fillCount} fill${paint.fillCount > 1 ? 's' : ''}`}>
              <Badge
                colorScheme="purple"
                fontSize="2xs"
                px={1}
                borderRadius="full"
              >
                F:{paint.fillCount}
              </Badge>
            </ConditionalTooltip>
          )}
          {paint.strokeCount > 0 && (
            <ConditionalTooltip label={`${paint.strokeCount} stroke${paint.strokeCount > 1 ? 's' : ''}`}>
              <Badge
                colorScheme="blue"
                fontSize="2xs"
                px={1}
                borderRadius="full"
              >
                S:{paint.strokeCount}
              </Badge>
            </ConditionalTooltip>
          )}
        </HStack>
      </HStack>

      {/* Picker portal slot */}
      <Box ref={pickerContainerRef} w="100%" />
    </Box>
  );
};

/**
 * Extract only paint-relevant data from elements (not position data)
 * This prevents re-renders when elements are just moved
 */
interface ElementPaintData {
  id: string;
  type: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
}

const extractElementPaintData = (elements: CanvasElement[]): ElementPaintData[] => {
  return elements
    .filter(el => el.type !== 'group')
    .map(el => {
      const data = el.data as Record<string, unknown>;
      return {
        id: el.id,
        type: el.type,
        fillColor: typeof data?.fillColor === 'string' ? data.fillColor : undefined,
        fillOpacity: typeof data?.fillOpacity === 'number' ? data.fillOpacity : undefined,
        strokeColor: typeof data?.strokeColor === 'string' ? data.strokeColor : undefined,
        strokeOpacity: typeof data?.strokeOpacity === 'number' ? data.strokeOpacity : undefined,
      };
    });
};

const arePaintArraysEqual = (a: ElementPaintData[], b: ElementPaintData[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p1 = a[i];
    const p2 = b[i];
    if (
      p1.id !== p2.id ||
      p1.type !== p2.type ||
      p1.fillColor !== p2.fillColor ||
      p1.fillOpacity !== p2.fillOpacity ||
      p1.strokeColor !== p2.strokeColor ||
      p1.strokeOpacity !== p2.strokeOpacity
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Factory to create a memoized selector that extracts only paint-related data.
 * Keeps a local cache of the extracted data to return the same reference
 * if the paint data hasn't changed, even if the elements array reference changed.
 */
const createPaintsPanelSelector = () => {
  let lastElements: CanvasElement[] | undefined;
  let lastPaintData: ElementPaintData[] = [];

  return (state: CanvasStore) => {
    const elements = state.elements;
    let elementPaintData = lastPaintData;

    // Only re-check if elements reference changed
    if (elements !== lastElements) {
      const newData = extractElementPaintData(elements);
      // Only update our cached data if the content is actually different
      if (!arePaintArraysEqual(lastPaintData, newData)) {
        elementPaintData = newData;
      }
      lastElements = elements;
      lastPaintData = elementPaintData;
    }

    const paintsState = (state as unknown as PaintsSlice).paints;

    return {
      elementPaintData,
      elementsCount: elements.length,
      selectedIds: state.selectedIds,
      paintsState,
    };
  };
};

export const PaintsPanel: React.FC<PanelComponentProps> = ({
  panelKey,
}) => {
  // Use shallow selector with deep memoization for array data to prevent
  // re-renders when only positions change and to ensure selector stability
  const selector = useMemo(() => createPaintsPanelSelector(), []);

  const {
    elementPaintData,
    elementsCount,
    selectedIds,
    paintsState,
  } = useShallowCanvasSelector(selector);

  const updateElement = useCanvasStore((state) => state.updateElement);
  const updatePaintsState = useCanvasStore((state) => (state as unknown as PaintsSlice).updatePaintsState);
  const { openPanelKey } = useSidebarPanelState();

  // Local state
  const [showOptions, setShowOptions] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSourcePaint, setMergeSourcePaint] = useState<PaintInfo | null>(null);

  const maxPaintsToShow = paintsState?.maxPaintsToShow ?? 7;
  const splitByOpacity = paintsState?.splitByOpacity ?? false;
  const applyTarget = paintsState?.applyTarget ?? 'fill';

  // Extract and memoize paints from paint data (not full elements)
  const allPaints = useMemo(() => {
    // Convert paint data back to a format extractPaints can use
    const pseudoElements = elementPaintData.map(pd => ({
      id: pd.id,
      type: pd.type,
      data: {
        fillColor: pd.fillColor,
        fillOpacity: pd.fillOpacity,
        strokeColor: pd.strokeColor,
        strokeOpacity: pd.strokeOpacity,
      },
    })) as CanvasElement[];
    return extractPaints(pseudoElements, splitByOpacity);
  }, [elementPaintData, splitByOpacity]);

  const visiblePaints = useMemo(() =>
    allPaints.slice(0, maxPaintsToShow),
    [allPaints, maxPaintsToShow]
  );

  const hasSelection = selectedIds.length > 0;
  const hasElements = elementsCount > 0;
  const isPanelOpen = !panelKey || openPanelKey === panelKey;

  // Handlers
  const applyElementUpdates = useCallback((id: string, updates: Record<string, unknown>) => {
    // Get current element from store directly to ensure we have latest data
    const element = useCanvasStore.getState().elements.find((el) => el.id === id);
    if (!element || !element.data || typeof element.data !== 'object') return;

    updateElement(id, {
      data: {
        ...(element.data as Record<string, unknown>),
        ...updates,
      },
    });
  }, [updateElement]);

  const handleApplyToFill = useCallback((paint: PaintInfo, newColor: string) => {
    const targetIds = hasSelection
      ? selectedIds
      : paint.fillElementIds;

    for (const id of targetIds) {
      applyElementUpdates(id, { fillColor: newColor });
    }
  }, [hasSelection, selectedIds, applyElementUpdates]);

  const handleApplyToStroke = useCallback((paint: PaintInfo, newColor: string) => {
    const targetIds = hasSelection
      ? selectedIds
      : paint.strokeElementIds;

    for (const id of targetIds) {
      applyElementUpdates(id, { strokeColor: newColor });
    }
  }, [hasSelection, selectedIds, applyElementUpdates]);

  const handleMergeClick = useCallback((paint: PaintInfo) => {
    if (!mergeSourcePaint) {
      setMergeSourcePaint(paint);
    } else if (mergeSourcePaint.paintKey !== paint.paintKey) {
      // Merge: replace all instances of clicked paint with source paint
      const targetPaint = paint;
      const sourcePaint = mergeSourcePaint;
      const elements = useCanvasStore.getState().elements;

      // Replace in fills
      for (const id of targetPaint.fillElementIds) {
        const element = elements.find((el: CanvasElement) => el.id === id);
        if (!element || !element.data || typeof element.data !== 'object') continue;
        const elementData = element.data as Record<string, unknown>;
        const fillOpacity = sourcePaint.opacity ?? (elementData.fillOpacity as number | undefined);
        const fillUpdates: Record<string, unknown> = { fillColor: sourcePaint.value };
        if (fillOpacity !== undefined) {
          fillUpdates.fillOpacity = fillOpacity;
        }
        applyElementUpdates(id, fillUpdates);
      }

      // Replace in strokes
      for (const id of targetPaint.strokeElementIds) {
        const element = elements.find((el: CanvasElement) => el.id === id);
        if (!element || !element.data || typeof element.data !== 'object') continue;
        const elementData = element.data as Record<string, unknown>;
        const strokeOpacity = sourcePaint.opacity ?? (elementData.strokeOpacity as number | undefined);
        const strokeUpdates: Record<string, unknown> = { strokeColor: sourcePaint.value };
        if (strokeOpacity !== undefined) {
          strokeUpdates.strokeOpacity = strokeOpacity;
        }
        applyElementUpdates(id, strokeUpdates);
      }

      // Exit merge mode
      setMergeMode(false);
      setMergeSourcePaint(null);
    }
  }, [mergeSourcePaint, applyElementUpdates]);

  const handleToggleMergeMode = useCallback(() => {
    if (mergeMode) {
      setMergeMode(false);
      setMergeSourcePaint(null);
    } else {
      setMergeMode(true);
    }
  }, [mergeMode]);

  const handleMaxPaintsChange = useCallback((value: number) => {
    updatePaintsState?.({ maxPaintsToShow: value });
  }, [updatePaintsState]);

  const handleSplitByOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updatePaintsState?.({ splitByOpacity: e.target.checked });
  }, [updatePaintsState]);

  const handleApplyTargetChange = useCallback((target: 'fill' | 'stroke') => {
    updatePaintsState?.({ applyTarget: target });
  }, [updatePaintsState]);

  const stopHeaderTogglePropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const headerActions = !isPanelOpen ? null : (
    <HStack
      spacing={1}
      onMouseDown={stopHeaderTogglePropagation}
      onPointerDown={stopHeaderTogglePropagation}
      onClick={stopHeaderTogglePropagation}
    >
      <PanelActionButton
        icon={Merge}
        iconSize={14}
        label="Merge"
        onClick={handleToggleMergeMode}
        isDisabled={allPaints.length < 2}
      />
      <PanelActionButton
        icon={MoreVertical}
        iconSize={14}
        label="Options"
        onClick={() => setShowOptions((v) => !v)}
      />
    </HStack>
  );

  if (!hasElements) {
    return null;
  }

  return (
    <Panel
      title="Paints"
      panelKey={panelKey}
      isCollapsible
      isMaximizable
      defaultOpen={false}
      headerActions={headerActions}
    >
      <VStack spacing={1} align="stretch">
        {hasSelection && (
          <HStack spacing={1} align="center">
            <HStack spacing={1}>
              <ToggleButton
                variant="text"
                isActive={applyTarget === 'fill'}
                onClick={() => handleApplyTargetChange('fill')}
                size="sm"
                aria-label="Apply to fill"
                sx={{ px: 2, minW: 'auto' }}
              >
                Fill
              </ToggleButton>
              <ToggleButton
                variant="text"
                isActive={applyTarget === 'stroke'}
                onClick={() => handleApplyTargetChange('stroke')}
                size="sm"
                aria-label="Apply to stroke"
                sx={{ px: 2, minW: 'auto' }}
              >
                Stroke
              </ToggleButton>
            </HStack>
          </HStack>
        )}
        {/* Merge mode instructions */}
        {mergeMode && (
          <Box
            bg="blue.50"
            _dark={{ bg: 'blue.900' }}
            p={2}
            borderRadius="md"
            mb={1}
          >
            <Text fontSize="xs" color="blue.700" _dark={{ color: 'blue.200' }}>
              {!mergeSourcePaint
                ? "Click a paint to select as source"
                : "Click another paint to merge into source"
              }
            </Text>
          </Box>
        )}

        {/* Options section */}
        {showOptions && (
          <VStack spacing={2} align="stretch" mb={2}>
            <SliderControl
              label="Show"
              value={maxPaintsToShow}
              min={3}
              max={20}
              step={1}
              onChange={handleMaxPaintsChange}
              formatter={(v) => `${v}`}
              valueWidth="35px"
              marginBottom="0"
            />
            <PanelToggle
              isChecked={splitByOpacity}
              onChange={handleSplitByOpacityChange}
            >
              Split by opacity
            </PanelToggle>
          </VStack>
        )}

        {/* Paint list */}
        {visiblePaints.length === 0 ? (
          <Text fontSize="xs" color="gray.500" textAlign="center" py={2}>
            No paints found
          </Text>
        ) : (
          <VStack spacing={1} align="stretch">
            {visiblePaints.map((paint, index) => (
              <PaintSwatch
                key={`${paint.paintKey}-${index}`}
                paint={paint}
                isSelected={false}
                isMergeSource={mergeSourcePaint?.paintKey === paint.paintKey}
                isMergeMode={mergeMode}
                onClick={() => handleMergeClick(paint)}
                onApplyToFill={(newColor) => handleApplyToFill(paint, newColor)}
                onApplyToStroke={(newColor) => handleApplyToStroke(paint, newColor)}
                hasSelection={hasSelection}
                applyTarget={applyTarget}
              />
            ))}
          </VStack>
        )}

        {/* More paints indicator */}
        {allPaints.length > maxPaintsToShow && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            +{allPaints.length - maxPaintsToShow} more paints
          </Text>
        )}
      </VStack>
    </Panel>
  );
};
