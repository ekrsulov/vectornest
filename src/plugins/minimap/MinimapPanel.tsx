import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import type { Bounds } from '../../utils/boundsUtils';
import type { CanvasElement } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';
import { useSidebarLayout } from '../../hooks';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import type { PluginSelectorSlice } from '../pluginSelector/slice';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { MinimapTopBar } from './MinimapTopBar';
import { getCanvasCenter } from '../../utils/domHelpers';
import {
  fitViewportToActiveArtboard,
  getActiveArtboardBounds,
  hasActiveArtboardForFit,
} from '../../utils/artboardViewportFitUtils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MinimapPanelProps {
  // No props needed - component reads all state from store
}

interface DragState {
  isActive: boolean;
  pointerId: number | null;
  offset: { x: number; y: number };
}

interface MinimapMetrics {
  bounds: Bounds;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MINIMAP_MAX_WIDTH = 200;
const MINIMAP_MAX_HEIGHT = 150;
const MINIMAP_MARGIN = 16; // Screen position margin
const MINIMAP_INTERNAL_PADDING = 1; // Internal padding for content
const TOP_BAR_HEIGHT = 32;
const MINIMAP_MINIMIZED_BOTTOM = { base: '12px', md: '24px' } as const; // Align vertically with BottomActionBar center when minimized

const computeMinimapSize = (canvasWidth: number, canvasHeight: number) => {
  const aspectRatio = canvasWidth / canvasHeight;

  let width: number;
  let height: number;

  if (aspectRatio > 1) {
    // Landscape: constrain by width
    width = MINIMAP_MAX_WIDTH;
    height = width / aspectRatio;

    // If height exceeds max, constrain by height instead
    if (height > MINIMAP_MAX_HEIGHT) {
      height = MINIMAP_MAX_HEIGHT;
      width = height * aspectRatio;
    }
  } else {
    // Portrait or square: constrain by height
    height = MINIMAP_MAX_HEIGHT;
    width = height * aspectRatio;

    // If width exceeds max, constrain by width instead
    if (width > MINIMAP_MAX_WIDTH) {
      width = MINIMAP_MAX_WIDTH;
      height = width / aspectRatio;
    }
  }

  return { width, height };
};

const unionBounds = (source: Bounds | null, next: Bounds | null): Bounds | null => {
  if (!next) {
    return source;
  }

  if (!source) {
    return { ...next };
  }

  return {
    minX: Math.min(source.minX, next.minX),
    minY: Math.min(source.minY, next.minY),
    maxX: Math.max(source.maxX, next.maxX),
    maxY: Math.max(source.maxY, next.maxY),
  };
};

const getViewportBounds = (
  viewport: { panX: number; panY: number; zoom: number },
  canvasSize: { width: number; height: number }
): Bounds => {
  const viewWidth = canvasSize.width / viewport.zoom;
  const viewHeight = canvasSize.height / viewport.zoom;
  const viewX = -viewport.panX / viewport.zoom;
  const viewY = -viewport.panY / viewport.zoom;

  return {
    minX: viewX,
    minY: viewY,
    maxX: viewX + viewWidth,
    maxY: viewY + viewHeight,
  };
};

const computeMinimapMetrics = (
  bounds: Bounds | null,
  width: number,
  height: number
): MinimapMetrics | null => {
  if (!bounds) {
    return null;
  }

  const boundsWidth = bounds.maxX - bounds.minX || 1;
  const boundsHeight = bounds.maxY - bounds.minY || 1;
  const padding = 2 * MINIMAP_INTERNAL_PADDING;
  const availableWidth = width - padding;
  const availableHeight = height - padding;
  const scale = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
  const contentWidth = boundsWidth * scale;
  const contentHeight = boundsHeight * scale;
  const offsetX = MINIMAP_INTERNAL_PADDING + (availableWidth - contentWidth) / 2 - bounds.minX * scale;
  const offsetY = MINIMAP_INTERNAL_PADDING + (availableHeight - contentHeight) / 2 - bounds.minY * scale;

  return {
    bounds,
    scale,
    offsetX,
    offsetY,
  };
};

const worldToMinimap = (value: number, scale: number, offset: number): number => value * scale + offset;

const minimapToWorld = (value: number, scale: number, offset: number): number => (value - offset) / scale;

export const MinimapPanel: React.FC<MinimapPanelProps> = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clipPathId = useId();
  const lastClickRef = useRef<{ elementId: string; time: number } | null>(null);
  const containerBg = useColorModeValue('surface.toolbar', 'surface.toolbar');
  const containerShadow = 'none';

