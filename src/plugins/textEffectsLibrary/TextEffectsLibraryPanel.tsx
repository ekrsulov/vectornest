import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { VStack, Text } from '@chakra-ui/react';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import type { CanvasStore } from '../../store/canvasStore';
import type { TextEffectsLibrarySlice } from './types';
import type { TextEffectPreset, TextEffectCategory, TextEffectRenderLayer } from './types';
import type { LibraryFiltersSlice } from '../libraryFilters/slice';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { TextEffectItemCard } from './TextEffectItemCard';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useCanvasStore } from '../../store/canvasStore';
import { TEXT_EFFECT_PRESETS, CATEGORY_LABELS, CATEGORY_ORDER } from './presets';
import { buildElementMap } from '../../utils/elementMapUtils';
import { generateShortId } from '../../utils/idGenerator';
import { mergeImportedResources } from '../../utils/importContributionRegistry';
import type { CanvasElement, PathData } from '../../types';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import {
  buildTextEffectAnimationId,
  extractTextEffectApplicationFromPreview,
  isTextEffectAnimationId,
  parseFilterContent,
} from './applyTextEffect';
import type { ExtractedTextEffectStyle } from './applyTextEffect';
import {
  TEXT_EFFECT_BASE_ANIMATIONS_METADATA_KEY,
  TEXT_EFFECT_LAYERS_METADATA_KEY,
} from './renderLayerUtils';

type PresetItem = TextEffectPreset & { name: string };
const PRESET_ITEMS: PresetItem[] = TEXT_EFFECT_PRESETS.map((p) => ({ ...p, name: p.label }));

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  ...CATEGORY_ORDER.map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] })),
];

type ChildIdContainer = { childIds?: string[] };
type MetadataRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const isWhiteLikeColor = (value: string | undefined): boolean => {
  if (!value || value === 'none' || value.startsWith('url(')) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'white') return true;
  if (!normalized.startsWith('#')) return false;
  const hex = normalized.slice(1);
  if (hex.length !== 3 && hex.length !== 6) return false;
  const expanded = hex.length === 3
    ? hex.split('').map((part) => `${part}${part}`).join('')
    : hex;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return false;
  const average = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return average >= 235 && spread <= 24;
};

const withTextEffectMetadata = (
  metadata: unknown,
  layers: TextEffectRenderLayer[] | undefined,
  baseAnimations?: Array<Omit<SVGAnimation, 'id' | 'targetElementId'>>,
): MetadataRecord | undefined => {
  const nextMetadata: MetadataRecord = isRecord(metadata) ? { ...metadata } : {};

  if (layers?.length) {
    nextMetadata[TEXT_EFFECT_LAYERS_METADATA_KEY] = layers;
  } else {
    delete nextMetadata[TEXT_EFFECT_LAYERS_METADATA_KEY];
  }

  if (baseAnimations?.length) {
    nextMetadata[TEXT_EFFECT_BASE_ANIMATIONS_METADATA_KEY] = baseAnimations;
  } else {
    delete nextMetadata[TEXT_EFFECT_BASE_ANIMATIONS_METADATA_KEY];
  }

  return Object.keys(nextMetadata).length > 0 ? nextMetadata : undefined;
};

const forEachSelectedLeafElement = (
  selectedIds: string[],
  elementsById: Map<string, CanvasElement>,
  visitLeaf: (element: CanvasElement) => void,
): void => {
  const queue = [...selectedIds];
  const visited = new Set<string>();

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const elementId = queue[queueIndex];
    if (visited.has(elementId)) continue;
    visited.add(elementId);

    const element = elementsById.get(elementId);
    if (!element) continue;

    if (element.type === 'group') {
      const data = element.data as ChildIdContainer | null | undefined;
      queue.push(...(Array.isArray(data?.childIds) ? data.childIds : []));
      continue;
    }

    visitLeaf(element);
  }
};

const selectPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & TextEffectsLibrarySlice;
  return {
    selectedFromSearch: slice.textEffectsSelectedFromSearch ?? null,
    selectFromSearch: slice.selectTextEffectFromSearch,
    selectedIds: state.selectedIds,
    hasSelection: state.selectedIds.length > 0,
  };
};

