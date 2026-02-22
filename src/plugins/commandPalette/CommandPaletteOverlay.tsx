/**
 * CommandPaletteOverlay - VSCode-style command palette overlay (⌘K / Ctrl+K).
 * Provides fuzzy search across all registered commands and tools.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Box, Input, VStack, HStack, Text, Kbd, SimpleGrid } from '@chakra-ui/react';
import { Search } from 'lucide-react';
import { useColorMode } from '@chakra-ui/react';
import { useCommandPaletteCommands } from './useCommandPaletteCommands';
import type { PaletteCommand } from './types';
import { PanelModal } from './PanelModal';
import { NO_FOCUS_STYLES_DEEP } from '../../hooks/useThemeColors';
import { useCanvasStore } from '../../store/canvasStore';
import { useLibrarySearchResults, LIBRARY_CHIP_ITEMS, LIB_TYPE_LABELS } from './useLibrarySearchResults';
import { LibraryCardRenderer } from './LibraryCardRenderer';

/** Category chips for filtering — label shown in UI, category matches PaletteCommand.category */
const CATEGORY_CHIPS = [
  { label: 'TOOL',   category: 'Tool',       isLib: false },
  { label: 'FILE',   category: 'File',       isLib: false },
  { label: 'EDIT',   category: 'Edit',       isLib: false },
  { label: 'VIEW',   category: 'View',       isLib: false },
  { label: 'ACTION', category: 'Action',     isLib: false },
  { label: 'GEN',    category: 'Generator',  isLib: false },
  { label: 'AUDIT',  category: 'Audit',      isLib: false },
  { label: 'LIB',    category: 'Library',    isLib: false },
  { label: 'PREFS',  category: 'Prefs',      isLib: false },
  { label: 'SELECT', category: 'Select',     isLib: false },
  // Library sub-type chips — produce card results, not command rows
  ...LIBRARY_CHIP_ITEMS.map((c) => ({ label: c.label, category: c.category, isLib: true as const })),
] as const;

const FILTERABLE_CATEGORIES = new Set<string>(CATEGORY_CHIPS.map((c) => c.category));
const ALL_CHIP_CATEGORIES = new Set<string>(CATEGORY_CHIPS.map((c) => c.category));

/** Simple fuzzy match: checks if all query chars appear in order in the target */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (q.length === 0) return { match: true, score: 0 };

  // Exact substring match gets highest score
  if (t.includes(q)) {
    const idx = t.indexOf(q);
    // Prefer matches at start of words
    return { match: true, score: 100 - idx };
  }

  // Fuzzy: all query chars must appear in order
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive chars and word boundaries
      score += ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-' ? 10 : 1;
      qi++;
    }
  }

  if (qi === q.length) {
    return { match: true, score };
  }

  return { match: false, score: 0 };
}

function filterAndSort(commands: PaletteCommand[], query: string): PaletteCommand[] {
  if (!query.trim()) {
    // Show all commands grouped by category — the list is scrollable
    return commands;
  }

  const scored = commands
    .map((cmd) => {
      // Match against label, category, and keywords
      const labelMatch = fuzzyMatch(query, cmd.label);
      const catMatch = fuzzyMatch(query, cmd.category);
      const keywordScores = (cmd.keywords ?? []).map((kw) => fuzzyMatch(query, kw));
      const bestKeyword = keywordScores.reduce(
        (best, m) => (m.score > best.score ? m : best),
        { match: false, score: 0 }
      );

      const isMatch = labelMatch.match || catMatch.match || bestKeyword.match;
      const score = Math.max(labelMatch.score * 2, catMatch.score, bestKeyword.score);

      return { cmd, isMatch, score };
    })
    .filter((r) => r.isMatch)
    .sort((a, b) => b.score - a.score);

  return scored.map((r) => r.cmd).slice(0, 50);
}

