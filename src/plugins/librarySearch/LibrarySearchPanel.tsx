import React, { useMemo, useContext, useState, useCallback } from 'react';
import {
    VStack,
    Text,
    Box,
    SimpleGrid,
    HStack,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider,
    Checkbox,
    IconButton,
} from '@chakra-ui/react';
import { Search, MoreVertical } from 'lucide-react';
import type { CanvasStore } from '../../store/canvasStore';
import { ClipItemCard } from '../clipping/ClipItemCard';
import { MarkerItemCard } from '../markers/MarkerItemCard';
import { SymbolItemCard } from '../symbols/SymbolItemCard';
import { FilterItemCard } from '../libraryFilters/FilterItemCard';
import { GradientItemCard } from '../gradients/GradientItemCard';
import { PatternItemCard } from '../patterns/PatternItemCard';
import { MaskItemCard } from '../masks/MaskItemCard';
import { AnimationItemCard } from '../animationLibrary/AnimationItemCard';
import type { ClipDefinition } from '../clipping/slice';
import type { MarkerDefinition } from '../markers/slice';
import type { SymbolDefinition } from '../symbols/slice';
import type { FilterDefinition } from '../libraryFilters/slice';
import type { GradientDef } from '../gradients/slice';
import type { PatternDef } from '../patterns/slice';
import type { MaskDefinition } from '../masks/types';
import type { AnimationPreset } from '../animationLibrary/types';
import { Panel } from '../../ui/Panel';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { SidebarPanelScopeContext } from '../../contexts/sidebarPanelState';
import { useThemeColors } from '../../hooks';
import type { UiSlice } from '../../store/slices/uiSlice';

// Import slice types
import type { ClippingPluginSlice } from '../clipping/slice';
import type { MarkersSlice } from '../markers/slice';
import type { SymbolPluginSlice } from '../symbols/slice';
import type { LibraryFiltersSlice } from '../libraryFilters/slice';
import type { GradientsSlice } from '../gradients/slice';
import type { PatternsSlice } from '../patterns/slice';
import type { MasksSlice } from '../masks/types';
import type { AnimationLibrarySlice } from '../animationLibrary/types';

// Selector to get all library items
const selectAllLibraryItems = (state: CanvasStore) => {
    const clippingSlice = state as CanvasStore & ClippingPluginSlice;
    const markersSlice = state as CanvasStore & MarkersSlice;
    const symbolsSlice = state as CanvasStore & SymbolPluginSlice;
    const filtersSlice = state as CanvasStore & LibraryFiltersSlice;
    const gradientsSlice = state as CanvasStore & GradientsSlice;
    const patternsSlice = state as CanvasStore & PatternsSlice;
    const masksSlice = state as CanvasStore & MasksSlice;
    const animationLibrarySlice = state as CanvasStore & AnimationLibrarySlice;

    return {
        clips: clippingSlice.clips ?? [],
        markers: markersSlice.markers ?? [],
        symbols: symbolsSlice.symbols ?? [],
        filters: filtersSlice.libraryFilters ?? [],
        gradients: gradientsSlice.gradients ?? [],
        patterns: patternsSlice.patterns ?? [],
        masks: masksSlice.masks ?? [],
    animations: animationLibrarySlice.animationPresets ?? [],
};
};

