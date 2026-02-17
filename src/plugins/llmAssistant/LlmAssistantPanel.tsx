import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VStack, HStack, Text, Badge, Textarea, Box, useToast, Menu, MenuButton, MenuItem, MenuList, IconButton } from '@chakra-ui/react';
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useSidebarPanelState } from '../../contexts/sidebarPanelState';
import type { LlmAssistantSlice, LlmAssistantHistoryItem } from './slice';

interface LlmAssistantPanelProps {
  hideTitle?: boolean;
  panelKey?: string;
}

export const LlmAssistantPanel: React.FC<LlmAssistantPanelProps> = ({ hideTitle = false, panelKey }) => {
  const { openPanelKey } = useSidebarPanelState();
  const llm = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).llmAssistant);
  const updateRuntime = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).updateLlmAssistantRuntime);
  const run = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).runLlmAssistant);
  const cancel = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).cancelLlmAssistant);
  const clear = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).clearLlmAssistantResult);
  const apply = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).applyLlmAssistantStaged);
  const clearHistory = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).clearLlmAssistantHistory);
  const deleteHistoryItem = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).deleteLlmAssistantHistoryItem);

  const selectedCount = useCanvasStore((s) => s.selectedIds.length);
  const toast = useToast();

  const [showRaw, setShowRaw] = useState(false);
  const [rawCopied, setRawCopied] = useState(false);
  const [thinkExpanded, setThinkExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  const status = llm?.runtime.status ?? 'idle';
  const error = llm?.runtime.error;
  const staged = llm?.runtime.staged;
  const raw = llm?.runtime.lastRawResponse;
  const think = llm?.runtime.lastThink;
  const promptDraft = llm?.runtime.promptDraft ?? '';
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [normalizedPreviewSvg, setNormalizedPreviewSvg] = useState<string | null>(null);
  const history = llm?.runtime.history ?? [];
  const tokenStats = llm?.runtime.tokenStats;

  const statsEntries = useMemo(() => Object.values(tokenStats ?? {}), [tokenStats]);

  const hasApiKey = (llm?.settings.apiKey?.trim()?.length ?? 0) > 0;
  const hasModel = (llm?.settings.model?.trim()?.length ?? 0) > 0;
  const hasBaseUrl = (llm?.settings.baseUrl?.trim()?.length ?? 0) > 0;
  const isConfigured = hasApiKey && hasModel && hasBaseUrl;

  const canRun = status !== 'running' && isConfigured;
  const hasPrompt = promptDraft.trim().length > 0;
  const canApply = status !== 'running' && !!staged && staged.svg.trim().length > 0;

  const statusBadge = (() => {
    if (status === 'running') return <Badge colorScheme="blue">running</Badge>;
    if (status === 'error') return <Badge colorScheme="red">error</Badge>;
    if (status === 'success') return <Badge colorScheme="green">ready</Badge>;
    return <Badge colorScheme="gray">idle</Badge>;
  })();

  const handleRun = useCallback(() => {
    if (!canRun || !hasPrompt) return;
    run?.(promptDraft);
  }, [canRun, hasPrompt, promptDraft, run]);

  const handleCancel = useCallback(() => cancel?.(), [cancel]);
  const handleClear = useCallback(() => {
    setShowRaw(false);
    clear?.();
  }, [clear]);

  const handleApply = useCallback(() => {
    void apply?.();
  }, [apply]);

  const handleCopyRaw = useCallback(async () => {
    if (!raw) return;
    const textToCopy = raw;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(textToCopy);

      setRawCopied(true);
      toast({
        title: 'Copied raw response',
        status: 'success',
        duration: 1200,
        isClosable: false,
        position: 'bottom-right',
      });
      window.setTimeout(() => setRawCopied(false), 1200);
    } catch {
      toast({
        title: 'Failed to copy',
        status: 'error',
        duration: 2000,
        isClosable: true,
        position: 'bottom-right',
      });
    }
  }, [raw, toast]);

  const handleLoadHistory = useCallback(
    (item: LlmAssistantHistoryItem) => {
      updateRuntime?.({
        promptDraft: item.prompt,
        staged: item.staged,
        stagedSummary: item.summary,
        lastRawResponse: item.raw,
        lastThink: item.reasoning ?? null,
      });
      setShowRaw(false);
      setThinkExpanded(false);
    },
    [updateRuntime]
  );

  const handleClearHistory = useCallback(() => {
    clearHistory?.();
  }, [clearHistory]);

  const handleDeleteHistory = useCallback(
    (id: string) => {
      deleteHistoryItem?.(id);
      setDetailItemId((current) => (current === id ? null : current));
    },
    [deleteHistoryItem]
  );

  const handleToggleDetail = useCallback((id: string) => {
    setDetailItemId((current) => (current === id ? null : id));
  }, []);

  useEffect(() => {
    setThinkExpanded(false);
  }, [think]);

  useEffect(() => {
    setShowRaw(false);
    setThinkExpanded(false);
  }, [raw]);

  useEffect(() => {
    const svgString = staged?.svg;
    if (!svgString) {
      setNormalizedPreviewSvg(null);
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.innerHTML = svgString;
    document.body.appendChild(container);

    const svgEl = container.querySelector('svg');
    if (!svgEl) {
      document.body.removeChild(container);
      setNormalizedPreviewSvg(svgString);
      return;
    }

    const finalize = () => {
      try {
        const bbox = (svgEl as SVGGraphicsElement).getBBox();
        if (bbox.width === 0 && bbox.height === 0) return;
        const padding = Math.max(bbox.width, bbox.height) * 0.05;
        const viewBox = [
          bbox.x - padding,
          bbox.y - padding,
          bbox.width + padding * 2,
          bbox.height + padding * 2,
        ].join(' ');
        svgEl.setAttribute('viewBox', viewBox);
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        setNormalizedPreviewSvg(container.innerHTML);
      } catch {
        setNormalizedPreviewSvg(svgString);
      } finally {
        document.body.removeChild(container);
      }
    };

    const id = window.requestAnimationFrame(finalize);
    return () => {
      window.cancelAnimationFrame(id);
      if (container.parentElement) container.parentElement.removeChild(container);
    };
  }, [staged?.svg]);

  const isPanelOpen = hideTitle || !panelKey || openPanelKey === panelKey;

  const stopHeaderTogglePropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const headerMenu = (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="LLM menu"
        icon={<MoreVertical size={14} />}
        size="xs"
        variant="ghost"
        borderRadius="full"
        onMouseDown={stopHeaderTogglePropagation}
        onPointerDown={stopHeaderTogglePropagation}
        onClick={stopHeaderTogglePropagation}
      />
      <MenuList>
        <MenuItem
          onClick={(event) => {
            event.stopPropagation();
            setShowStats((v) => !v);
          }}
        >
          {showStats ? 'Hide stats' : 'Show stats'}
        </MenuItem>
      </MenuList>
    </Menu>
  );

  const headerActions = hideTitle || !isPanelOpen ? null : (
    <HStack
      spacing={1}
      align="center"
      onMouseDown={stopHeaderTogglePropagation}
      onPointerDown={stopHeaderTogglePropagation}
      onClick={stopHeaderTogglePropagation}
    >
      {statusBadge}
      {headerMenu}
    </HStack>
  );

  return (
    <Panel
      title="Assistant"
      hideHeader={hideTitle}
      panelKey={panelKey}
      isCollapsible={!hideTitle}
      isMaximizable={!hideTitle}
      defaultOpen={hideTitle}
      headerActions={headerActions}
    >
      <VStack spacing={1} align="stretch">
        {showStats ? (
          <VStack spacing={0.5} align="stretch" p={0.5}>
            <Text fontSize="11px" fontWeight="semibold">
              Token stats
            </Text>
              {statsEntries.length === 0 ? (
                <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.500' }}>
                  No usage recorded yet.
                </Text>
              ) : (
                <VStack spacing={0.25} align="stretch">
                {statsEntries.map((stat) => {
                  const computedTotal = (stat.promptTokens ?? 0) + (stat.completionTokens ?? 0);
                  const displayTotal = computedTotal > 0 ? computedTotal : stat.totalTokens;
                  return (
                    <Box key={`${stat.endpoint}-${stat.model}`}>
                      <Text fontSize="10px" color="gray.600" _dark={{ color: 'gray.400' }}>
                        {stat.model} • {stat.endpoint}
                      </Text>
                      <Text fontSize="10px">
                        Total: {displayTotal} (prompt {stat.promptTokens}; completion {stat.completionTokens}) • calls {stat.callCount}
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </VStack>
        ) : null}

        <Box px={0.5} pt={0.5}>
          <Textarea
            value={promptDraft}
            onChange={(e) => updateRuntime?.({ promptDraft: e.target.value })}
            onKeyDown={(e) => {
              // Run with Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                handleRun();
                // Don't preventDefault - allow the event to propagate for play/stop animations
              }
            }}
            placeholder={selectedCount > 0 ? 'Describe how to modify the selection…' : 'Describe what to generate…'}
            size="sm"
            rows={4}
            resize="vertical"
            minH="80px"
            borderRadius="0"
            isDisabled={status === 'running'}
            _focus={{
              borderColor: 'gray.600',
              boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)',
            }}
          />
        </Box>

        <HStack spacing={2} align="center" justify="space-between">
          <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.500' }}>
            {selectedCount > 0 ? `${selectedCount} selected (editSelection)` : 'No selection (insertNew)'}
          </Text>
          {status === 'running' ? (
            <PanelStyledButton size="xs" onClick={handleCancel}>
              Cancel
            </PanelStyledButton>
          ) : (
            <PanelStyledButton size="xs" onClick={handleRun} isDisabled={!canRun || !hasPrompt}>
              Run
            </PanelStyledButton>
          )}
        </HStack>

        {error ? (
          <Text fontSize="11px" color="red.500" _dark={{ color: 'red.300' }}>
            {error}
          </Text>
        ) : null}

        {staged ? (
          <VStack spacing={0.25} align="stretch" pt={0}>
            <Box
              border="1px solid"
              borderColor="gray.200"
              bg="white"
              _dark={{ borderColor: 'whiteAlpha.200', bg: 'gray.900' }}
              p={1}
              h="140px"
              overflow="hidden"
              ref={previewRef}
              pointerEvents="none"
            >
                  <Box
                    sx={{
                      '& svg': {
                        display: 'block',
                        width: '100%',
                        height: '100%',
                      },
                    }}
                    w="100%"
                    h="100%"
                    dangerouslySetInnerHTML={{ __html: normalizedPreviewSvg ?? staged.svg }}
                  />
            </Box>
          </VStack>
        ) : null}

        {staged ? (
          <HStack spacing={2} align="center" justify="space-between" pt={0.25}>
            <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.500' }}>
              {staged.mode === 'insertNew' ? 'Insert' : 'Edit'} • {staged.svg.length.toLocaleString()} chars
            </Text>
            <HStack spacing={1}>
              <PanelStyledButton size="xs" onClick={handleClear}>
                Clear
              </PanelStyledButton>
              <PanelStyledButton size="xs" onClick={handleApply} isDisabled={!canApply}>
                Apply
              </PanelStyledButton>
            </HStack>
          </HStack>
        ) : null}

        {raw ? (
          <VStack spacing={1} align="stretch" pt={1}>
            <HStack justify="space-between" align="center">
              <Text fontSize="11px" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }}>
                Raw
              </Text>
              <HStack spacing={1} align="center">
                {showRaw ? (
                  <PanelStyledButton size="xs" onClick={() => void handleCopyRaw()}>
                    {rawCopied ? 'Copied raw' : 'Copy raw'}
                  </PanelStyledButton>
                ) : null}
                <PanelActionButton
                  icon={showRaw ? ChevronDown : ChevronRight}
                  iconSize={14}
                  label={showRaw ? 'Hide raw' : 'Show raw'}
                  onClick={() => setShowRaw((v) => !v)}
                />
              </HStack>
            </HStack>

            {showRaw ? (
              <>
                {think ? (
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    bg="white"
                    _dark={{ borderColor: 'whiteAlpha.200', bg: 'gray.900' }}
                    p={2}
                    fontSize="10px"
                    overflowX="auto"
                  >
                    <HStack justify="space-between" align="center" mb={1}>
                      <Text fontSize="11px" fontWeight="semibold">
                        LLM thinking
                      </Text>
                      <PanelActionButton
                        icon={thinkExpanded ? ChevronDown : ChevronRight}
                        iconSize={14}
                        label={thinkExpanded ? 'Hide thinking' : 'Show thinking'}
                        onClick={() => setThinkExpanded((v) => !v)}
                      />
                    </HStack>
                    {thinkExpanded ? (
                      <Box as="pre" whiteSpace="pre-wrap" m={0}>
                        {think}
                      </Box>
                    ) : null}
                  </Box>
                ) : null}

                <Box
                  border="1px solid"
                  borderColor="gray.200"
                  bg="white"
                  _dark={{ borderColor: 'whiteAlpha.200', bg: 'gray.900' }}
                  p={2}
                  fontSize="10px"
                  overflowX="auto"
                >
                  <Box as="pre" whiteSpace="pre" m={0}>
                    {raw}
                  </Box>
                </Box>
              </>
            ) : null}
          </VStack>
        ) : null}

        <VStack spacing={1} align="stretch" pt={1}>
          <HStack justify="space-between" align="center">
            <Text fontSize="11px" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }}>
              History
            </Text>
            <HStack spacing={1}>
              <Badge colorScheme="gray" fontSize="10px">
                {history.length}
              </Badge>
              {historyExpanded ? (
                <PanelStyledButton size="xs" onClick={handleClearHistory} isDisabled={history.length === 0}>
                  Clear history
                </PanelStyledButton>
              ) : null}
              <PanelActionButton
                icon={historyExpanded ? ChevronDown : ChevronRight}
                iconSize={14}
                label={historyExpanded ? 'Hide history' : 'Show history'}
                onClick={() => setHistoryExpanded((v) => !v)}
              />
            </HStack>
          </HStack>

          {historyExpanded ? (
            history.length === 0 ? (
              <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.500' }}>
                No history yet.
              </Text>
            ) : (
              <VStack spacing={0.5} align="stretch" maxH="200px" overflowY="auto">
                {history.map((item) => (
                  <React.Fragment key={item.id}>
                    <HStack justify="space-between" align="flex-start" spacing={2} py={0.5}>
                      <Text
                        flex="1"
                        fontSize="11px"
                        noOfLines={detailItemId === item.id ? undefined : 1}
                        cursor="pointer"
                        onClick={() => handleLoadHistory(item)}
                      >
                        {item.prompt}
                      </Text>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="History menu"
                          icon={<MoreVertical size={12} />}
                          size="xs"
                          variant="ghost"
                          borderRadius="full"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <MenuList>
                          <MenuItem onClick={() => handleToggleDetail(item.id)}>
                            {detailItemId === item.id ? 'Hide detail' : 'Show detail'}
                          </MenuItem>
                          <MenuItem onClick={() => handleDeleteHistory(item.id)}>Delete</MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                    {detailItemId === item.id ? (
                      <VStack
                        align="stretch"
                        spacing={0.25}
                        pl={1}
                        borderLeft="1px solid"
                        borderColor="gray.200"
                        _dark={{ borderColor: 'whiteAlpha.200' }}
                      >
                        <Text fontSize="10px" color="gray.600" _dark={{ color: 'gray.400' }}>
                          {item.mode === 'insertNew' ? 'Insert' : 'Edit'} • {new Date(item.createdAt).toLocaleString()}
                        </Text>
                        {(item.endpoint || item.model) ? (
                          <Text fontSize="10px" color="gray.600" _dark={{ color: 'gray.400' }}>
                            {item.model ?? 'Unknown model'} • {item.endpoint ?? 'Unknown endpoint'}
                          </Text>
                        ) : null}
                        {item.tokens
                          ? (() => {
                              const prompt = item.tokens.promptTokens ?? 0;
                              const completion = item.tokens.completionTokens ?? 0;
                              const computedTotal = prompt + completion;
                              const displayTotal = computedTotal > 0 ? computedTotal : item.tokens.totalTokens ?? 'n/a';
                              return (
                                <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.300' }}>
                                  Tokens: {displayTotal} (prompt {item.tokens.promptTokens ?? 'n/a'}; completion {item.tokens.completionTokens ?? 'n/a'})
                                </Text>
                              );
                            })()
                          : null}
                      </VStack>
                    ) : null}
                  </React.Fragment>
                ))}
              </VStack>
            )
          ) : null}
        </VStack>

        {!isConfigured ? (
          <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.500' }}>
            Configure your provider/model/API key in the File panel.
          </Text>
        ) : null}
      </VStack>
    </Panel>
  );
};