interface CommandPaletteOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteOverlay: React.FC<CommandPaletteOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(ALL_CHIP_CATEGORIES)
  );
  const [modalPanel, setModalPanel] = useState<{
    component: React.ComponentType;
    label: string;
    panelCategory?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const allCommands = useCommandPaletteCommands();

  // Close PanelModal automatically when AnimationWorkspaceDialog opens
  // (their default z-indices conflict — closing the modal is cleaner than fighting z-index)
  const isAnimationWorkspaceOpen = useCanvasStore(
    (state) => (state as unknown as { animationState?: { isWorkspaceOpen?: boolean } }).animationState?.isWorkspaceOpen ?? false
  );
  useEffect(() => {
    if (isAnimationWorkspaceOpen && modalPanel) {
      setModalPanel(null);
    }
  }, [isAnimationWorkspaceOpen, modalPanel]);

  // Library item search results (card-based, separate from commands)
  const libraryResults = useLibrarySearchResults(query);

  // Commands matching the text query (before category filter)
  const queryFiltered = useMemo(() => filterAndSort(allCommands, query), [allCommands, query]);

  // Per-category counts from query-filtered results + library results (used for chip badges)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cmd of queryFiltered) {
      counts.set(cmd.category, (counts.get(cmd.category) ?? 0) + 1);
    }
    // Merge library item counts
    if (libraryResults) {
      for (const chip of LIBRARY_CHIP_ITEMS) {
        const results = libraryResults[chip.key];
        if (results.length > 0) {
          counts.set(chip.category, results.length);
        }
      }
    }
    return counts;
  }, [queryFiltered, libraryResults]);

  // Toggle a category chip on/off (always keep at least one active)
  const toggleCategory = useCallback((category: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        if (next.size > 1) next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Final filtered list — apply category filter on top of query filter
  const filtered = useMemo(() => {
    if (activeCategories.size >= ALL_CHIP_CATEGORIES.size) return queryFiltered;
    return queryFiltered.filter(
      (cmd) => !FILTERABLE_CATEGORIES.has(cmd.category) || activeCategories.has(cmd.category)
    );
  }, [queryFiltered, activeCategories]);

  // On open: focus input and reset cursor — keep query and active chips as-is (persisted between opens)
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-palette-item]');
    const target = items[selectedIndex] as HTMLElement;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeCommand = useCallback(
    (cmd: PaletteCommand) => {
      if (cmd.panelComponent) {
        // Open the panel in a modal instead of executing
        onClose();
        requestAnimationFrame(() => {
          setModalPanel({
            component: cmd.panelComponent!,
            label: cmd.panelLabel ?? cmd.label,
            panelCategory: cmd.panelCategory,
          });
        });
      } else {
        onClose();
        requestAnimationFrame(() => cmd.execute());
      }
    },
    [onClose]
  );

  /**
   * Opens a library sub-panel in a PanelModal (detached mode).
   * `afterOpen` is called ~150 ms after the modal mounts, giving the panel
   * time to render before we trigger scroll-select.
   */
  const openLibraryModal = useCallback(
    (component: ComponentType, label: string, afterOpen?: () => void) => {
      onClose();
      requestAnimationFrame(() => {
        setModalPanel({ component, label });
        if (afterOpen) {
          setTimeout(afterOpen, 150);
        }
      });
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) {
            executeCommand(filtered[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, executeCommand, onClose]
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, PaletteCommand[]>();
    for (const cmd of filtered) {
      const existing = groups.get(cmd.category) ?? [];
      existing.push(cmd);
      groups.set(cmd.category, existing);
    }
    return groups;
  }, [filtered]);

  const bgColor = isDark ? 'gray.800' : 'white';
  const borderColor = isDark ? 'gray.600' : 'gray.200';
  const hoverBg = isDark ? 'gray.700' : 'gray.50';
  const selectedBg = isDark ? 'gray.600' : 'gray.100';
  const textColor = isDark ? 'gray.100' : 'gray.800';
  const secondaryColor = isDark ? 'gray.400' : 'gray.500';
  const inputBg = isDark ? 'gray.900' : 'gray.50';

  // Build flat list with group headers for rendering
  const renderItems = useMemo(() => {
    let flatIndex = 0;
    const items: Array<
      { type: 'header'; category: string } | { type: 'command'; cmd: PaletteCommand; index: number }
    > = [];
    for (const [category, cmds] of groupedCommands) {
      items.push({ type: 'header', category });
      for (const cmd of cmds) {
        items.push({ type: 'command', cmd, index: flatIndex });
        flatIndex++;
      }
    }
    return items;
  }, [groupedCommands]);

  // Build stable unique keys for command rows to avoid collisions when multiple commands share the same id.
  const commandRowKeys = useMemo(() => {
    const counts = new Map<string, number>();
    return renderItems.map((item, position) => {
      if (item.type !== 'command') {
        return `row-${position}`;
      }

      const count = counts.get(item.cmd.id) ?? 0;
      counts.set(item.cmd.id, count + 1);
      return count === 0 ? item.cmd.id : `${item.cmd.id}__${count}`;
    });
  }, [renderItems]);

  return (
    <>
      {/* Panel modal (rendered even when palette is closed) */}
      {modalPanel && (
        <PanelModal
          isOpen={true}
          onClose={() => setModalPanel(null)}
          title={modalPanel.label}
          PanelComponent={modalPanel.component}
          isPrefsPanel={modalPanel.panelCategory === 'prefs'}
          preserveCollapses={modalPanel.panelCategory === 'editor'}
        />
      )}

      {isOpen && (
        <>
          {/* Backdrop */}
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.400"
            zIndex={2000}
            onClick={onClose}
            sx={NO_FOCUS_STYLES_DEEP}
          />

      {/* Palette container */}
      <Box
        position="fixed"
        top={{ base: '10%', md: '15%' }}
        left="50%"
        transform="translateX(-50%)"
        width={{ base: '92vw', md: '520px' }}
        maxH={{ base: '70vh', md: '480px' }}
        bg={bgColor}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        boxShadow="dark-lg"
        zIndex={2001}
        overflow="hidden"
        display="flex"
        flexDirection="column"
        onKeyDown={handleKeyDown}
        sx={NO_FOCUS_STYLES_DEEP}
      >
        {/* Search input */}
        <HStack px={4} py={3} borderBottom="1px solid" borderColor={borderColor} spacing={3}>
          <Search size={18} color={isDark ? '#a0aec0' : '#718096'} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            variant="unstyled"
            size="md"
            fontSize="15px"
            color={textColor}
            bg={inputBg}
            px={3}
            py={1.5}
            borderRadius="md"
            _placeholder={{ color: secondaryColor }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <Kbd
            fontSize="xs"
            color={secondaryColor}
            bg={isDark ? 'gray.700' : 'gray.100'}
            borderColor={borderColor}
          >
            ESC
          </Kbd>
        </HStack>

        {/* Category filter chips */}
        <Box
          px={2}
          py={1.5}
          borderBottom="1px solid"
          borderColor={borderColor}
          sx={{
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <HStack spacing={1} flexWrap="nowrap" width="fit-content" mx="auto">
            {CATEGORY_CHIPS.map(({ label, category, isLib }) => {
              const count = categoryCounts.get(category) ?? 0;
              const isActive = activeCategories.has(category);
              // Library sub-chips only visible when there's a query typed
              if (isLib && !query.trim()) return null;
              const isEmpty = count === 0;
              // Separator before first lib sub-chip
              const isFirstLib = isLib && category === LIBRARY_CHIP_ITEMS[0].category;
              return (
                <React.Fragment key={category}>
                  {isFirstLib && (
                    <Box w="1px" h="14px" bg={isDark ? 'gray.600' : 'gray.200'} mx={0.5} flexShrink={0} />
                  )}
                  <Box
                    as="button"
                    onClick={() => !isEmpty && toggleCategory(category)}
                    display="inline-flex"
                    alignItems="center"
                    h="20px"
                    px={1.5}
                    gap={1}
                    borderRadius="full"
                    fontSize="10px"
                    fontWeight="bold"
                    letterSpacing="0.04em"
                    cursor={isEmpty ? 'default' : 'pointer'}
                    opacity={isEmpty ? 0.25 : 1}
                    bg={
                      isActive && !isEmpty
                        ? isDark ? 'gray.500' : 'gray.300'
                        : isDark ? 'gray.700' : 'gray.100'
                    }
                    color={
                      isActive && !isEmpty
                        ? isDark ? 'gray.100' : 'gray.700'
                        : isDark ? 'gray.400' : 'gray.500'
                    }
                    border="1px solid"
                    borderColor={
                      isActive && !isEmpty
                        ? isDark ? 'gray.400' : 'gray.400'
                        : 'transparent'
                    }
                    _hover={isEmpty ? {} : { opacity: 0.8 }}
                    transition="all 0.1s"
                    flexShrink={0}
                    whiteSpace="nowrap"
                  >
                    <Box as="span">{label}</Box>
                    {count > 0 && (
                      <Box as="span" fontSize="9px" fontWeight="normal" opacity={0.75}>
                        {count}
                      </Box>
                    )}
                  </Box>
                </React.Fragment>
              );
            })}
          </HStack>
        </Box>

        {/* Command list */}
        <Box ref={listRef} overflowY="auto" maxH={{ base: '50vh', md: '360px' }} py={1}>
          {filtered.length === 0 && (!libraryResults || Object.values(libraryResults).every(arr => arr.length === 0)) ? (
            <Box px={4} py={6} textAlign="center">
              <Text color={secondaryColor} fontSize="sm">
                {query.trim() ? 'No results found' : 'No matching commands'}
              </Text>
            </Box>
          ) : (
            <VStack spacing={0} align="stretch">
              {renderItems.map((item, position) => {
                if (item.type === 'header') {
                  return (
                    <Box key={`header-${item.category}`} px={4} pt={2} pb={1}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color={secondaryColor}
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {item.category}
                      </Text>
                    </Box>
                  );
                }

                const isSelected = item.index === selectedIndex;
                const { cmd } = item;

                return (
                  <HStack
                    key={commandRowKeys[position]}
                    data-palette-item
                    px={4}
                    py={2}
                    cursor="pointer"
                    bg={isSelected ? selectedBg : 'transparent'}
                    _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(item.index)}
                    spacing={3}
                    transition="background 0.1s"
                    borderRadius="md"
                    mx={1}
                  >
                    {/* Icon */}
                    <Box flexShrink={0} w={5} h={5} display="flex" alignItems="center" justifyContent="center">
                      {cmd.icon ? (
                        <cmd.icon size={16} />
                      ) : (
                        <Box w={4} h={4} borderRadius="sm" bg={secondaryColor} opacity={0.3} />
                      )}
                    </Box>

                    {/* Label */}
                    <Text
                      flex={1}
                      fontSize="sm"
                      color={textColor}
                      fontWeight={isSelected ? 'medium' : 'normal'}
                      isTruncated
                    >
                      {cmd.label}
                    </Text>

                    {/* Shortcut */}
                    {cmd.shortcut && (
                      <Kbd
                        fontSize="xs"
                        color={secondaryColor}
                        bg={isDark ? 'gray.700' : 'gray.100'}
                        borderColor={borderColor}
                      >
                        {cmd.shortcut}
                      </Kbd>
                    )}
                  </HStack>
                );
              })}
              {/* Library item results — card-based sections, only when query is present */}
              {libraryResults && LIBRARY_CHIP_ITEMS.map((chip) => {
                if (!activeCategories.has(chip.category)) return null;
                const items = libraryResults[chip.key];
                if (items.length === 0) return null;
                return (
                  <Box key={chip.category} px={3} pb={2}>
                    {/* Section header */}
                    <Box px={1} pt={2} pb={1}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color={secondaryColor}
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {LIB_TYPE_LABELS[chip.key]}
                      </Text>
                    </Box>
                    {/* 2-column card grid */}
                    <SimpleGrid columns={2} spacing={1}>
                      {items.map((item, idx) => {
                        const isLast = items.length % 2 === 1 && idx === items.length - 1;
                        return (
                          <Box key={item.data.id} gridColumn={isLast ? 'span 2' : 'auto'}>
                            <LibraryCardRenderer
                              item={item}
                              onClose={onClose}
                              onOpenModal={openLibraryModal}
                            />
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                );
              })}
            </VStack>
          )}
        </Box>
      </Box>
        </>
      )}
    </>
  );
};