export const LibrarySearchPanel: React.FC = () => {
    const {
        clips,
        markers,
        symbols,
        filters,
        gradients,
        patterns,
        masks,
        animations,
    } = useShallowCanvasSelector(selectAllLibraryItems);
    const normalizedMasks = useMemo(() => masks.map((m) => ({ ...m, name: m.name ?? m.id })), [masks]);

    const selectSearchHandlers = (state: CanvasStore) => {
        const gradientsSlice = state as CanvasStore & GradientsSlice;
        const patternsSlice = state as CanvasStore & PatternsSlice;
        const filtersSlice = state as CanvasStore & LibraryFiltersSlice;
        const clippingSlice = state as CanvasStore & ClippingPluginSlice;
        const markersSlice = state as CanvasStore & MarkersSlice;
        const symbolsSlice = state as CanvasStore & SymbolPluginSlice;
        const masksSlice = state as CanvasStore & MasksSlice;
        const animationLibrarySlice = state as CanvasStore & AnimationLibrarySlice;

        return {
            selectGradientFromSearch: gradientsSlice.selectFromSearch,
            selectPatternFromSearch: patternsSlice.selectFromSearch,
            selectFilterFromSearch: filtersSlice.selectFromSearch,
            selectClipFromSearch: clippingSlice.selectFromSearch,
            selectMarkerFromSearch: markersSlice.selectFromSearch,
            selectSymbolFromSearch: symbolsSlice.selectFromSearch,
            selectMaskFromSearch: masksSlice.selectFromSearch,
            selectAnimationFromSearch: animationLibrarySlice.selectFromSearch,
            setOpenSidebarPanelKey: state.setOpenSidebarPanelKey,
            setLeftOpenSidebarPanelKey: state.setLeftOpenSidebarPanelKey,
            librarySearchQuery: state.librarySearchQuery,
            setLibrarySearchQuery: state.setLibrarySearchQuery,
        };
    };

    const {
        selectGradientFromSearch,
        selectPatternFromSearch,
        selectFilterFromSearch,
        selectClipFromSearch,
        selectMarkerFromSearch,
        selectSymbolFromSearch,
        selectMaskFromSearch,
        selectAnimationFromSearch,
        setOpenSidebarPanelKey: setOpenRightPanelKey,
        setLeftOpenSidebarPanelKey,
        librarySearchQuery,
        setLibrarySearchQuery,
    } = useShallowCanvasSelector(selectSearchHandlers);

    // Determine which sidebar scope we're in to use the correct setOpenPanelKey function
    const scope = useContext(SidebarPanelScopeContext);
    const setOpenPanelKey = scope === 'left' ? setLeftOpenSidebarPanelKey : setOpenRightPanelKey;

    const hasQuery = librarySearchQuery.trim().length > 0;

    const TYPE_LABELS = {
        clips: 'Clips',
        markers: 'Markers',
        symbols: 'Symbols',
        filters: 'Filters',
        gradients: 'Gradients',
        patterns: 'Patterns',
        masks: 'Masks',
        animations: 'Animations',
    } as const;

    type TypeKey = keyof typeof TYPE_LABELS;

    const storedEnabledTypes = useShallowCanvasSelector((state) =>
        (state as CanvasStore & UiSlice).librarySearchEnabledTypes
    ) as Record<TypeKey, boolean> | undefined;
    const setStoredEnabledTypes = useShallowCanvasSelector((state) =>
        (state as CanvasStore & UiSlice).setLibrarySearchEnabledTypes
    );
    const [enabledTypes, setEnabledTypes] = useState<Record<TypeKey, boolean>>(
        storedEnabledTypes ?? {
            clips: true,
            markers: true,
            symbols: true,
            filters: true,
            gradients: true,
            patterns: true,
            masks: true,
            animations: true,
        }
    );

    const persistEnabledTypes = useCallback((next: Record<TypeKey, boolean>) => {
        setEnabledTypes(next);
        setStoredEnabledTypes?.(next);
    }, [setStoredEnabledTypes]);

    const toggleType = useCallback((key: TypeKey) => {
        setEnabledTypes((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            setStoredEnabledTypes?.(next);
            return next;
        });
    }, [setStoredEnabledTypes]);

    const selectAll = useCallback(() => {
        persistEnabledTypes({
            clips: true,
            markers: true,
            symbols: true,
            filters: true,
            gradients: true,
            patterns: true,
            masks: true,
            animations: true,
        });
    }, [persistEnabledTypes]);

    const deselectAll = useCallback(() => {
        persistEnabledTypes({
            clips: false,
            markers: false,
            symbols: false,
            filters: false,
            gradients: false,
            patterns: false,
            masks: false,
            animations: false,
        });
    }, [persistEnabledTypes]);

    const results = useMemo(() => {
        if (!hasQuery) return null;
        const q = librarySearchQuery.toLowerCase();

        return {
            clips: enabledTypes.clips ? clips.filter(i => i.name.toLowerCase().includes(q)) : [],
            markers: enabledTypes.markers ? markers.filter(i => i.name.toLowerCase().includes(q)) : [],
            symbols: enabledTypes.symbols ? symbols.filter(i => i.name.toLowerCase().includes(q)) : [],
            filters: enabledTypes.filters ? filters.filter(i => i.name.toLowerCase().includes(q)) : [],
            gradients: enabledTypes.gradients ? gradients.filter(i => i.name.toLowerCase().includes(q)) : [],
            patterns: enabledTypes.patterns ? patterns.filter(i => i.name.toLowerCase().includes(q)) : [],
            masks: enabledTypes.masks ? normalizedMasks.filter(i => i.name.toLowerCase().includes(q)) : [],
            animations: enabledTypes.animations ? animations.filter(i => i.name.toLowerCase().includes(q)) : [],
        };
    }, [hasQuery, librarySearchQuery, clips, markers, symbols, filters, gradients, patterns, normalizedMasks, animations, enabledTypes]);

    const themeColors = useThemeColors();
    const menuListProps = {
        bg: themeColors.menu.bg,
        border: '1px solid',
        borderColor: themeColors.menu.borderColor,
        borderRadius: 'lg',
        boxShadow: 'lg',
        py: 1,
    };

    const menuItemProps = {
        color: themeColors.menu.iconColor,
        _hover: { bg: themeColors.menu.hoverBg },
        _focus: { outline: 'none', boxShadow: 'none', bg: 'transparent' },
        _active: { outline: 'none', bg: 'transparent' },
        fontSize: '14px',
        fontWeight: 'medium',
        px: 3,
        py: 2,
        gap: 2,
    };


    const renderResultItem = (item: { id: string; name: string }, type: string) => {
        switch (type) {
            case 'Clips':
                return <ClipItemCard clip={item as unknown as ClipDefinition} onClick={() => {
                    setOpenPanelKey?.('sidebar:library:clipping');
                    setTimeout(() => selectClipFromSearch?.(item.id), 60);
                }} />;
            case 'Markers':
                return <MarkerItemCard marker={item as unknown as MarkerDefinition} onClick={() => {
                    setOpenPanelKey?.('sidebar:library:markers');
                    setTimeout(() => selectMarkerFromSearch?.(item.id), 60);
                }} />;
            case 'Symbols':
                return <SymbolItemCard symbol={item as unknown as SymbolDefinition} onClick={() => {
                    setOpenPanelKey?.('sidebar:library:symbols');
                    setTimeout(() => selectSymbolFromSearch?.(item.id), 60);
                }} />;
            case 'Filters':
                return <FilterItemCard filter={item as unknown as FilterDefinition} onClick={() => {
                    setOpenPanelKey?.('sidebar:library:filters');
                    setTimeout(() => selectFilterFromSearch?.(item.id), 60);
                }} />;
            case 'Gradients':
                return <GradientItemCard gradient={item as unknown as GradientDef} onClick={() => {
                    setOpenPanelKey?.('sidebar:library:gradients');
                    setTimeout(() => selectGradientFromSearch?.(item.id), 60);
                }} />;
            case 'Patterns':
                return <PatternItemCard pattern={item as unknown as PatternDef} onClick={() => {
                    setOpenPanelKey?.('sidebar:library:patterns');
                    setTimeout(() => selectPatternFromSearch?.(item.id), 60);
                }} />;
            case 'Masks':
                return (
                    <Box onClick={() => {
                        setOpenPanelKey?.('sidebar:library:masks');
                        setTimeout(() => selectMaskFromSearch?.(item.id), 60);
                    }} cursor="pointer">
                        <MaskItemCard mask={item as unknown as MaskDefinition} isSelected={false} />
                    </Box>
                );
            case 'Animations':
                return (
                    <Box onClick={() => {
                        setOpenPanelKey?.('sidebar:library:animations');
                        setTimeout(() => selectAnimationFromSearch?.(item.id), 60);
                    }} cursor="pointer">
                        <AnimationItemCard preset={item as unknown as AnimationPreset} isSelected={false} />
                    </Box>
                );
            default:
                return null;
        }
    };

    const renderResultSection = (title: string, items: { id: string; name: string }[]) => {
        if (items.length === 0) return null;
        return (
            <Box>
                <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={0} textTransform="uppercase">
                    {title} ({items.length})
                </Text>
                <SimpleGrid columns={2} spacing={1}>
                    {items.map((item, idx) => {
                        const spanFull = items.length % 2 === 1 && idx === items.length - 1;
                        return (
                            <Box key={item.id} w="100%" gridColumn={spanFull ? 'span 2' : 'auto'}>
                                {renderResultItem(item, title)}
                            </Box>
                        );
                    })}
                </SimpleGrid>
            </Box>
        );
    };

    return (
        <Panel hideHeader isCollapsible={false} defaultOpen={true}>
            <VStack spacing={4} align="stretch">
                <Box pt={1}>
                    <HStack spacing={2}>
                        <PanelTextInput
                            placeholder="Search library..."
                            value={librarySearchQuery}
                            onChange={setLibrarySearchQuery}
                            leftIcon={<Search size={14} />}
                            width="100%"
                        />
                        <Menu placement="bottom-end">
                            <MenuButton
                                as={IconButton}
                                aria-label="Filter library types"
                                icon={<MoreVertical size={14} />}
                                variant="ghost"
                                size="xs"
                                borderRadius="full"
                                minW="24px"
                                h="24px"
                                p={0}
                            />
                            <MenuList minW="220px" {...menuListProps}>
                                <MenuItem {...menuItemProps} closeOnSelect={false} onClick={(e) => { e.stopPropagation(); selectAll(); }}>Select all</MenuItem>
                                <MenuItem {...menuItemProps} closeOnSelect={false} onClick={(e) => { e.stopPropagation(); deselectAll(); }}>Deselect all</MenuItem>
                                <MenuDivider />
                                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                                    <MenuItem
                                        {...menuItemProps}
                                        key={key}
                                        closeOnSelect={false}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleType(key as TypeKey);
                                        }}
                                    >
                                        <Checkbox isChecked={enabledTypes[key as TypeKey]} pointerEvents="none" mr={2} />
                                        {label}
                                    </MenuItem>
                                ))}
                            </MenuList>
                        </Menu>
                    </HStack>
                </Box>
                {results && (
                    <VStack spacing={2} align="stretch" overflowY="auto" flex={1}>
                        {renderResultSection('Clips', results.clips)}
                        {renderResultSection('Markers', results.markers)}
                        {renderResultSection('Symbols', results.symbols)}
                        {renderResultSection('Filters', results.filters)}
                        {renderResultSection('Gradients', results.gradients)}
                        {renderResultSection('Patterns', results.patterns)}
                        {renderResultSection('Masks', results.masks)}
                        {renderResultSection('Animations', results.animations)}
                        {Object.values(results).every(r => r.length === 0) && librarySearchQuery && (
                            <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                                No results found
                            </Text>
                        )}
                    </VStack>
                )}
            </VStack>
        </Panel>
    );
};
