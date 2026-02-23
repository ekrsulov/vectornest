/**
 * PresetCatalog — Zone 3: Unified preset browser using Animation Library definitions
 * with animated preview cards, search, filtering, and favorites.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Box, VStack, HStack, Text, SimpleGrid, Wrap, WrapItem, Badge, useColorMode } from '@chakra-ui/react';
import { Star, Clock } from 'lucide-react';
import { Panel } from '../../../ui/Panel';
import { PanelTextInput } from '../../../ui/PanelTextInput';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { useThemeColors } from '../../../hooks';
import { useCanvasStore } from '../../../store/canvasStore';
import type { CanvasStore } from '../../../store/canvasStore';
import type { AnimationManagerSlice, PresetCategory } from '../types';
import type { AnimationLibrarySlice } from '../../animationLibrary/types';
import { GENERAL_PRESETS } from '../../animationLibrary/presets/generalPresets';
import { ENTRANCE_EXIT_PRESETS } from '../../animationLibrary/presets/entranceExitPresets';
import { TRANSFORM_PRESETS } from '../../animationLibrary/presets/transformPresets';
import { SPECIAL_PRESETS } from '../../animationLibrary/presets/specialPresets';
import { LOOP_PRESETS } from '../../animationLibrary/presets/loopPresets';
import { PATH_PRESETS } from '../../animationLibrary/presets/pathPresets';
import { COLOR_PRESETS } from '../../animationLibrary/presets/colorPresets';
import { FILTER_PRESETS } from '../../animationLibrary/presets/filterPresets';
import { TEXT_PRESETS } from '../../animationLibrary/presets/textPresets';
import { ADVANCED_PRESETS } from '../../animationLibrary/presets/advancedPresets';
import type { AnimationPreset } from '../../animationLibrary/types';
import { useShallow } from 'zustand/react/shallow';

// ─── Preset Categories ──────────────────────────────────────────────────────

const CATEGORY_TAGS: Array<{ value: PresetCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'exit', label: 'Exit' },
  { value: 'loop', label: 'Loop' },
  { value: 'transform', label: 'Transform' },
  { value: 'style', label: 'Style' },
  { value: 'path', label: 'Path' },
  { value: 'filter', label: 'Filter' },
  { value: 'text', label: 'Text' },
  { value: 'advanced', label: 'Advanced' },
];

// ─── Build Category-Tagged Presets from Animation Library ───────────────────

interface CatalogPreset {
  preset: AnimationPreset;
  category: PresetCategory;
}

/** Build a flat list of presets tagged with their category */
function buildCatalogPresets(): CatalogPreset[] {
  const tagged: CatalogPreset[] = [];

  const addCategory = (presets: AnimationPreset[], category: PresetCategory) => {
    for (const p of presets) {
      tagged.push({ preset: p, category });
    }
  };

  // Entrance/Exit presets: split by name heuristic
  for (const p of ENTRANCE_EXIT_PRESETS) {
    const nameLower = p.name.toLowerCase();
    const isExit = nameLower.includes('out') || nameLower.includes('exit') || nameLower.includes('shrink');
    tagged.push({ preset: p, category: isExit ? 'exit' : 'entrance' });
  }

  addCategory(GENERAL_PRESETS, 'style');
  addCategory(TRANSFORM_PRESETS, 'transform');
  addCategory(SPECIAL_PRESETS, 'advanced');
  addCategory(LOOP_PRESETS, 'loop');
  addCategory(PATH_PRESETS, 'path');
  addCategory(COLOR_PRESETS, 'style');
  addCategory(FILTER_PRESETS, 'filter');
  addCategory(TEXT_PRESETS, 'text');
  addCategory(ADVANCED_PRESETS, 'advanced');

  return tagged;
}

const ALL_CATALOG_PRESETS = buildCatalogPresets();

// ─── Store Selector ─────────────────────────────────────────────────────────

interface CatalogStoreSlice {
  catalogSearchQuery: string;
  catalogActiveTags: PresetCategory[];
  catalogFavorites: string[];
  catalogRecents: string[];
  updateAnimationManagerState: AnimationManagerSlice['updateAnimationManagerState'];
  selectedIds: string[];
  selectedAnimationId: string | null;
  applyPresetToSelection: AnimationLibrarySlice['applyPresetToSelection'];
}

