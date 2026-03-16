import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Divider,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  Wrap,
  WrapItem,
  useColorModeValue,
} from '@chakra-ui/react';
import { Copy, Library, MousePointer, Search } from 'lucide-react';
import type { CanvasStore } from '../../store/canvasStore';
import { useShallowCanvasSelector } from '../../hooks/useShallowCanvasSelector';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { LibrarySectionHeader } from '../../ui/LibrarySectionHeader';
import { useTransientActionFeedback } from '../../hooks/useTransientActionFeedback';
import { ActionButtonGroup, StatusMessage } from '../../ui/PresetButtonGrid';
import type { IconifyLibrarySlice } from './slice';
import { IconifyPreview } from './IconifyPreview';
import {
  buildCollectionUrl,
  buildCollectionsUrl,
  buildSearchUrl,
  filterCollections,
  humanizeIconName,
  ICONS_PER_PAGE,
  MAX_SEARCH_RESULTS,
  parseCollectionResponse,
  parseCollectionsResponse,
  parseSearchResponse,
  pickFeaturedCollections,
  type IconifyCollectionDetail,
  type IconifyCollectionSummary,
  type IconifySearchResult,
} from './iconifyApi';
import {
  getCollectionsCacheFreshness,
  isCollectionsCacheDifferent,
  readCollectionsCache,
  shouldRevalidateCollectionsCache,
  writeCollectionsCache,
} from './collectionsCache';
import { logger } from '../../utils/logger';

type IconGridItem = {
  id: string;
  prefix: string;
  iconName: string;
  name: string;
  collectionName: string;
};

const selectIconifyPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & IconifyLibrarySlice;

  return {
    iconifyLibrary: slice.iconifyLibrary,
    setIconifyQuery: slice.setIconifyQuery,
    setIconifyCollectionQuery: slice.setIconifyCollectionQuery,
    setIconifyActiveCollectionPrefix: slice.setIconifyActiveCollectionPrefix,
    setIconifySelectedIconId: slice.setIconifySelectedIconId,
    setIconifyPlacingIconId: slice.setIconifyPlacingIconId,
    setIconifySearchPage: slice.setIconifySearchPage,
    setIconifyBrowsePage: slice.setIconifyBrowsePage,
  };
};

const IconifyIconCard: React.FC<{
  item: IconGridItem;
  isSelected: boolean;
  isPlacementActive: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}> = ({ item, isSelected, isPlacementActive, onClick, onDoubleClick }) => {
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const selectedBorderColor = useColorModeValue('gray.900', 'gray.100');
  const placementBorderColor = useColorModeValue('orange.500', 'orange.300');
  const previewBg = useColorModeValue(
    'linear-gradient(180deg, rgba(244,239,231,0.95) 0%, rgba(234,228,218,0.95) 100%)',
    'linear-gradient(180deg, rgba(52,50,45,0.98) 0%, rgba(37,35,31,0.98) 100%)',
  );
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const titleColor = useColorModeValue('gray.800', 'gray.100');
  const cardBg = useColorModeValue('white', 'gray.800');
  const hoverBorderColor = useColorModeValue('gray.400', 'whiteAlpha.400');
  const resolvedBorderColor = isPlacementActive
    ? placementBorderColor
    : isSelected
      ? selectedBorderColor
      : borderColor;

  return (
    <Box
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={`${item.id}\n${item.collectionName}`}
      cursor="pointer"
      borderWidth="1px"
      borderColor={resolvedBorderColor}
      borderRadius="md"
      overflow="hidden"
      bg={cardBg}
      transition="all 0.18s ease"
      _hover={{
        borderColor: isPlacementActive
          ? placementBorderColor
          : isSelected
            ? selectedBorderColor
            : hoverBorderColor,
        transform: 'translateY(-1px)',
        boxShadow: 'sm',
      }}
    >
      <Box
        h="54px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgImage={previewBg}
        bgSize="cover"
        borderBottomWidth="1px"
        borderBottomColor={resolvedBorderColor}
      >
        <IconifyPreview
          prefix={item.prefix}
          iconName={item.iconName}
          label={item.name}
          size={36}
        />
      </Box>
      <Box px={1.5} py={1}>
        <Text fontSize="10px" fontWeight="semibold" color={titleColor} noOfLines={1}>
          {item.name}
        </Text>
        <Text fontSize="9px" color={mutedText} noOfLines={1}>
          {item.prefix}
        </Text>
      </Box>
    </Box>
  );
};

