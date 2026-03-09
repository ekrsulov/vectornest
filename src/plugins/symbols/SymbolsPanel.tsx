import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { MousePointer } from 'lucide-react';
import { shallow } from 'zustand/shallow';
import type { CanvasStore } from '../../store/canvasStore';
import type { SymbolPluginSlice, SymbolDefinition } from './slice';
import type { AnimationPluginSlice } from '../animationSystem/types';
import { ensureChainDelays } from '../animationSystem/chainUtils';
import { injectAnimationsIntoSymbolContent } from './index';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SymbolItemCard } from './SymbolItemCard';
import { useFrozenCanvasStoreValueDuringDrag } from '../../hooks/useFrozenElementsDuringDrag';
import { LibraryPanelHelper } from '../../ui/LibraryPanelHelper';
import { createCircleCommands, createDiamondCommands, createHeartCommands, createTriangleCommands } from '../../utils/ShapeFactory';
import { CompactFieldRow } from '../../ui/CompactFieldRow';
import { ActionButtonGroup, StatusMessage } from '../../ui/PresetButtonGrid';
import { SvgEditor } from '../../ui/SvgPreview';
import { LibrarySectionHeader } from '../../ui/LibrarySectionHeader';
import type { PathData } from '../../types';
import { subPathsToPathString } from '../pencil/utils';
import type { SVGAnimation, AnimationState } from '../animationSystem/types';

const EMPTY_SYMBOLS: SymbolDefinition[] = [];
const EMPTY_ANIMATIONS: SVGAnimation[] = [];
const EMPTY_CHAIN_DELAY_SIGNATURE = '';
const PREVIEW_SYMBOL_ANIMATION_STATE: AnimationState = {
  isPlaying: true,
  hasPlayed: true,
  isWorkspaceOpen: true,
  currentTime: 0,
  startTime: null,
  playbackRate: 1,
  restartKey: 0,
  chainDelays: new Map(),
  isCanvasPreviewMode: false,
  activeGizmos: new Map(),
  focusedGizmoAnimationId: null,
  gizmoEditMode: false,
  draggingHandle: null,
};

const buildNormalizedChainDelaySignature = (
  animations: SVGAnimation[],
  persistedChainDelays: Map<string, number> | undefined,
  calculateChainDelays: (() => Map<string, number>) | undefined
): string => {
  const computedChainDelays = calculateChainDelays ? calculateChainDelays() : new Map<string, number>();
  const merged = new Map<string, number>([
    ...computedChainDelays,
    ...(persistedChainDelays ? ensureChainDelays(persistedChainDelays) : new Map<string, number>()),
  ]);

  if (merged.size === 0) {
    return EMPTY_CHAIN_DELAY_SIGNATURE;
  }

  const validAnimationIds = new Set(animations.map((animation) => animation.id));
  return Array.from(merged.entries())
    .filter(([animationId]) => validAnimationIds.has(animationId))
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([animationId, delay]) => `${animationId}\u0000${delay}`)
    .join('\u0001');
};

const selectSymbolsPanelState = (state: CanvasStore) => {
  const slice = state as CanvasStore & SymbolPluginSlice;
  const animSlice = state as CanvasStore & AnimationPluginSlice;
  const selectedIds = state.selectedIds;
  let hasPathSelection = false;
  if (selectedIds.length > 0) {
    const selectedSet = new Set(selectedIds);
    for (const el of state.elements) {
      if (!selectedSet.has(el.id)) continue;
      if (el.type === 'path') {
        hasPathSelection = true;
        break;
      }
    }
  }
  return {
    symbols: slice.symbols ?? EMPTY_SYMBOLS,
    createSymbol: slice.createSymbolFromSelection,
    createSymbolFromPath: slice.createSymbolFromPath,
    placingSymbolId: slice.placingSymbolId ?? null,
    setPlacingSymbolId: slice.setPlacingSymbolId,
    removeSymbol: slice.removeSymbol,
    renameSymbol: slice.renameSymbol,
    updateSymbol: slice.updateSymbol,
    hasPathSelection,
    selectedFromSearch: slice.selectedFromSearch ?? null,
    selectFromSearch: slice.selectFromSearch,
    animations: animSlice.animations ?? EMPTY_ANIMATIONS,
    chainDelaySignature: buildNormalizedChainDelaySignature(
      animSlice.animations ?? EMPTY_ANIMATIONS,
      animSlice.animationState?.chainDelays,
      animSlice.calculateChainDelays
    ),
  };
};