const applyTextStyleToNativeText = (
  data: Record<string, unknown>,
  style: ExtractedTextEffectStyle,
): Record<string, unknown> => ({
  ...data,
  spans: Array.isArray(data.spans) && style.fillColor !== undefined
    ? (data.spans as Array<Record<string, unknown>>).map((span) => ({
      ...span,
      fillColor: style.fillColor,
    }))
    : data.spans,
  ...(style.fillColor !== undefined ? { fillColor: style.fillColor } : {}),
  fillOpacity: style.fillOpacity,
  strokeColor: style.strokeColor,
  strokeWidth: style.strokeWidth,
  strokeOpacity: style.strokeOpacity,
  opacity: style.opacity,
  maskId: style.maskId,
  clipPathId: style.clipPathId,
  clipPathTemplateId: undefined,
});

const applyTextStyleToTextPath = (
  pathData: PathData,
  style: ExtractedTextEffectStyle,
): PathData => ({
  ...pathData,
  clipPathId: style.clipPathId,
  clipPathTemplateId: undefined,
  textPath: pathData.textPath ? {
    ...pathData.textPath,
    spans: Array.isArray(pathData.textPath.spans) && style.fillColor !== undefined
      ? pathData.textPath.spans.map((span) => ({
        ...span,
        fillColor: style.fillColor,
      }))
      : pathData.textPath.spans,
    ...(style.fillColor !== undefined ? { fillColor: style.fillColor } : {}),
    fillOpacity: style.fillOpacity,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    strokeOpacity: style.strokeOpacity,
    opacity: style.opacity,
    maskId: style.maskId,
  } : pathData.textPath,
});

const clearTextEffectFromNativeText = (data: Record<string, unknown>): Record<string, unknown> => ({
  ...data,
  filterId: undefined,
  maskId: undefined,
  clipPathId: undefined,
  clipPathTemplateId: undefined,
  opacity: undefined,
  metadata: withTextEffectMetadata(data.metadata, undefined),
});

const clearTextEffectFromTextPath = (pathData: PathData): PathData => ({
  ...pathData,
  filterId: undefined,
  clipPathId: undefined,
  clipPathTemplateId: undefined,
  metadata: withTextEffectMetadata(pathData.metadata, undefined),
  textPath: pathData.textPath ? {
    ...pathData.textPath,
    maskId: undefined,
    opacity: undefined,
  } : pathData.textPath,
});