  const borderWidth = useColorModeValue('0px', '0px');
  const canvasFill = useColorModeValue('rgba(248, 250, 252, 0.95)', 'rgba(26, 32, 44, 0.85)');
  const borderColor = useColorModeValue('border.toolbar', 'border.toolbar');
  const elementFill = useColorModeValue('rgba(113, 128, 150, 0.2)', 'rgba(160, 174, 192, 0.35)');
  const elementStroke = useColorModeValue('rgba(113, 128, 150, 0.6)', 'rgba(203, 213, 224, 0.7)');
  const selectedElementFill = useColorModeValue('rgba(200, 200, 200, 0.4)', 'rgba(220, 220, 220, 0.5)');
  const selectedElementStroke = useColorModeValue('rgba(150, 150, 150, 0.8)', 'rgba(180, 180, 180, 0.9)');
  const artboardFill = useColorModeValue('rgba(0, 120, 212, 0.08)', 'rgba(100, 180, 255, 0.14)');
  const artboardStroke = useColorModeValue('rgba(0, 120, 212, 0.55)', 'rgba(100, 180, 255, 0.7)');
  const viewportFill = useColorModeValue('rgba(113, 128, 150, 0.1)', 'rgba(203, 213, 224, 0.15)');
  const viewportStroke = useColorModeValue('rgba(113, 128, 150, 1)', 'rgba(237, 242, 247, 0.85)');

  const [dragState, setDragState] = useState<DragState>({
    isActive: false,
    pointerId: null,
    offset: { x: 0, y: 0 },
  });

  const [isMinimized, setIsMinimized] = useState(true);

  // Get state from store
  const elements = useCanvasStore((state) => state.elements);
  const viewport = useCanvasStore((state) => state.viewport);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const zoomAction = useCanvasStore((state) => state.zoom);
  const resetZoom = useCanvasStore((state) => state.resetZoom);
  const isElementHidden = useCanvasStore((state) => state.isElementHidden);
  const showMinimap = useCanvasStore((state) => state.settings.showMinimap);
  const enabledPlugins = useCanvasStore(
    (state) => (state as unknown as PluginSelectorSlice).pluginSelector.enabledPlugins
  );
  const isMinimapPluginEnabled = enabledPlugins.length === 0 || enabledPlugins.includes('minimap');
  const shouldShowMinimap = showMinimap && isMinimapPluginEnabled;
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const canvasSize = useCanvasStore((state) => state.canvasSize);
  const artboard = useCanvasStore((state) => state.artboard);
  const {
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
  } = useSidebarLayout();

