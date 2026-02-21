import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Flex,
  Input,
  Text,
  Wrap,
  WrapItem,
  useColorModeValue,
} from '@chakra-ui/react';
import type { CanvasStore } from '../../store/canvasStore';
import { canvasStoreApi } from '../../store/canvasStore';
import type { CanvasElement, GroupData } from '../../types';
import type { PatternDef, PatternsSlice } from './slice';
import {
  buildBuiltInPatternBody,
  buildPatternPreviewSvg,
  normalizeRawPatternContent,
  type BuiltInPatternType,
} from './patternPreviewUtils';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { NumberInput } from '../../ui/NumberInput';
import { SliderControl } from '../../ui/SliderControl';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { PatternItemCard } from './PatternItemCard';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { CompactFieldRow } from '../../ui/CompactFieldRow';
import { SvgPreview } from '../../ui/SvgPreview';
import { buildElementMap } from '../../utils/elementMapUtils';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';
import { serializePathsForExport } from '../../utils/exportUtils';
import { generateShortId } from '../../utils/idGenerator';

// ... (previous imports)

// ... (inside PatternsPanel, remove renderPatternPreview and use Card)

// ...


const PATTERN_TYPES: Array<{ value: PatternDef['type']; label: string }> = [
  { value: 'stripes', label: 'Stripes' },
  { value: 'dots', label: 'Dots' },
  { value: 'grid', label: 'Grid' },
  { value: 'crosshatch', label: 'Cross' },
  { value: 'checker', label: 'Check' },
  { value: 'diamonds', label: 'Diam' },
];

const PATTERN_UNITS_OPTIONS: Array<{ value: NonNullable<PatternDef['patternUnits']>; label: string }> = [
  { value: 'userSpaceOnUse', label: 'userSpaceOnUse' },
  { value: 'objectBoundingBox', label: 'objectBoundingBox' },
];

const DEFAULT_OBJECT_BBOX_SCALE = 100;
const OBJECT_BBOX_SCALE_SLIDER_MIN = -50;
const OBJECT_BBOX_SCALE_SLIDER_MAX = 200;
const MIN_EFFECTIVE_OBJECT_BBOX_SCALE = 1;

const getSelectedElementsWithChildren = (
  elements: CanvasElement[],
  selectedIds: string[]
): CanvasElement[] => {
  const elementMap = buildElementMap(elements);
  const result: CanvasElement[] = [];
  const addedIds = new Set<string>();

  const addElementWithChildren = (id: string) => {
    if (addedIds.has(id)) return;
    const el = elementMap.get(id);
    if (!el) return;

    addedIds.add(id);
    result.push(el);

    if (el.type === 'group') {
      const childIds = ((el.data as GroupData).childIds ?? []) as string[];
      childIds.forEach((childId) => addElementWithChildren(childId));
    }
  };

  selectedIds.forEach((id) => addElementWithChildren(id));
  return result;
};

const buildRawPatternContentFromExport = (
  svgContent: string,
  offsetX: number,
  offsetY: number
): string => {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return '';
  }

  try {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    if (doc.querySelector('parsererror')) {
      return '';
    }

    const svg = doc.querySelector('svg');
    if (!svg) {
      return '';
    }

    const defsMarkup = Array.from(svg.children)
      .filter((child) => child.tagName.toLowerCase() === 'defs')
      .map((defsNode) => serializer.serializeToString(defsNode))
      .join('\n')
      .trim();

    const contentMarkup = Array.from(svg.childNodes)
      .filter((child) => child.nodeType === 1 && (child as Element).tagName.toLowerCase() !== 'defs')
      .map((node) => serializer.serializeToString(node as Element))
      .join('\n')
      .trim();

    const contentGroup = contentMarkup
      ? `<g transform="translate(${-offsetX} ${-offsetY})">\n${contentMarkup}\n</g>`
      : '';

    return [defsMarkup, contentGroup].filter(Boolean).join('\n').trim();
  } catch {
    return '';
  }
};

const selectPatternsPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & PatternsSlice;
  return {
    patterns: slice.patterns ?? EMPTY_PATTERNS,
    addPattern: slice.addPattern,
    updatePattern: slice.updatePattern,
    removePattern: slice.removePattern,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
    selectedCount: state.selectedIds.length,
  };
};