/** Component to display symbol preview with animations */
const SymbolPreviewBox: React.FC<{
  symbol: SymbolDefinition;
  animations: SVGAnimation[];
}> = ({ symbol, animations }) => {
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const checkerLight = useColorModeValue('#e2e2e2', '#4a4a4a');
  const checkerDark = useColorModeValue('#ffffff', '#3a3a3a');

  // Build SVG content for preview with animations injected for isolated iframe
  const svgContent = useMemo(() => {
    // Prefer rawContent if available
    if (symbol.rawContent) {
      // Extract inner content from rawContent (strip outer svg/symbol if present)
      const match = symbol.rawContent.match(/<(?:svg|symbol)[^>]*>([\s\S]*)<\/(?:svg|symbol)>/i);
      let content = match ? match[1] : symbol.rawContent;
      
      // Inject animations from the store into the content for preview
      content = injectAnimationsIntoSymbolContent(
        content,
        symbol.id,
        animations,
        new Map(),
        PREVIEW_SYMBOL_ANIMATION_STATE,
        'preview-' // Prefix to avoid ID conflicts
      );
      return content;
    }
    // Generate from pathData
    const { pathData } = symbol;
    const d = subPathsToPathString(pathData.subPaths);
    return `<path d="${d}" fill="${pathData.fillColor || '#000'}" fill-opacity="${pathData.fillOpacity ?? 1}" stroke="${pathData.strokeColor || 'none'}" stroke-width="${pathData.strokeWidth || 0}"/>`;
  }, [symbol, animations]);

  // Calculate viewBox from bounds
  const viewBox = useMemo(() => {
    const { bounds } = symbol;
    const padding = Math.max(bounds.width, bounds.height) * 0.1;
    return `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`;
  }, [symbol]);

  // Check if this symbol has animations (either embedded in rawContent or in animation store)
  const hasAnimations = useMemo(() => {
    // Check for SMIL animations in rawContent
    if (symbol.rawContent) {
      const hasSmil = /<(animate|animateTransform|animateMotion|set)\b/i.test(symbol.rawContent);
      if (hasSmil) return true;
    }
    // Check animation store
    return animations.some(anim => anim.symbolTargetId === symbol.id);
  }, [symbol, animations]);

  // For animated symbols, use iframe to isolate from main canvas SMIL timeline
  // For static symbols, use regular SVG for better performance
  const iframeSrcDoc = useMemo(() => {
    if (!hasAnimations) return null;
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; width: 100%; height: 100%; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">
    ${svgContent}
  </svg>
</body>
</html>`;
  }, [hasAnimations, viewBox, svgContent]);

  return (
    <Box>
      <LibrarySectionHeader title="Preview" />
      <Box
        bg={bgColor}
        borderRadius="md"
        overflow="hidden"
        position="relative"
        width="100%"
        sx={{
          aspectRatio: '1 / 1',
          backgroundImage: `linear-gradient(45deg, ${checkerLight} 25%, transparent 25%), 
            linear-gradient(-45deg, ${checkerLight} 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, ${checkerLight} 75%), 
            linear-gradient(-45deg, transparent 75%, ${checkerLight} 75%)`,
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
          backgroundColor: checkerDark,
        }}
      >
        {hasAnimations && iframeSrcDoc ? (
          <iframe
            srcDoc={iframeSrcDoc}
            title="Symbol preview"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: 'transparent',
            }}
          />
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block' }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </Box>
    </Box>
  );
};

const SymbolsPanelComponent: React.FC = () => {
  const {
    symbols,
    createSymbol,
    createSymbolFromPath,
    placingSymbolId,
    setPlacingSymbolId,
    removeSymbol,
    renameSymbol,
    updateSymbol,
    hasPathSelection,
    selectedFromSearch,
    selectFromSearch,
    animations,
    chainDelaySignature,
  } = useFrozenCanvasStoreValueDuringDrag(selectSymbolsPanelState, shallow);

  const detailsRef = React.useRef<HTMLDivElement | null>(null);
  const [detailsFlashKey, setDetailsFlashKey] = useState<string | number | null>(null);

  React.useEffect(() => {
    if (!selectedFromSearch) return;
    setActiveSymbolId(selectedFromSearch);
    queueMicrotask(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setDetailsFlashKey(selectedFromSearch);
    });
    selectFromSearch?.(null);
  }, [selectedFromSearch, selectFromSearch]);

  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSymbolId && symbols.length) {
      setActiveSymbolId(symbols[0].id);
    } else if (activeSymbolId && !symbols.find((symbol) => symbol.id === activeSymbolId)) {
      setActiveSymbolId(symbols[0]?.id ?? null);
    }
  }, [activeSymbolId, symbols]);

  const activeSymbol = useMemo(
    () => symbols.find((symbol) => symbol.id === activeSymbolId) ?? null,
    [activeSymbolId, symbols]
  );
  const chainDelays = useMemo(
    () => new Map(
      chainDelaySignature
        ? chainDelaySignature.split('\u0001').map((entry) => {
          const [animationId, delay] = entry.split('\u0000');
          return [animationId, Number(delay)] as const;
        })
        : []
    ),
    [chainDelaySignature]
  );

  // Generate SVG content for the symbol with animations injected
  const symbolSvgContent = useMemo(() => {
    if (!activeSymbol) return '';
    
    // Prefer rawContent if available
    if (activeSymbol.rawContent) {
      // Inject animations into the content
      const contentWithAnims = injectAnimationsIntoSymbolContent(
        activeSymbol.rawContent,
        activeSymbol.id,
        animations,
        chainDelays,
        PREVIEW_SYMBOL_ANIMATION_STATE
      );
      return contentWithAnims;
    }
    // Generate from pathData
    const { pathData, bounds } = activeSymbol;
    const d = subPathsToPathString(pathData.subPaths);
    const width = bounds.width || 100;
    const height = bounds.height || 100;
    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <path d="${d}" fill="${pathData.fillColor || '#000'}" fill-opacity="${pathData.fillOpacity ?? 1}" stroke="${pathData.strokeColor || 'none'}" stroke-width="${pathData.strokeWidth || 0}"/>
</svg>`;
  }, [activeSymbol, animations, chainDelays]);

  const handleSvgChange = useCallback((newContent: string) => {
    if (!activeSymbolId || !updateSymbol) return;
    updateSymbol(activeSymbolId, { rawContent: newContent });
  }, [activeSymbolId, updateSymbol]);

  const placementActive = Boolean(activeSymbolId && placingSymbolId === activeSymbolId);

  const handleRename = (value: string) => {
    if (!activeSymbolId) return;
    renameSymbol?.(activeSymbolId, value);
  };

  useEffect(() => {
    if (!placingSymbolId || placingSymbolId === activeSymbolId) {
      return;
    }

    setPlacingSymbolId?.(null);
  }, [activeSymbolId, placingSymbolId, setPlacingSymbolId]);

  const handleTogglePlacement = () => {
    if (!activeSymbolId) {
      return;
    }
    if (placingSymbolId === activeSymbolId) {
      setPlacingSymbolId?.(null);
    } else {
      setPlacingSymbolId?.(activeSymbolId);
    }
  };

  const handleSymbolDoubleClick = useCallback((id: string) => {
    setActiveSymbolId(id);
    setPlacingSymbolId?.(id);
  }, [setPlacingSymbolId]);

  const presetsLoadedRef = useRef(false);
  useEffect(() => {
    if (presetsLoadedRef.current) return;
    if ((symbols?.length ?? 0) > 0) {
      presetsLoadedRef.current = true;
      return;
    }

    const addPreset = (creator: () => PathData, name: string) => {
      const pd = creator();
      createSymbolFromPath?.(pd, name);
    };

    addPreset(() => ({ subPaths: [createCircleCommands(50, 50, 40)], strokeWidth: 1, strokeColor: '#000', strokeOpacity: 1, fillColor: '#000', fillOpacity: 1 }), 'Circle');
    addPreset(() => ({ subPaths: [createHeartCommands(105, 105, 200, 200)], strokeWidth: 1, strokeColor: '#000', strokeOpacity: 1, fillColor: '#000', fillOpacity: 1 }), 'Heart');
    addPreset(() => ({ subPaths: [createDiamondCommands(50, 50, 40, 40)], strokeWidth: 1, strokeColor: '#000', strokeOpacity: 1, fillColor: '#000', fillOpacity: 1 }), 'Diamond');
    addPreset(() => ({ subPaths: [createTriangleCommands(50, 10, 90, 90, 10)], strokeWidth: 1, strokeColor: '#000', strokeOpacity: 1, fillColor: '#000', fillOpacity: 1 }), 'Triangle');

    presetsLoadedRef.current = true;
  }, [createSymbolFromPath, symbols]);


  const renderItem = (symbol: SymbolDefinition, isSelected: boolean) => (
    <SymbolItemCard
      symbol={symbol}
      isSelected={isSelected}
      isPlacementActive={placingSymbolId === symbol.id}
    />
  );

  return (
    <LibraryPanelHelper
      title="Symbols"
      items={symbols}
      selectedId={activeSymbolId}
      onSelect={setActiveSymbolId}
      onAdd={hasPathSelection ? createSymbol : undefined}
      onDelete={(id) => removeSymbol?.(id)}
      emptyMessage="Select a path and use the add button to capture a symbol."
      renderItem={renderItem}
      onItemDoubleClick={handleSymbolDoubleClick}
      detailsRef={detailsRef}
      detailsFlashKey={detailsFlashKey}
      Editor={
        activeSymbol ? (
          <>
            <CompactFieldRow label="Name" labelWidth="45px">
              <Box pr={0.5} w="full">
                <PanelTextInput
                  value={activeSymbol.name}
                  onChange={handleRename}
                  placeholder="Symbol name"
                  width="full"
                />
              </Box>
            </CompactFieldRow>
            <SymbolPreviewBox 
              symbol={activeSymbol} 
              animations={animations}
            />
            <SvgEditor
              content={symbolSvgContent}
              onChange={handleSvgChange}
              height="80px"
              showPreview={false}
            />
          </>
        ) : null
      }
      actionsTitle="Place Symbol"
      Actions={
        <>
          {activeSymbol ? (
            <StatusMessage>
              Click canvas to place &quot;{activeSymbol.name}&quot;, or click and drag to set the size. Press Escape to cancel.
            </StatusMessage>
          ) : (
            <StatusMessage>
              Select or create a symbol to enable placement.
            </StatusMessage>
          )}
          <ActionButtonGroup>
            <PanelStyledButton
              onClick={handleTogglePlacement}
              isDisabled={!activeSymbol}
              leftIcon={<MousePointer size={11} />}
              w="full"
            >
              {placementActive ? 'Disable placement' : 'Enable placement'}
            </PanelStyledButton>
          </ActionButtonGroup>
          {placingSymbolId && activeSymbolId && placingSymbolId === activeSymbolId && (
            <StatusMessage>
              Placement active. Click to place, or click and drag to set the size.
            </StatusMessage>
          )}
        </>
      }
    />
  );
};

export const SymbolsPanel = React.memo(SymbolsPanelComponent);