export const TextEffectsLibraryPanel: React.FC = () => {
  const {
    selectedFromSearch,
    selectFromSearch,
    hasSelection,
  } = useShallowCanvasSelector(selectPanelState);

  const detailsRef = useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = useState<string | number | null>(null);

  useEffect(() => {
    if (!selectedFromSearch) return;
    setActivePresetId(selectedFromSearch);
    queueMicrotask(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    });
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  const [activePresetId, setActivePresetId] = useState<string | null>(PRESET_ITEMS[0]?.id ?? null);
  const [category, setCategory] = useState<TextEffectCategory | 'all'>('all');

  const filteredItems = useMemo(
    () => category === 'all' ? PRESET_ITEMS : PRESET_ITEMS.filter((p) => p.category === category),
    [category],
  );

  const activePreset = useMemo(
    () => PRESET_ITEMS.find((p) => p.id === activePresetId) ?? null,
    [activePresetId],
  );

  const handleSelect = useCallback((id: string | null) => {
    setActivePresetId(id);
  }, []);

  const applyPresetToSelection = useCallback((preset: PresetItem | null) => {
    if (!preset) return;
    const state = useCanvasStore.getState();
    const { selectedIds, updateElement, temporal } = state;
    if (!selectedIds.length) return;

    const previewApplication = extractTextEffectApplicationFromPreview(preset.previewSvg, preset.id);
    const effectiveStyle = previewApplication.style
      ? {
        ...previewApplication.style,
        ...(preset.preserveSourceFill ? { fillColor: undefined } : {}),
      }
      : null;
    const presetPrimitives = parseFilterContent(preset.filterContent);
    const presetHasAnimatedPrimitives = presetPrimitives.some((primitive) =>
      Array.isArray((primitive as { animateChildren?: unknown[] }).animateChildren) &&
      ((primitive as { animateChildren?: unknown[] }).animateChildren?.length ?? 0) > 0,
    );
    const previewHasAnimatedPrimitives = (previewApplication.filterPrimitives ?? []).some((primitive) =>
      Array.isArray((primitive as { animateChildren?: unknown[] }).animateChildren) &&
      ((primitive as { animateChildren?: unknown[] }).animateChildren?.length ?? 0) > 0,
    );
    const primitives = previewHasAnimatedPrimitives && !presetHasAnimatedPrimitives
      ? previewApplication.filterPrimitives ?? presetPrimitives
      : presetPrimitives;
    const filterAttributes = previewHasAnimatedPrimitives && !presetHasAnimatedPrimitives
      ? previewApplication.filterAttributes ?? preset.filterAttributes
      : preset.filterAttributes;
    const styleUsesDefs =
      Boolean(previewApplication.style?.maskId) ||
      Boolean(previewApplication.style?.clipPathId) ||
      Boolean(previewApplication.style?.fillColor?.startsWith('url(')) ||
      Boolean(previewApplication.style?.strokeColor?.startsWith('url('));
    const shouldApplyFilter =
      Boolean(preset.forceApplyFilter) ||
      Boolean(previewApplication.filterPrimitives?.length) ||
      !styleUsesDefs;
    const filtersSlice = state as unknown as LibraryFiltersSlice;
    const currentFilters = filtersSlice.libraryFilters ?? [];
    const animationSlice = state as unknown as AnimationPluginSlice;
    const currentAnimations = animationSlice.animations ?? [];
    const availableFilters = [...currentFilters];

    const upsertPresetFilter = (
      name: string,
      nextPrimitives: Array<{ type: string; [key: string]: unknown }>,
      nextFilterAttributes?: Record<string, string>,
    ): string => {
      const existing = availableFilters.find((filter) => filter.name === name);

      if (existing) {
        filtersSlice.updateLibraryFilter?.(existing.id, {
          primitives: nextPrimitives,
          filterAttributes: nextFilterAttributes,
          type: 'glow',
          category: 'preset',
          name,
        });
        return existing.id;
      }

      const nextFilter = {
        id: generateShortId('filter'),
        name,
        type: 'glow' as const,
        primitives: nextPrimitives,
        category: 'preset' as const,
        filterAttributes: nextFilterAttributes,
      };

      availableFilters.push(nextFilter);
      useCanvasStore.setState({
        libraryFilters: [...availableFilters],
      } as Partial<CanvasStore>);

      return nextFilter.id;
    };

    const finalFilterId = shouldApplyFilter
      ? upsertPresetFilter(`Text FX: ${preset.label}`, primitives, filterAttributes)
      : undefined;
    const renderLayers = previewApplication.renderLayers
      .map((layer, index) => {
        const style = layer.style ? { ...layer.style } : {};
        const useSourceFill = Boolean(preset.preserveSourceFill && isWhiteLikeColor(style.fillColor));
        if (useSourceFill) {
          delete style.fillColor;
        }

        const layerFilterId = layer.filterPrimitives?.length
          ? upsertPresetFilter(
            `Text FX: ${preset.label} Layer ${index + 1}`,
            layer.filterPrimitives,
            layer.filterAttributes,
          )
          : undefined;
        const nextLayer: TextEffectRenderLayer = {
          offsetX: layer.offsetX,
          offsetY: layer.offsetY,
          renderBeforeBase: layer.renderBeforeBase,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
          strokeColor: style.strokeColor,
          strokeWidth: style.strokeWidth,
          strokeOpacity: style.strokeOpacity,
          opacity: style.opacity,
          maskId: style.maskId,
          clipPathId: style.clipPathId,
          filterId: layerFilterId,
          useSourceFill,
          animations: layer.animations.length > 0 ? layer.animations : undefined,
        };

        const hasRenderableContent =
          Boolean(nextLayer.fillColor) ||
          nextLayer.useSourceFill ||
          nextLayer.fillOpacity !== undefined ||
          Boolean(nextLayer.strokeColor) ||
          nextLayer.strokeWidth !== undefined ||
          nextLayer.strokeOpacity !== undefined ||
          nextLayer.opacity !== undefined ||
          Boolean(nextLayer.maskId) ||
          Boolean(nextLayer.clipPathId) ||
          Boolean(nextLayer.filterId) ||
          Boolean(nextLayer.animations?.length) ||
          nextLayer.offsetX !== 0 ||
          nextLayer.offsetY !== 0;

        return hasRenderableContent ? nextLayer : null;
      })
      .filter((layer): layer is TextEffectRenderLayer => Boolean(layer));
    const inlineBaseAnimations = previewApplication.animations.length === 0
      ? previewApplication.baseAnimations
      : [];

    temporal?.getState().pause();

    const elementsById = buildElementMap(state.elements);
    const textTargetIds = new Set<string>();

    forEachSelectedLeafElement(selectedIds, elementsById, (element) => {
      const isTextTarget =
        element.type === 'nativeText' ||
        (element.type === 'path' && Boolean((element.data as PathData).textPath?.text));
      if (isTextTarget) {
        textTargetIds.add(element.id);
      }
    });

    const nextAnimations = currentAnimations.filter((animation) => {
      if (!isTextEffectAnimationId(animation.id)) return true;
      return !textTargetIds.has(animation.targetElementId);
    });

    if (nextAnimations.length !== currentAnimations.length) {
      useCanvasStore.setState({
        animations: nextAnimations,
      } as Partial<CanvasStore>);
    }

    forEachSelectedLeafElement(selectedIds, elementsById, (element) => {
      if (!element.data) return;
      const supported =
        element.type === 'path' ||
        element.type === 'nativeText' ||
        element.type === 'image' ||
        element.type === 'nativeShape' ||
        element.type === 'symbolInstance';
      if (!supported) return;

      const nextData: Record<string, unknown> = {
        ...(element.data as Record<string, unknown>),
        filterId: finalFilterId,
      };

      if (effectiveStyle) {
        if (element.type === 'nativeText') {
          Object.assign(nextData, applyTextStyleToNativeText(nextData, effectiveStyle));
        } else if (element.type === 'path') {
          Object.assign(nextData, applyTextStyleToTextPath(nextData as unknown as PathData, effectiveStyle));
        }
      }

      if (element.type === 'nativeText') {
        nextData.metadata = withTextEffectMetadata(nextData.metadata, renderLayers, inlineBaseAnimations);
      } else if (element.type === 'path' && Boolean((element.data as PathData).textPath?.text)) {
        nextData.metadata = withTextEffectMetadata(nextData.metadata, renderLayers, inlineBaseAnimations);
      }

      updateElement?.(element.id, { data: nextData });
    });

    if (textTargetIds.size > 0 && Object.keys(previewApplication.imports).length > 0) {
      mergeImportedResources(previewApplication.imports, new Map<string, string>(), useCanvasStore.getState());
    }

    let addedDirectAnimations = 0;
    forEachSelectedLeafElement(selectedIds, elementsById, (element) => {
      if (
        previewApplication.animations.length > 0 &&
        (element.type === 'nativeText' || (element.type === 'path' && Boolean((element.data as PathData).textPath?.text)))
      ) {
        previewApplication.animations.forEach((animation, index) => {
          animationSlice.addAnimation?.({
            ...animation,
            id: buildTextEffectAnimationId(element.id, preset.id, index),
            targetElementId: element.id,
          });
          addedDirectAnimations += 1;
        });
      }
    });

    if (
      addedDirectAnimations > 0 ||
      inlineBaseAnimations.length > 0 ||
      renderLayers.some((layer) => (layer.animations?.length ?? 0) > 0)
    ) {
      const latestState = useCanvasStore.getState() as CanvasStore & AnimationPluginSlice;
      const animationState = latestState.animationState;
      if (animationState) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        useCanvasStore.setState({
          animationState: {
            ...animationState,
            isPlaying: true,
            hasPlayed: true,
            currentTime: 0,
            startTime: now,
            restartKey: animationState.restartKey + 1,
          },
        } as Partial<CanvasStore & AnimationPluginSlice>);
      }
    }

    temporal?.getState().resume();
  }, []);

  const handleApplyToSelection = useCallback(() => {
    applyPresetToSelection(activePreset);
  }, [activePreset, applyPresetToSelection]);

  const handleItemDoubleClick = useCallback((presetId: string) => {
    if (!hasSelection) return;
    const preset = PRESET_ITEMS.find((item) => item.id === presetId) ?? null;
    if (!preset) return;
    setActivePresetId(presetId);
    applyPresetToSelection(preset);
  }, [applyPresetToSelection, hasSelection]);

  const handleRemoveFromSelection = useCallback(() => {
    const state = useCanvasStore.getState();
    const { selectedIds, updateElement, temporal } = state;
    if (!selectedIds.length) return;

    temporal?.getState().pause();

    const elementsById = buildElementMap(state.elements);
    const animationSlice = state as unknown as AnimationPluginSlice;
    const currentAnimations = animationSlice.animations ?? [];
    const textTargetIds = new Set<string>();

    forEachSelectedLeafElement(selectedIds, elementsById, (element) => {
      if (
        element.type === 'nativeText' ||
        (element.type === 'path' && Boolean((element.data as PathData).textPath?.text))
      ) {
        textTargetIds.add(element.id);
      }

      if (!element.data) return;

      if (element.type === 'nativeText') {
        updateElement?.(element.id, {
          data: clearTextEffectFromNativeText(element.data as Record<string, unknown>),
        });
        return;
      }

      if (element.type === 'path' && Boolean((element.data as PathData).textPath?.text)) {
        updateElement?.(element.id, {
          data: clearTextEffectFromTextPath(element.data as PathData),
        });
        return;
      }

      const dataObj = element.data as Record<string, unknown> | undefined;
      if (!dataObj || !('filterId' in dataObj)) return;

      updateElement?.(element.id, {
        data: {
          ...element.data,
          filterId: undefined,
        },
      });
    });

    const nextAnimations = currentAnimations.filter((animation) => {
      if (!isTextEffectAnimationId(animation.id)) return true;
      return !textTargetIds.has(animation.targetElementId);
    });

    if (nextAnimations.length !== currentAnimations.length) {
      useCanvasStore.setState({
        animations: nextAnimations,
      } as Partial<CanvasStore>);
    }

    temporal?.getState().resume();
  }, []);

  const renderItem = (item: PresetItem, isSelected: boolean) => (
    <TextEffectItemCard preset={item} isSelected={isSelected} />
  );

  return (
    <LibraryPanelHelper
      title="Text Effects"
      items={filteredItems}
      selectedId={activePresetId}
      onSelect={handleSelect}
      onItemDoubleClick={handleItemDoubleClick}
      emptyMessage="No presets match the current filter."
      renderItem={renderItem}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      ExtraContent={
        <CustomSelect
          value={category}
          onChange={(val) => setCategory(val as TextEffectCategory | 'all')}
          options={CATEGORY_OPTIONS}
          flex="1"
        />
      }
      Editor={
        activePreset ? (
          <VStack spacing={1} align="stretch">
            <Text fontSize="11px" color="gray.500" lineHeight="1.3">
              {activePreset.description}
            </Text>
          </VStack>
        ) : null
      }
      Actions={
        activePreset ? (
          <VStack spacing={1} align="stretch">
            <PanelStyledButton
              onClick={handleApplyToSelection}
              size="xs"
              width="100%"
              isDisabled={!hasSelection}
            >
              Apply to selection
            </PanelStyledButton>
            {hasSelection && (
              <PanelStyledButton
                onClick={handleRemoveFromSelection}
                variant="outline"
                size="xs"
                width="100%"
              >
                Remove filter
              </PanelStyledButton>
            )}
          </VStack>
        ) : null
      }
    />
  );
};