const EMPTY_PATTERNS: PatternDef[] = [];

export const PatternsPanel: React.FC = () => {
  const {
    patterns,
    addPattern,
    updatePattern,
    removePattern,
    selectedFromSearch,
    selectFromSearch,
    selectedCount,
  } = useShallowCanvasSelector(selectPatternsPanelState);

  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const detailsRef = React.useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = useState<string | number | null>(null);

  React.useEffect(() => {
    if (!selectedFromSearch) return;
    setEditingPatternId(selectedFromSearch);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    }, 0);
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  useEffect(() => {
    if (!editingPatternId && patterns.length) {
      setEditingPatternId(patterns[0].id);
    } else if (editingPatternId && !patterns.find((pattern) => pattern.id === editingPatternId)) {
      setEditingPatternId(patterns[0]?.id ?? null);
    }
  }, [editingPatternId, patterns]);

  const editingPattern = patterns.find((pattern) => pattern.id === editingPatternId) ?? null;
  const [lastBuiltInType, setLastBuiltInType] = useState<BuiltInPatternType>('stripes');

  // Color-mode-aware tokens for Type chips
  const selectedBg = useColorModeValue('gray.200', 'whiteAlpha.200');
  const selectedHover = useColorModeValue('gray.300', 'whiteAlpha.300');
  const selectedColor = useColorModeValue('gray.800', 'white');
  const hoverBg = useColorModeValue('gray.100', 'whiteAlpha.50');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    if (!editingPattern) return;
    if (editingPattern.type !== 'raw') {
      setLastBuiltInType(editingPattern.type);
    }
  }, [editingPattern]);

  const isCustomPattern = editingPattern?.type === 'raw';
  const selectedUnits = editingPattern?.patternUnits ?? 'userSpaceOnUse';
  const isObjectBoundingBoxUnits = selectedUnits === 'objectBoundingBox';
  const objectBoundingBoxScaleOffset = (editingPattern?.scale ?? DEFAULT_OBJECT_BBOX_SCALE) - DEFAULT_OBJECT_BBOX_SCALE;

  // Generate pattern SVG preview
  const patternSvgPreview = useMemo(() => {
    if (!editingPattern) return '';
    return buildPatternPreviewSvg(editingPattern, 80, `preview-pattern-panel-${editingPattern.id}`);
  }, [editingPattern]);

  const handleAdd = () => {
    const id = `pattern-${Date.now()}`;
    const newPattern: PatternDef = {
      id,
      type: 'stripes',
      size: 8,
      fg: '#0f172a',
      name: 'New Pattern', // Ensure name exists if required by LibraryItem
      bg: '#e2e8f0',
    };
    addPattern?.(newPattern);
    setEditingPatternId(id);
  };

  const handleCreateFromSelection = () => {
    const state = canvasStoreApi.getState();
    if (!state.selectedIds?.length) {
      return;
    }

    const selectedElements = getSelectedElementsWithChildren(state.elements ?? [], state.selectedIds);
    if (!selectedElements.length) {
      return;
    }

    const defs = defsContributionRegistry.serializeDefs(state, selectedElements);
    const exportResult = serializePathsForExport(state.elements ?? [], state.selectedIds, {
      selectedOnly: true,
      padding: 0,
      defs,
      state,
    });

    if (!exportResult) {
      return;
    }

    const rawContent = buildRawPatternContentFromExport(
      exportResult.svgContent,
      exportResult.bounds.minX,
      exportResult.bounds.minY
    );
    const width = Math.max(1, exportResult.bounds.width);
    const height = Math.max(1, exportResult.bounds.height);
    const id = generateShortId('pattern');

    const newPattern: PatternDef = {
      id,
      name: `Pattern ${patterns.length + 1}`,
      type: 'raw',
      size: Math.max(width, height),
      fg: '#0f172a',
      bg: '#e2e8f0',
      patternUnits: 'userSpaceOnUse',
      width,
      height,
      rawContent: rawContent || `<rect width="${width}" height="${height}" fill="none" />`,
    };

    addPattern?.(newPattern);
    setEditingPatternId(id);
  };

  const handleFieldUpdate = (field: keyof PatternDef, value: string | number) => {
    if (!editingPatternId) return;
    updatePattern?.(editingPatternId, { [field]: value });
  };

  const handleCustomToggle = (enabled: boolean) => {
    if (!editingPatternId || !editingPattern) return;

    if (enabled) {
      const width = editingPattern.width ?? editingPattern.size;
      const height = editingPattern.height ?? editingPattern.size;

      const rawFromCurrent =
        editingPattern.type === 'raw'
          ? normalizeRawPatternContent(editingPattern.rawContent)
          : buildBuiltInPatternBody(
              editingPattern.type as BuiltInPatternType,
              editingPattern.size,
              editingPattern.fg,
              editingPattern.bg
            ).content;

      updatePattern?.(editingPatternId, {
        type: 'raw',
        width,
        height,
        patternUnits: editingPattern.patternUnits ?? 'userSpaceOnUse',
        rawContent: rawFromCurrent || `<rect width="${width}" height="${height}" fill="${editingPattern.bg}" />`,
      });
      return;
    }

    updatePattern?.(editingPatternId, {
      type: lastBuiltInType,
    });
  };

  const renderItem = (pattern: PatternDef, isSelected: boolean) => (
    <PatternItemCard
      pattern={pattern}
      isSelected={isSelected}
    />
  );

  return (
    <LibraryPanelHelper
      title="Patterns"
      items={patterns}
      selectedId={editingPatternId}
      onSelect={setEditingPatternId}
      onAdd={handleAdd}
      onDelete={(id) => removePattern?.(id)}
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      Actions={
        <Flex direction="column" gap={1}>
          <PanelStyledButton
            size="xs"
            onClick={handleCreateFromSelection}
            isDisabled={selectedCount === 0}
          >
            From Selection
          </PanelStyledButton>
          {selectedCount === 0 && (
            <Text fontSize="xs" color={mutedTextColor}>
              Select elements in canvas to create a pattern.
            </Text>
          )}
        </Flex>
      }
      Editor={
        editingPattern ? (
          <>
            <CompactFieldRow label="Name" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={editingPattern.name}
                  onChange={(value) => handleFieldUpdate('name', value)}
                  placeholder="Pattern name"
                  width="full"
                />
              </Box>
            </CompactFieldRow>

            <CompactFieldRow label="Custom" labelWidth="45px">
              <Flex gap={0.5}>
                <PanelStyledButton
                  size="xs"
                  onClick={() => handleCustomToggle(false)}
                  variant={!isCustomPattern ? 'solid' : 'unstyled'}
                  bg={!isCustomPattern ? selectedBg : 'transparent'}
                  color={!isCustomPattern ? selectedColor : undefined}
                  _hover={{ bg: !isCustomPattern ? selectedHover : hoverBg }}
                >
                  Off
                </PanelStyledButton>
                <PanelStyledButton
                  size="xs"
                  onClick={() => handleCustomToggle(true)}
                  variant={isCustomPattern ? 'solid' : 'unstyled'}
                  bg={isCustomPattern ? selectedBg : 'transparent'}
                  color={isCustomPattern ? selectedColor : undefined}
                  _hover={{ bg: isCustomPattern ? selectedHover : hoverBg }}
                >
                  On
                </PanelStyledButton>
              </Flex>
            </CompactFieldRow>

            {!isCustomPattern && (
              <CompactFieldRow label="Type" labelWidth="45px" align="flex-start">
                <Wrap spacing={0.5}>
                  {PATTERN_TYPES.map((pt) => {
                    const isSelected = editingPattern.type === pt.value;
                    return (
                      <WrapItem key={pt.value}>
                        <PanelStyledButton
                          size="xs"
                          onClick={() => handleFieldUpdate('type', pt.value)}
                          variant={isSelected ? 'solid' : 'unstyled'}
                          bg={isSelected ? selectedBg : 'transparent'}
                          color={isSelected ? selectedColor : undefined}
                          _hover={{ bg: isSelected ? selectedHover : hoverBg }}
                        >
                          {pt.label}
                        </PanelStyledButton>
                      </WrapItem>
                    );
                  })}
                </Wrap>
              </CompactFieldRow>
            )}

            <CompactFieldRow label="Units" labelWidth="45px" align="flex-start">
              <Wrap spacing={0.5}>
                {PATTERN_UNITS_OPTIONS.map((option) => {
                  const isSelected = selectedUnits === option.value;
                  return (
                    <WrapItem key={option.value}>
                      <PanelStyledButton
                        size="xs"
                        onClick={() => handleFieldUpdate('patternUnits', option.value)}
                        variant={isSelected ? 'solid' : 'unstyled'}
                        bg={isSelected ? selectedBg : 'transparent'}
                        color={isSelected ? selectedColor : undefined}
                        _hover={{ bg: isSelected ? selectedHover : hoverBg }}
                      >
                        {option.label}
                      </PanelStyledButton>
                    </WrapItem>
                  );
                })}
              </Wrap>
            </CompactFieldRow>

            {isObjectBoundingBoxUnits && (
              <CompactFieldRow label="Scale %" labelWidth="45px">
                <Box pr={0.5} w="full">
                  <SliderControl
                    value={objectBoundingBoxScaleOffset}
                    min={OBJECT_BBOX_SCALE_SLIDER_MIN}
                    max={OBJECT_BBOX_SCALE_SLIDER_MAX}
                    step={1}
                    onChange={(value) => {
                      const resolvedScale = Math.max(
                        MIN_EFFECTIVE_OBJECT_BBOX_SCALE,
                        DEFAULT_OBJECT_BBOX_SCALE + value
                      );
                      handleFieldUpdate('scale', resolvedScale);
                    }}
                    formatter={(value) => `${Math.round(value)}`}
                    inline
                    gap="4px"
                    minWidth="70px"
                    valueWidth="40px"
                    allowOutOfRangeInput
                  />
                </Box>
              </CompactFieldRow>
            )}

            {!isCustomPattern && (
              <CompactFieldRow label="Size" labelWidth="45px">
                <Box pr={0.5} w="full">
                  <NumberInput
                    label=""
                    value={editingPattern.size}
                    onChange={(v) => handleFieldUpdate('size', typeof v === 'number' ? v : editingPattern.size)}
                    min={2}
                    max={64}
                    inputWidth="full"
                  />
                </Box>
              </CompactFieldRow>
            )}

            {!isCustomPattern && (
              <CompactFieldRow label="FG" labelWidth="45px">
                <Box pr={0.5} w="full">
                  <Flex align="center" gap={1.5} flex={1}>
                    <Input
                      type="color"
                      value={editingPattern.fg}
                      onChange={(e) => handleFieldUpdate('fg', e.target.value)}
                      w="28px"
                      h="24px"
                      p={0}
                      borderRadius="sm"
                      cursor="pointer"
                      flexShrink={0}
                    />
                    <PanelTextInput
                      value={editingPattern.fg}
                      onChange={(value) => handleFieldUpdate('fg', value)}
                      placeholder="#000000"
                      width="full"
                    />
                  </Flex>
                </Box>
              </CompactFieldRow>
            )}

            {!isCustomPattern && (
              <CompactFieldRow label="BG" labelWidth="45px">
                <Box pr={0.5} w="full">
                  <Flex align="center" gap={1.5} flex={1}>
                    <Input
                      type="color"
                      value={editingPattern.bg}
                      onChange={(e) => handleFieldUpdate('bg', e.target.value)}
                      w="28px"
                      h="24px"
                      p={0}
                      borderRadius="sm"
                      cursor="pointer"
                      flexShrink={0}
                    />
                    <PanelTextInput
                      value={editingPattern.bg}
                      onChange={(value) => handleFieldUpdate('bg', value)}
                      placeholder="#ffffff"
                      width="full"
                    />
                  </Flex>
                </Box>
              </CompactFieldRow>
            )}

            <SvgPreview
              content={patternSvgPreview}
              title="SVG Code"
              height="60px"
              showVisualPreview={true}
            />
          </>
        ) : null
      }
    />
  );
};