  // Helper to calculate bounds for any renderable element
  const getElementBounds = useCallback((element: CanvasElement, map?: Map<string, CanvasElement>): Bounds | null => {
    if (element.type === 'group') {
      return null;
    }

    return elementContributionRegistry.getBounds(element, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap: map,
    });
  }, []);

  // Calculate minimap size proportional to canvas
  const minimapSize = useMemo(() =>
    computeMinimapSize(canvasSize.width, canvasSize.height),
    [canvasSize.width, canvasSize.height]
  );

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  const visibleElements = useMemo(() => {
    return elements.filter((element): element is CanvasElement => {
      if (element.type === 'group') {
        return false;
      }

      if (isElementHidden && isElementHidden(element.id)) {
        return false;
      }

      return true;
    });
  }, [elements, isElementHidden]);

  const contentBounds = useMemo(() => {
    let aggregate: Bounds | null = null;

    visibleElements.forEach((element) => {
      const bounds = getElementBounds(element, elementMap);
      aggregate = unionBounds(aggregate, bounds);
    });

    return aggregate;
  }, [getElementBounds, visibleElements, elementMap]);

  const viewportBounds = useMemo(() => getViewportBounds(viewport, canvasSize), [viewport, canvasSize]);
  const artboardBounds = useMemo(() => getActiveArtboardBounds(artboard), [artboard]);

  const minimapMetrics = useMemo(() => {
    const combined = unionBounds(unionBounds(contentBounds, viewportBounds), artboardBounds);
    return computeMinimapMetrics(combined, minimapSize.width, minimapSize.height);
  }, [artboardBounds, contentBounds, viewportBounds, minimapSize]);

  // Zoom controls
  const currentZoom = useMemo(() => Math.round(viewport.zoom * 100), [viewport.zoom]);
  const ZOOM_FACTOR = 1.2;

  const handleZoom = useCallback((factor: number) => {
    const center = getCanvasCenter();
    zoomAction(factor, center?.x, center?.y);
  }, [zoomAction]);

  const handleZoomIn = useCallback(() => handleZoom(ZOOM_FACTOR), [handleZoom]);
  const handleZoomOut = useCallback(() => handleZoom(1 / ZOOM_FACTOR), [handleZoom]);
  const hasActiveArtboard = useMemo(() => hasActiveArtboardForFit(artboard), [artboard]);
  const handleFitArtboard = useCallback(() => {
    const nextViewport = fitViewportToActiveArtboard({
      viewport,
      canvasSize,
      artboard,
    });
    if (!nextViewport) {
      return;
    }
    setViewport(nextViewport);
  }, [artboard, canvasSize, setViewport, viewport]);

  const handleViewportUpdate = useCallback(
    (centerX: number, centerY: number) => {
      // Get the bounds that should limit movement (whichever is larger)
      const movementBounds = minimapMetrics?.bounds;

      if (!movementBounds) {
        return;
      }

      // Calculate viewport dimensions in world coordinates
      const viewWidth = canvasSize.width / viewport.zoom;
      const viewHeight = canvasSize.height / viewport.zoom;
      const halfViewWidth = viewWidth / 2;
      const halfViewHeight = viewHeight / 2;

      // Clamp the center position to keep the viewport within bounds
      const clampedCenterX = Math.max(
        movementBounds.minX + halfViewWidth,
        Math.min(centerX, movementBounds.maxX - halfViewWidth)
      );
      const clampedCenterY = Math.max(
        movementBounds.minY + halfViewHeight,
        Math.min(centerY, movementBounds.maxY - halfViewHeight)
      );

      // Calculate target pan values
      const targetPanX = canvasSize.width / 2 - clampedCenterX * viewport.zoom;
      const targetPanY = canvasSize.height / 2 - clampedCenterY * viewport.zoom;

      // Apply damping factor for smoother, more controllable movement (0-1, lower = heavier)
      const dampingFactor = 0.15;

      // Interpolate between current and target position
      const panX = viewport.panX + (targetPanX - viewport.panX) * dampingFactor;
      const panY = viewport.panY + (targetPanY - viewport.panY) * dampingFactor;

      setViewport({ panX, panY });
    },
    [canvasSize.height, canvasSize.width, setViewport, viewport.zoom, viewport.panX, viewport.panY, minimapMetrics]
  );

  const getWorldPoint = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!minimapMetrics || !svgRef.current) {
        return null;
      }

      const rect = svgRef.current.getBoundingClientRect();
      const localX = ((event.clientX - rect.left) / rect.width) * minimapSize.width;
      const localY = ((event.clientY - rect.top) / rect.height) * minimapSize.height;

      return {
        x: minimapToWorld(localX, minimapMetrics.scale, minimapMetrics.offsetX),
        y: minimapToWorld(localY, minimapMetrics.scale, minimapMetrics.offsetY),
      };
    },
    [minimapMetrics, minimapSize]
  );

  const handleElementDoubleClick = useCallback(
    (bounds: Bounds) => {
      // Calculate the center of the element
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // Calculate the dimensions of the element
      const elementWidth = bounds.maxX - bounds.minX;
      const elementHeight = bounds.maxY - bounds.minY;

      // Calculate zoom to fit the element in the viewport with some padding
      const padding = 100; // pixels of padding around the element
      const targetWidth = elementWidth + padding * 2;
      const targetHeight = elementHeight + padding * 2;

      // Calculate zoom level to fit element in viewport
      const zoomX = canvasSize.width / targetWidth;
      const zoomY = canvasSize.height / targetHeight;
      const newZoom = Math.min(zoomX, zoomY, 4); // Cap at 4x zoom

      // Calculate pan to center the element
      const panX = canvasSize.width / 2 - centerX * newZoom;
      const panY = canvasSize.height / 2 - centerY * newZoom;

      setViewport({ panX, panY, zoom: newZoom });
    },
    [canvasSize.width, canvasSize.height, setViewport]
  );

  const handleElementClick = useCallback(
    (elementId: string, bounds: Bounds) => {
      const now = Date.now();
      const DOUBLE_CLICK_THRESHOLD = 300; // ms

      if (
        lastClickRef.current &&
        lastClickRef.current.elementId === elementId &&
        now - lastClickRef.current.time < DOUBLE_CLICK_THRESHOLD
      ) {
        // Double click detected!
        lastClickRef.current = null; // Reset
        handleElementDoubleClick(bounds);
      } else {
        // Single click
        lastClickRef.current = { elementId, time: now };
      }
    },
    [handleElementDoubleClick]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!minimapMetrics) {
        return;
      }

      const worldPoint = getWorldPoint(event);
      if (!worldPoint) {
        return;
      }

      // Check if clicking on an element (don't interfere with click events)
      const target = event.target as SVGElement;
      const isElement = target.dataset?.elementId;

      if (isElement) {
        return; // Don't start drag on element click, let onClick handle it
      }

      event.preventDefault();
      event.stopPropagation();

      const viewBounds = viewportBounds;
      const viewCenter = {
        x: viewBounds.minX + (viewBounds.maxX - viewBounds.minX) / 2,
        y: viewBounds.minY + (viewBounds.maxY - viewBounds.minY) / 2,
      };

      const isViewportHandle = (event.target as SVGElement).dataset.role === 'minimap-viewport';
      const offset = isViewportHandle
        ? {
          x: worldPoint.x - viewCenter.x,
          y: worldPoint.y - viewCenter.y,
        }
        : { x: 0, y: 0 };

      setDragState({
        isActive: true,
        pointerId: event.pointerId,
        offset,
      });

      svgRef.current?.setPointerCapture(event.pointerId);
      handleViewportUpdate(worldPoint.x - offset.x, worldPoint.y - offset.y);
    },
    [getWorldPoint, handleViewportUpdate, minimapMetrics, viewportBounds]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState.isActive) {
        return;
      }

      const worldPoint = getWorldPoint(event);
      if (!worldPoint) {
        return;
      }

      handleViewportUpdate(worldPoint.x - dragState.offset.x, worldPoint.y - dragState.offset.y);
    },
    [dragState, getWorldPoint, handleViewportUpdate]
  );

  const resetDragState = useCallback(() => {
    setDragState({
      isActive: false,
      pointerId: null,
      offset: { x: 0, y: 0 },
    });
  }, []);

  const handlePointerEnd = useCallback(() => {
    if (dragState.pointerId !== null) {
      svgRef.current?.releasePointerCapture(dragState.pointerId);
    }
    if (dragState.isActive) {
      resetDragState();
    }
  }, [dragState, resetDragState]);

  if (!shouldShowMinimap || !minimapMetrics) {
    return null;
  }

  const viewBounds = viewportBounds;
  const viewportRect = {
    x: worldToMinimap(viewBounds.minX, minimapMetrics.scale, minimapMetrics.offsetX),
    y: worldToMinimap(viewBounds.minY, minimapMetrics.scale, minimapMetrics.offsetY),
    width: (viewBounds.maxX - viewBounds.minX) * minimapMetrics.scale,
    height: (viewBounds.maxY - viewBounds.minY) * minimapMetrics.scale,
  };
  const artboardRect = artboardBounds
    ? {
      x: worldToMinimap(artboardBounds.minX, minimapMetrics.scale, minimapMetrics.offsetX),
      y: worldToMinimap(artboardBounds.minY, minimapMetrics.scale, minimapMetrics.offsetY),
      width: (artboardBounds.maxX - artboardBounds.minX) * minimapMetrics.scale,
      height: (artboardBounds.maxY - artboardBounds.minY) * minimapMetrics.scale,
    }
    : null;

  if (isMinimized) {
    return (
      <Box
        position="fixed"
        bottom={MINIMAP_MINIMIZED_BOTTOM}
        right={`${MINIMAP_MARGIN + (isSidebarPinned || isSidebarOpen ? sidebarWidth : 0)}px`}
        zIndex={100}
        display={{ base: 'none', md: 'block' }}
        transition="right 0.2s ease"
        data-testid="minimap-minimized"
      >
        <MinimapTopBar
          isMinimized={isMinimized}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
          currentZoom={currentZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={resetZoom}
          hasActiveArtboard={hasActiveArtboard}
          onFitArtboard={handleFitArtboard}
        />
        <RenderCountBadgeWrapper componentName="MinimapPanel" position="top-right" />
      </Box>
    );
  }

  return (
    <Flex
      direction="column"
      data-testid="minimap-container"
      position="fixed"
      bottom={`${MINIMAP_MARGIN}px`}
      right={`${MINIMAP_MARGIN + (isSidebarPinned || isSidebarOpen ? sidebarWidth : 0)}px`}
      width={`${minimapSize.width}px`}
      height={`${minimapSize.height + TOP_BAR_HEIGHT}px`}
      borderTopRadius="2xl"
      borderBottomRadius="0"
      borderWidth={borderWidth}
      borderColor={borderColor}
      boxShadow={containerShadow}
      backdropFilter="blur(10px)"
      bg={containerBg}
      overflow="hidden"
      zIndex={100}
      transition="right 0.2s ease"
      display={{ base: 'none', md: 'flex' }}
    >
      <MinimapTopBar
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
        currentZoom={currentZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={resetZoom}
        hasActiveArtboard={hasActiveArtboard}
        onFitArtboard={handleFitArtboard}
      />

      <Box flex="1" width="100%" height="0" position="relative">
        <svg
          ref={svgRef}
          data-testid="minimap-svg"
          viewBox={`0 0 ${minimapSize.width} ${minimapSize.height}`}
          width="100%"
          height="100%"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          style={{ cursor: dragState.isActive ? 'grabbing' : 'grab', display: 'block' }}
        >
          <defs>
            <clipPath id={clipPathId}>
              <rect x="0" y="0" width={minimapSize.width} height={minimapSize.height} />
            </clipPath>
          </defs>
          <rect x="0" y="0" width={minimapSize.width} height={minimapSize.height} fill={canvasFill} />
          <g clipPath={`url(#${clipPathId})`}>
            {artboardRect && (
              <rect
                x={artboardRect.x}
                y={artboardRect.y}
                width={Math.max(1, artboardRect.width)}
                height={Math.max(1, artboardRect.height)}
                fill={artboardFill}
                stroke={artboardStroke}
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
            )}
            {visibleElements.map((element) => {
              const bounds = getElementBounds(element, elementMap);
              if (!bounds) return null;

              const x = worldToMinimap(bounds.minX, minimapMetrics.scale, minimapMetrics.offsetX);
              const y = worldToMinimap(bounds.minY, minimapMetrics.scale, minimapMetrics.offsetY);
              const width = (bounds.maxX - bounds.minX) * minimapMetrics.scale;
              const height = (bounds.maxY - bounds.minY) * minimapMetrics.scale;

              const isSelected = selectedIds.includes(element.id);

              return (
                <rect
                  key={element.id}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={isSelected ? selectedElementFill : elementFill}
                  stroke={isSelected ? selectedElementStroke : elementStroke}
                  strokeWidth={0.5}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: 'pointer' }}
                  data-element-id={element.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleElementClick(element.id, bounds);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                />
              );
            })}
          </g>
          {/* Viewport rectangle - separated into layers to allow element clicks underneath */}
          <g>
            {/* Visual fill (no pointer events) */}
            <rect
              x={viewportRect.x}
              y={viewportRect.y}
              width={Math.max(16, viewportRect.width)}
              height={Math.max(16, viewportRect.height)}
              fill={viewportFill}
              stroke="none"
              style={{ pointerEvents: 'none' }}
            />
            {/* Invisible thick stroke for drag interaction */}
            <rect
              x={viewportRect.x}
              y={viewportRect.y}
              width={Math.max(16, viewportRect.width)}
              height={Math.max(16, viewportRect.height)}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              data-role="minimap-viewport"
              style={{ cursor: 'move' }}
            />
            {/* Visible stroke (no pointer events) */}
            <rect
              x={viewportRect.x}
              y={viewportRect.y}
              width={Math.max(16, viewportRect.width)}
              height={Math.max(16, viewportRect.height)}
              fill="none"
              stroke={viewportStroke}
              strokeWidth={2}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        </svg>
      </Box>
      <RenderCountBadgeWrapper componentName="MinimapPanel" position="top-right" />
    </Flex>
  );
};