const paginateItems = <T,>(items: T[], page: number): T[] => {
  const start = page * ICONS_PER_PAGE;
  return items.slice(start, start + ICONS_PER_PAGE);
};

export const IconifyLibraryPanel: React.FC = () => {
  const {
    iconifyLibrary,
    setIconifyQuery,
    setIconifyCollectionQuery,
    setIconifyActiveCollectionPrefix,
    setIconifySelectedIconId,
    setIconifyPlacingIconId,
    setIconifySearchPage,
    setIconifyBrowsePage,
  } = useShallowCanvasSelector(selectIconifyPanelState);
  const deferredQuery = useDeferredValue(iconifyLibrary.query.trim());
  const deferredCollectionQuery = useDeferredValue(iconifyLibrary.collectionQuery.trim());
  const [collections, setCollections] = useState<IconifyCollectionSummary[]>([]);
  const [collectionDetails, setCollectionDetails] = useState<Record<string, IconifyCollectionDetail>>({});
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<IconifySearchResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingCollectionPrefix, setLoadingCollectionPrefix] = useState<string | null>(null);
  const [collectionErrors, setCollectionErrors] = useState<Record<string, string>>({});
  const [isCopyFeedbackActive, triggerCopyFeedback] = useTransientActionFeedback();
  const collectionTextColor = useColorModeValue('gray.600', 'gray.300');
  const subtleTextColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const detailsBg = useColorModeValue('rgba(248, 246, 241, 0.96)', 'rgba(39, 39, 36, 0.96)');
  const activeAccentBg = useColorModeValue('gray.900', 'gray.100');
  const activeAccentColor = useColorModeValue('white', 'gray.900');
  const activeAccentBorder = useColorModeValue('gray.900', 'gray.100');
  const activeAccentHoverBg = useColorModeValue('gray.700', 'gray.300');
  const activeAccentHoverBorder = useColorModeValue('gray.700', 'gray.300');
  const featuredChipHoverBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const featuredChipHoverBorder = useColorModeValue('gray.500', 'whiteAlpha.500');
  const hoverBorderColor = useColorModeValue('gray.400', 'whiteAlpha.400');
  const detailsPreviewBg = useColorModeValue('rgba(255,255,255,0.78)', 'rgba(17,17,16,0.65)');
  const activeCollectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const cachedEntry = readCollectionsCache();
    const cacheFreshness = cachedEntry ? getCollectionsCacheFreshness(cachedEntry) : 'expired';
    const hasUsableCache = Boolean(cachedEntry && cacheFreshness !== 'expired');

    if (cachedEntry && cacheFreshness !== 'expired') {
      setCollections(cachedEntry.collections);
      setCollectionsLoading(false);
    } else {
      setCollectionsLoading(true);
    }

    const loadCollections = async () => {
      setCollectionsError(null);
      const shouldShowBusyState = !hasUsableCache;
      if (shouldShowBusyState) {
        setCollectionsLoading(true);
      }

      try {
        const response = await fetch(buildCollectionsUrl(), { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Collections request failed with ${response.status}`);
        }

        const payload = await response.json();
        const parsedCollections = parseCollectionsResponse(payload);
        const previousCache = readCollectionsCache();

        if (isCollectionsCacheDifferent(previousCache, parsedCollections) || collections.length === 0) {
          setCollections(parsedCollections);
        }
        writeCollectionsCache(parsedCollections);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logger.error('Failed to load Iconify collections', error);
        if (!hasUsableCache) {
          setCollectionsError('No se pudieron cargar las colecciones de Iconify.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCollectionsLoading(false);
        }
      }
    };

    if (
      !cachedEntry ||
      cacheFreshness === 'expired' ||
      shouldRevalidateCollectionsCache(cachedEntry)
    ) {
      void loadCollections();
    }

    return () => controller.abort();
  }, [collections.length]);

  useEffect(() => {
    if (iconifyLibrary.activeCollectionPrefix || collections.length === 0) {
      return;
    }

    const defaultCollection = pickFeaturedCollections(collections, 1)[0] ?? collections[0];
    if (defaultCollection) {
      setIconifyActiveCollectionPrefix(defaultCollection.prefix);
    }
  }, [collections, iconifyLibrary.activeCollectionPrefix, setIconifyActiveCollectionPrefix]);

  useEffect(() => {
    if (!deferredQuery) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadSearchResults = async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const response = await fetch(
          buildSearchUrl(deferredQuery, { limit: MAX_SEARCH_RESULTS }),
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Search request failed with ${response.status}`);
        }

        const payload = await response.json();
        const parsed = parseSearchResponse(payload);
        setSearchResults(parsed.items);
        setSearchTotal(parsed.total);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logger.error('Failed to search Iconify icons', error, { query: deferredQuery });
        setSearchError('No se pudo completar la busqueda de iconos.');
        setSearchResults([]);
        setSearchTotal(0);
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    };

    void loadSearchResults();

    return () => controller.abort();
  }, [deferredQuery]);

  useEffect(() => {
    const prefix = iconifyLibrary.activeCollectionPrefix;
    if (!prefix || collectionDetails[prefix]) {
      return;
    }

    const controller = new AbortController();

    const loadCollectionDetail = async () => {
      setLoadingCollectionPrefix(prefix);

      try {
        const response = await fetch(buildCollectionUrl(prefix), { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Collection request failed with ${response.status}`);
        }

        const payload = await response.json();
        const detail = parseCollectionResponse(payload, prefix);
        if (!detail) {
          throw new Error('Collection payload could not be parsed');
        }

        setCollectionErrors((current) => {
          const next = { ...current };
          delete next[prefix];
          return next;
        });
        setCollectionDetails((current) => ({
          ...current,
          [prefix]: detail,
        }));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logger.error('Failed to load Iconify collection detail', error, { prefix });
        setCollectionErrors((current) => ({
          ...current,
          [prefix]: 'No se pudo cargar esa coleccion de Iconify.',
        }));
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCollectionPrefix((current) => (current === prefix ? null : current));
        }
      }
    };

    void loadCollectionDetail();

    return () => controller.abort();
  }, [collectionDetails, iconifyLibrary.activeCollectionPrefix]);

  const collectionsByPrefix = useMemo(
    () => new Map(collections.map((collection) => [collection.prefix, collection])),
    [collections],
  );
  const featuredCollections = useMemo(() => pickFeaturedCollections(collections), [collections]);
  const visibleCollections = useMemo(
    () => filterCollections(collections, deferredCollectionQuery),
    [collections, deferredCollectionQuery],
  );
  const activeCollectionDetail = iconifyLibrary.activeCollectionPrefix
    ? collectionDetails[iconifyLibrary.activeCollectionPrefix] ?? null
    : null;
  const browseItems = useMemo<IconGridItem[]>(() => {
    if (!activeCollectionDetail) {
      return [];
    }

    return activeCollectionDetail.icons.map((iconName) => ({
      id: `${activeCollectionDetail.prefix}:${iconName}`,
      prefix: activeCollectionDetail.prefix,
      iconName,
      name: humanizeIconName(iconName),
      collectionName: activeCollectionDetail.name,
    }));
  }, [activeCollectionDetail]);
  const searchItems = useMemo<IconGridItem[]>(() => (
    searchResults.map((item) => ({
      id: item.id,
      prefix: item.prefix,
      iconName: item.iconName,
      name: item.name,
      collectionName: item.collectionName,
    }))
  ), [searchResults]);
  const isSearchMode = deferredQuery.length > 0;
  const allItems = isSearchMode ? searchItems : browseItems;
  const rawPage = isSearchMode ? iconifyLibrary.searchPage : iconifyLibrary.browsePage;
  const maxPage = Math.max(0, Math.ceil(allItems.length / ICONS_PER_PAGE) - 1);
  const page = Math.min(rawPage, maxPage);
  const visibleItems = useMemo(() => paginateItems(allItems, page), [allItems, page]);

  useEffect(() => {
    if (page === rawPage) {
      return;
    }

    if (isSearchMode) {
      setIconifySearchPage(page);
      return;
    }

    setIconifyBrowsePage(page);
  }, [
    isSearchMode,
    page,
    rawPage,
    setIconifyBrowsePage,
    setIconifySearchPage,
  ]);

  useEffect(() => {
    activeCollectionRef.current?.scrollIntoView({
      block: 'nearest',
    });
  }, [iconifyLibrary.activeCollectionPrefix]);

  const selectedItem = useMemo(() => {
    if (iconifyLibrary.selectedIconId) {
      const matchedVisible = visibleItems.find((item) => item.id === iconifyLibrary.selectedIconId);
      if (matchedVisible) {
        return matchedVisible;
      }
    }

    return visibleItems[0] ?? null;
  }, [iconifyLibrary.selectedIconId, visibleItems]);

  useEffect(() => {
    const selectedId = selectedItem?.id ?? null;
    if (!iconifyLibrary.placingIconId || iconifyLibrary.placingIconId === selectedId) {
      return;
    }

    setIconifyPlacingIconId?.(null);
  }, [iconifyLibrary.placingIconId, selectedItem?.id, setIconifyPlacingIconId]);

  const selectedCollection = selectedItem
    ? collectionsByPrefix.get(selectedItem.prefix)
      ?? (activeCollectionDetail?.prefix === selectedItem.prefix ? activeCollectionDetail : null)
    : null;

  const handleCopyName = useCallback(async () => {
    if (!selectedItem || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedItem.id);
      triggerCopyFeedback();
    } catch (error) {
      logger.error('Failed to copy Iconify icon name', error, { iconId: selectedItem.id });
    }
  }, [selectedItem, triggerCopyFeedback]);

  const resultLabel = isSearchMode
    ? `${searchResults.length}${searchTotal > searchResults.length ? ` / ${searchTotal}` : ''}`
    : `${allItems.length}`;
  const sectionTitle = isSearchMode
    ? 'Results'
    : activeCollectionDetail?.name ?? 'Collection';
  const isBusy = isSearchMode ? searchLoading : loadingCollectionPrefix === iconifyLibrary.activeCollectionPrefix;
  const activeError = isSearchMode
    ? searchError
    : iconifyLibrary.activeCollectionPrefix
      ? collectionErrors[iconifyLibrary.activeCollectionPrefix] ?? null
      : null;
  const placementActive = Boolean(selectedItem && iconifyLibrary.placingIconId === selectedItem.id);

  const handleTogglePlacement = useCallback(() => {
    if (!selectedItem || iconifyLibrary.isPlacementPending) {
      return;
    }

    if (placementActive) {
      setIconifyPlacingIconId?.(null);
      return;
    }

    setIconifyPlacingIconId?.(selectedItem.id);
  }, [
    iconifyLibrary.isPlacementPending,
    placementActive,
    selectedItem,
    setIconifyPlacingIconId,
  ]);

  const handleCardDoubleClick = useCallback((item: IconGridItem) => {
    if (iconifyLibrary.isPlacementPending) {
      return;
    }

    setIconifySelectedIconId(item.id);
    setIconifyPlacingIconId?.(item.id);
  }, [
    iconifyLibrary.isPlacementPending,
    setIconifyPlacingIconId,
    setIconifySelectedIconId,
  ]);

  return (
    <Panel title="Iconify" defaultOpen={false} disableExpandedFrame panelKey="sidebar:library:iconify">
      <VStack spacing={2} align="stretch">
        <LibrarySectionHeader
          title="Find"
          action={
            isSearchMode ? (
              <Text fontSize="10px" color={subtleTextColor}>
                {resultLabel}
              </Text>
            ) : null
          }
        />
        <Box px="2px">
          <PanelTextInput
            value={iconifyLibrary.query}
            onChange={setIconifyQuery}
            placeholder="Search the Iconify API"
            width="full"
            height="26px"
            leftIcon={<Search size={13} />}
          />
        </Box>

        {!isSearchMode && (
          <>
            <LibrarySectionHeader title="Featured" />
            <Wrap spacing={1}>
              {featuredCollections.map((collection) => {
                const isActive = collection.prefix === iconifyLibrary.activeCollectionPrefix;
                return (
                  <WrapItem key={collection.prefix}>
                    <PanelStyledButton
                      onClick={() => setIconifyActiveCollectionPrefix(collection.prefix)}
                      bg={isActive ? activeAccentBg : 'transparent'}
                      color={isActive ? activeAccentColor : undefined}
                      borderColor={isActive ? activeAccentBorder : borderColor}
                      _hover={{
                        bg: isActive ? activeAccentHoverBg : featuredChipHoverBg,
                        borderColor: isActive ? activeAccentHoverBorder : featuredChipHoverBorder,
                        color: isActive ? activeAccentColor : undefined,
                      }}
                      _dark={
                        {
                          bg: isActive ? activeAccentBg : 'transparent',
                          color: isActive ? activeAccentColor : undefined,
                          borderColor: isActive ? activeAccentBorder : borderColor,
                          _hover: {
                            bg: isActive ? activeAccentHoverBg : featuredChipHoverBg,
                            borderColor: isActive ? activeAccentHoverBorder : featuredChipHoverBorder,
                            color: isActive ? activeAccentColor : undefined,
                          },
                        }
                      }
                    >
                      {collection.name}
                    </PanelStyledButton>
                  </WrapItem>
                );
              })}
            </Wrap>

            <LibrarySectionHeader
              title="Collections"
              action={
                <Text fontSize="10px" color={subtleTextColor}>
                  {visibleCollections.length}
                </Text>
              }
            />
            <Box px="2px">
              <PanelTextInput
                value={iconifyLibrary.collectionQuery}
                onChange={setIconifyCollectionQuery}
                placeholder="Filter icon sets"
                width="full"
                height="24px"
                leftIcon={<Library size={12} />}
              />
            </Box>
            <VStack
              spacing={1}
              align="stretch"
              maxH="148px"
              overflowY="auto"
              pr={0.5}
            >
              {collectionsLoading && collections.length === 0 ? (
                <HStack py={3} justify="center">
                  <Spinner size="sm" />
                  <Text fontSize="11px" color={subtleTextColor}>
                    Loading collections...
                  </Text>
                </HStack>
              ) : collectionsError ? (
                <Text fontSize="11px" color="red.400">
                  {collectionsError}
                </Text>
              ) : visibleCollections.length === 0 ? (
                <Text fontSize="11px" color={subtleTextColor}>
                  No collections match that filter.
                </Text>
              ) : (
                visibleCollections.map((collection) => {
                  const isActive = collection.prefix === iconifyLibrary.activeCollectionPrefix;
                  return (
                    <Box
                      key={collection.prefix}
                      ref={isActive ? activeCollectionRef : undefined}
                      onClick={() => setIconifyActiveCollectionPrefix(collection.prefix)}
                      cursor="pointer"
                      borderWidth="1px"
                      borderColor={isActive ? activeAccentBorder : borderColor}
                      borderRadius="md"
                      px={2}
                      py={1.5}
                      bg={isActive ? detailsBg : 'transparent'}
                      transition="all 0.18s ease"
                      _hover={{
                        borderColor: hoverBorderColor,
                      }}
                    >
                      <HStack justify="space-between" align="flex-start">
                        <VStack spacing={0} align="stretch" minW={0}>
                          <Text fontSize="11px" fontWeight="semibold" noOfLines={1}>
                            {collection.name}
                          </Text>
                          <Text fontSize="10px" color={subtleTextColor} noOfLines={1}>
                            {collection.prefix}
                          </Text>
                        </VStack>
                        <Text fontSize="10px" color={collectionTextColor}>
                          {collection.total}
                        </Text>
                      </HStack>
                    </Box>
                  );
                })
              )}
            </VStack>
          </>
        )}

        <Divider borderColor={borderColor} />

        <LibrarySectionHeader
          title={sectionTitle}
          action={
            allItems.length > 0 ? (
              <Text fontSize="10px" color={subtleTextColor}>
                {page + 1}/{Math.max(1, maxPage + 1)}
              </Text>
            ) : null
          }
        />

        {isBusy ? (
          <HStack py={6} justify="center">
            <Spinner size="sm" />
            <Text fontSize="11px" color={subtleTextColor}>
              Loading icons...
            </Text>
          </HStack>
        ) : activeError ? (
          <Text fontSize="11px" color="red.400">
            {activeError}
          </Text>
        ) : !isSearchMode && !activeCollectionDetail && iconifyLibrary.activeCollectionPrefix ? (
          <Text fontSize="11px" color={subtleTextColor}>
            Loading {iconifyLibrary.activeCollectionPrefix}...
          </Text>
        ) : visibleItems.length === 0 ? (
          <Text fontSize="11px" color={subtleTextColor}>
            {isSearchMode
              ? 'No icons found for that query.'
              : 'Pick a collection to browse its icons.'}
          </Text>
        ) : (
          <SimpleGrid columns={3} gap={1.5}>
            {visibleItems.map((item) => (
              <IconifyIconCard
                key={item.id}
                item={item}
                isSelected={item.id === selectedItem?.id}
                isPlacementActive={iconifyLibrary.placingIconId === item.id}
                onClick={() => setIconifySelectedIconId(item.id)}
                onDoubleClick={() => handleCardDoubleClick(item)}
              />
            ))}
          </SimpleGrid>
        )}

        {allItems.length > ICONS_PER_PAGE && (
          <HStack justify="space-between">
            <PanelStyledButton
              onClick={() => {
                if (isSearchMode) {
                  setIconifySearchPage(Math.max(0, page - 1));
                  return;
                }
                setIconifyBrowsePage(Math.max(0, page - 1));
              }}
              isDisabled={page <= 0}
            >
              Prev
            </PanelStyledButton>
            <Text fontSize="10px" color={subtleTextColor}>
              {page * ICONS_PER_PAGE + 1}-{Math.min((page + 1) * ICONS_PER_PAGE, allItems.length)}
            </Text>
            <PanelStyledButton
              onClick={() => {
                if (isSearchMode) {
                  setIconifySearchPage(Math.min(maxPage, page + 1));
                  return;
                }
                setIconifyBrowsePage(Math.min(maxPage, page + 1));
              }}
              isDisabled={page >= maxPage}
            >
              Next
            </PanelStyledButton>
          </HStack>
        )}

        {selectedItem && (
          <>
            <Divider borderColor={borderColor} />
            <LibrarySectionHeader title="Details" />
            <Box
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              p={2}
              bg={detailsBg}
            >
              <HStack align="flex-start" spacing={2}>
                <Box
                  w="58px"
                  h="58px"
                  borderRadius="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg={detailsPreviewBg}
                  borderWidth="1px"
                  borderColor={borderColor}
                  flexShrink={0}
                >
                  <IconifyPreview
                    prefix={selectedItem.prefix}
                    iconName={selectedItem.iconName}
                    label={selectedItem.name}
                    size={42}
                  />
                </Box>
                <VStack spacing={1} align="stretch" minW={0}>
                  <Text fontSize="12px" fontWeight="semibold" noOfLines={1}>
                    {selectedItem.name}
                  </Text>
                  <Text fontSize="10px" color={subtleTextColor} noOfLines={1}>
                    {selectedItem.id}
                  </Text>
                  <Text fontSize="10px" color={collectionTextColor} noOfLines={1}>
                    {selectedCollection?.name ?? selectedItem.collectionName}
                  </Text>
                  {selectedCollection?.license && (
                    <Text fontSize="10px" color={collectionTextColor} noOfLines={1}>
                      {selectedCollection.license.spdx ?? selectedCollection.license.title ?? 'License'}
                    </Text>
                  )}
                  {selectedCollection?.author?.name && (
                    <Text fontSize="10px" color={collectionTextColor} noOfLines={1}>
                      {selectedCollection.author.name}
                    </Text>
                  )}
                </VStack>
              </HStack>
            </Box>

            <LibrarySectionHeader title="Actions" />
            {selectedItem ? (
              <StatusMessage>
                {iconifyLibrary.isPlacementPending
                  ? `Placing "${selectedItem.name}"...`
                  : placementActive
                    ? `Click canvas to place "${selectedItem.name}", or click and drag to set the size. Press Escape to cancel.`
                    : `Enable placement to insert "${selectedItem.name}" with a canvas click.`}
              </StatusMessage>
            ) : (
              <StatusMessage>
                Select an icon to enable placement.
              </StatusMessage>
            )}
            <ActionButtonGroup>
              <PanelStyledButton
                onClick={handleTogglePlacement}
                isDisabled={!selectedItem || iconifyLibrary.isPlacementPending}
                leftIcon={<MousePointer size={11} />}
                w="full"
              >
                {iconifyLibrary.isPlacementPending
                  ? 'Placing...'
                  : placementActive
                    ? 'Disable placement'
                    : 'Enable placement'}
              </PanelStyledButton>
              <PanelStyledButton
                onClick={() => {
                  void handleCopyName();
                }}
                leftIcon={<Copy size={11} />}
                w="full"
              >
                {isCopyFeedbackActive ? 'Copied' : 'Copy Name'}
              </PanelStyledButton>
            </ActionButtonGroup>

            {placementActive && !iconifyLibrary.isPlacementPending && (
              <StatusMessage>
                Placement active. Click to place, or click and drag to set the size.
              </StatusMessage>
            )}

            {iconifyLibrary.placementError && (
              <Alert status="error" variant="subtle" borderRadius="md" fontSize="11px">
                <AlertIcon />
                {iconifyLibrary.placementError}
              </Alert>
            )}
          </>
        )}
      </VStack>
    </Panel>
  );
};