const selectCatalogState = (state: CanvasStore): CatalogStoreSlice => {
  const mSlice = state as unknown as AnimationManagerSlice;
  const libSlice = state as unknown as AnimationLibrarySlice;
  return {
    catalogSearchQuery: mSlice.animationManager?.catalogSearchQuery ?? '',
    catalogActiveTags: mSlice.animationManager?.catalogActiveTags ?? ['all'],
    catalogFavorites: mSlice.animationManager?.catalogFavorites ?? [],
    catalogRecents: mSlice.animationManager?.catalogRecents ?? [],
    updateAnimationManagerState: mSlice.updateAnimationManagerState,
    selectedIds: state.selectedIds,
    selectedAnimationId: mSlice.animationManager?.selectedAnimationId ?? null,
    applyPresetToSelection: libSlice.applyPresetToSelection,
  };
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PresetCatalog: React.FC = () => {
  const {
    catalogSearchQuery,
    catalogActiveTags,
    catalogFavorites,
    catalogRecents,
    updateAnimationManagerState,
    selectedIds,
    applyPresetToSelection,
  } = useCanvasStore(useShallow(selectCatalogState));

  const { input } = useThemeColors();
  const { colorMode } = useColorMode();
  const previewColor = colorMode === 'dark' ? 'white' : 'black';
  const [showCount, setShowCount] = useState(12);

  // Filter presets
  const filteredPresets = useMemo(() => {
    let results = ALL_CATALOG_PRESETS;

    // Category filter
    if (!catalogActiveTags.includes('all')) {
      results = results.filter((p) =>
        catalogActiveTags.includes(p.category),
      );
    }

    // Search filter
    if (catalogSearchQuery) {
      const q = catalogSearchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.preset.name.toLowerCase().includes(q) ||
          (p.preset.description ?? '').toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    // Sort: favorites first, then recents, then alphabetical
    return results.sort((a, b) => {
      const aFav = catalogFavorites.includes(a.preset.id) ? -2 : 0;
      const bFav = catalogFavorites.includes(b.preset.id) ? -2 : 0;
      const aRec = catalogRecents.includes(a.preset.id) ? -1 : 0;
      const bRec = catalogRecents.includes(b.preset.id) ? -1 : 0;
      const priority = aFav + aRec - (bFav + bRec);
      if (priority !== 0) return priority;
      return a.preset.name.localeCompare(b.preset.name);
    });
  }, [catalogSearchQuery, catalogActiveTags, catalogFavorites, catalogRecents]);

  const handleSearch = useCallback(
    (value: string) => {
      updateAnimationManagerState?.({ catalogSearchQuery: value });
    },
    [updateAnimationManagerState],
  );

  const handleTagToggle = useCallback(
    (tag: PresetCategory) => {
      if (tag === 'all') {
        updateAnimationManagerState?.({ catalogActiveTags: ['all'] });
        return;
      }
      let next: PresetCategory[] = catalogActiveTags.filter((t) => t !== 'all');
      if (next.includes(tag)) {
        next = next.filter((t) => t !== tag);
      } else {
        next.push(tag);
      }
      if (next.length === 0) next = ['all'];
      updateAnimationManagerState?.({ catalogActiveTags: next });
    },
    [catalogActiveTags, updateAnimationManagerState],
  );

  const handleApply = useCallback(
    (catalogPreset: CatalogPreset) => {
      if (selectedIds.length === 0) return;

      // Apply using the animation library's apply function
      applyPresetToSelection?.(catalogPreset.preset.id);

      // Track recent
      const newRecents = [
        catalogPreset.preset.id,
        ...catalogRecents.filter((id) => id !== catalogPreset.preset.id),
      ].slice(0, 10);
      updateAnimationManagerState?.({ catalogRecents: newRecents });

      // Auto-select the last created animation for editing
      const { animations } = useCanvasStore.getState() as unknown as { animations: Array<{ id: string }> };
      const lastAnim = animations?.[animations.length - 1];
      if (lastAnim) {
        updateAnimationManagerState?.({
          selectedAnimationId: lastAnim.id,
          editorMode: 'editing',
        });
      }
    },
    [selectedIds, catalogRecents, updateAnimationManagerState, applyPresetToSelection],
  );

  const handleToggleFavorite = useCallback(
    (presetId: string) => {
      const next = catalogFavorites.includes(presetId)
        ? catalogFavorites.filter((id) => id !== presetId)
        : [...catalogFavorites, presetId];
      updateAnimationManagerState?.({ catalogFavorites: next });
    },
    [catalogFavorites, updateAnimationManagerState],
  );

  const displayPresets = filteredPresets.slice(0, showCount);
  const hasMore = filteredPresets.length > showCount;

  return (
    <Panel title="Presets" isCollapsible defaultOpen={false}>
      <VStack spacing={2} align="stretch">
        {/* Search */}
        <PanelTextInput
          placeholder="Search presets..."
          value={catalogSearchQuery}
          onChange={handleSearch}
          width="100%"
        />

        {/* Category tags */}
        <Wrap spacing={1}>
          {CATEGORY_TAGS.map((tag) => (
            <WrapItem key={tag.value}>
              <Badge
                fontSize="9px"
                cursor="pointer"
                variant={
                  catalogActiveTags.includes(tag.value) ? 'solid' : 'subtle'
                }
                colorScheme={
                  catalogActiveTags.includes(tag.value) ? 'purple' : 'gray'
                }
                px={1.5}
                py={0.5}
                borderRadius="full"
                onClick={() => handleTagToggle(tag.value)}
                _hover={{ opacity: 0.8 }}
              >
                {tag.label}
              </Badge>
            </WrapItem>
          ))}
        </Wrap>

        {/* No selection warning */}
        {selectedIds.length === 0 && (
          <Text fontSize="10px" color="orange.400" textAlign="center" py={1}>
            Select an element first to apply presets
          </Text>
        )}

        {/* Preset grid */}
        <SimpleGrid columns={3} spacing={1}>
          {displayPresets.map((catalogPreset) => {
            const isFavorite = catalogFavorites.includes(catalogPreset.preset.id);
            const isRecent = catalogRecents.includes(catalogPreset.preset.id);

            // Styles that normalize colors to theme
            const normalizedColorStyles = {
              '& svg *': { stroke: 'currentColor !important' },
              '& svg *:not([fill="none"])': { fill: 'currentColor !important' },
              '& svg *[fill="none"]': { fill: 'none !important' },
            };

            return (
              <Box
                key={catalogPreset.preset.id}
                border="1px solid"
                borderColor={input.borderColor}
                borderRadius="md"
                p={1.5}
                bg="whiteAlpha.50"
                _hover={{ bg: 'whiteAlpha.100', borderColor: 'purple.400' }}
                transition="all 0.15s"
                position="relative"
              >
                {/* Favorite star */}
                <Box
                  position="absolute"
                  right={1}
                  top={1}
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(catalogPreset.preset.id);
                  }}
                  opacity={isFavorite ? 1 : 0.3}
                  _hover={{ opacity: 1 }}
                  zIndex={1}
                >
                  <Star
                    size={8}
                    fill={isFavorite ? '#ECC94B' : 'none'}
                    stroke={isFavorite ? '#ECC94B' : 'currentColor'}
                  />
                </Box>

                {/* Preset info */}
                <VStack spacing={0.5} align="center">
                  {/* Preview */}
                  {catalogPreset.preset.previewSvg && (
                    <Box
                      w="100%"
                      h="32px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color={previewColor}
                      overflow="hidden"
                      borderRadius="sm"
                      sx={{
                        '& svg': { width: '100%', height: '100%' },
                        ...(catalogPreset.preset.preserveColors ? {} : normalizedColorStyles),
                      }}
                      dangerouslySetInnerHTML={{ __html: catalogPreset.preset.previewSvg }}
                    />
                  )}

                  <Text fontSize="10px" fontWeight="medium" textAlign="center" lineHeight="1.2">
                    {catalogPreset.preset.name}
                  </Text>
                  {catalogPreset.preset.description && (
                    <Text fontSize="8px" color="gray.500" textAlign="center" lineHeight="1.2" noOfLines={1}>
                      {catalogPreset.preset.description}
                    </Text>
                  )}

                  {/* Badges */}
                  <HStack spacing={0.5} mt={0.5}>
                    {isRecent && (
                      <Clock size={7} color="#A0AEC0" />
                    )}
                    <Badge
                      fontSize="7px"
                      colorScheme="purple"
                      variant="subtle"
                      px={1}
                      py={0}
                    >
                      {catalogPreset.category}
                    </Badge>
                  </HStack>

                  {/* Apply button */}
                  <PanelStyledButton
                    onClick={() => handleApply(catalogPreset)}
                    size="xs"
                    isDisabled={selectedIds.length === 0}
                    mt={0.5}
                    w="100%"
                  >
                    Apply
                  </PanelStyledButton>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>

        {/* Load more */}
        {hasMore && (
          <PanelStyledButton
            onClick={() => setShowCount((c) => c + 12)}
            size="xs"
            variant="ghost"
          >
            Load more ({filteredPresets.length - showCount} remaining)
          </PanelStyledButton>
        )}

        {filteredPresets.length === 0 && (
          <Text fontSize="11px" color="gray.500" textAlign="center" py={2}>
            No presets match your search
          </Text>
        )}
      </VStack>
    </Panel>
  );
};
