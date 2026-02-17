import React, { useMemo, useCallback } from 'react';
import { HStack } from '@chakra-ui/react';
import { useShallow } from 'zustand/react/shallow';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  MousePointer,
  PenTool,
  Wrench,
  Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { pluginManager, useVisibleToolIds, useDisabledToolIds } from '../utils/pluginManager';
import { FloatingContextMenuButton } from './FloatingContextMenuButton';
import { useEnabledPlugins, useSidebarLayout } from '../hooks';
import { getCanvasCenter } from '../utils/domHelpers';
import { ToolGroupAction } from './ToolGroupAction';
import {
  fitViewportToActiveArtboard,
  hasActiveArtboardForFit,
} from '../utils/artboardViewportFitUtils';

/**
 * BottomActionBar - Undo/Redo, Zoom controls, and context menu
 * Now also includes grouped tool actions
 */
export const BottomActionBar: React.FC = () => {
  // Get effective sidebar width using consolidated hook
  const { effectiveSidebarWidth, effectiveLeftSidebarWidth } = useSidebarLayout();

  // Get canvas state
  const {
    zoom,
    resetZoom,
    setViewport,
    viewport,
    canvasSize,
    artboard,
    activeMode,
    setMode,
    viewportZoom,
    lastUsedToolByGroup,
    updateLastUsedTool,
    showMinimap,
  } = useCanvasStore(
    useShallow((state) => ({
      zoom: state.zoom,
      resetZoom: state.resetZoom,
      setViewport: state.setViewport,
      viewport: state.viewport,
      canvasSize: state.canvasSize,
      artboard: state.artboard,
      activeMode: state.activePlugin,
      setMode: state.setMode,
      viewportZoom: state.viewport.zoom,
      lastUsedToolByGroup: state.lastUsedToolByGroup,
      updateLastUsedTool: state.updateLastUsedTool,
      showMinimap: state.settings.showMinimap,
    }))
  );

  // Check if active plugin disables global undo/redo (fully decoupled from plugin internals)
  // const isUndoRedoDisabledByPlugin = useIsGlobalUndoRedoDisabled();

  // useTemporalState logic moved to top right controls
  // const { undo, redo, pastStates, futureStates } = useTemporalState();

  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  const enabledPlugins = useEnabledPlugins();
  const isMinimapEnabled = enabledPlugins.includes('minimap');
  const shouldShowMinimap = isMinimapEnabled && showMinimap;

  // Get visible and disabled tool IDs
  const visibleToolIds = useVisibleToolIds();
  const disabledToolIds = useDisabledToolIds();

  // Calculate current zoom percentage - memoize based only on zoom value
  const currentZoom = useMemo(() => Math.round((viewportZoom as number) * 100), [viewportZoom]);
  const isZoomDifferent = currentZoom !== 100;
  const hasActiveArtboard = useMemo(() => hasActiveArtboardForFit(artboard), [artboard]);

  const zoomFactor = 1.2;
  const zoomFromCenter = (factor: number) => {
    const center = getCanvasCenter();
    zoom(factor, center?.x, center?.y);
  };
  const fitArtboardToViewport = useCallback(() => {
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

  // Helper to get tools for a group
  const getToolsForGroup = useCallback((groupName: string) => {
    return pluginManager.getRegisteredTools()
      .filter(p => p.toolDefinition?.toolGroup === groupName)
      .filter(p => visibleToolIds.includes(p.id))
      .sort((a, b) => (a.toolDefinition?.order ?? 999) - (b.toolDefinition?.order ?? 999))
      .map(p => ({
        id: p.id,
        label: p.metadata.label ?? p.id,
        icon: p.metadata.icon ?? Menu as unknown as LucideIcon | React.ComponentType<{ size?: number }>,
        isDisabled: disabledToolIds.includes(p.id),
      }));
  }, [visibleToolIds, disabledToolIds]);

  const basicTools = useMemo(() => getToolsForGroup('basic'), [getToolsForGroup]);
  const creationTools = useMemo(() => getToolsForGroup('creation'), [getToolsForGroup]);
  const advancedTools = useMemo(() => getToolsForGroup('advanced'), [getToolsForGroup]);

  // Determine default tool for each group
  const getDefaultToolForGroup = useCallback((group: 'basic' | 'creation' | 'advanced', tools: Array<{ id: string }>) => {
    // For basic group, always return 'select'
    if (group === 'basic') {
      return 'select';
    }
    // For other groups, use last used tool if it exists and is available, otherwise first tool
    const lastUsed = lastUsedToolByGroup[group];
    if (lastUsed && tools.some(t => t.id === lastUsed)) {
      return lastUsed;
    }
    return tools[0]?.id;
  }, [lastUsedToolByGroup]);

  // Handler that updates last used tool and activates the mode
  const handleToolSelect = useCallback((group: 'basic' | 'creation' | 'advanced' | null, toolId: string) => {
    if (group) {
      updateLastUsedTool(group, toolId);
    }
    setMode(toolId);
  }, [setMode, updateLastUsedTool]);

  // Helper to get active tool in a group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getActiveToolInGroup = useCallback((tools: Array<{ id: string, icon: any }>, defaultIcon: any) => {
    const activeTool = tools.find(t => t.id === activeMode);
    return activeTool ? { isActive: true, icon: activeTool.icon } : { isActive: false, icon: defaultIcon };
  }, [activeMode]);

  const basicGroupState = getActiveToolInGroup(basicTools, MousePointer);
  const creationGroupState = getActiveToolInGroup(creationTools, PenTool);
  const advancedGroupState = getActiveToolInGroup(advancedTools, Wrench);

  const pluginBottomActions = pluginManager.getActions('bottom');

  return (
    <FloatingToolbarShell
      toolbarPosition="bottom"
      sidebarWidth={effectiveSidebarWidth}
      leftSidebarWidth={effectiveLeftSidebarWidth}
      boxShadow="none"
      borderWidth="0px"
      borderColor="transparent"
      _dark={{
        borderWidth: '0px',
        borderColor: 'transparent',
      }}
      sx={{
        transition: 'left 0.3s ease-in-out, right 0.3s ease-in-out, transform 0.3s ease-in-out',
      }}
    >
      <HStack spacing={0}>
        {pluginBottomActions.length > 0 ? (
          pluginBottomActions.map((action) => {
            const ActionComponent = action.component as React.ComponentType<Record<string, unknown>>;
            return <ActionComponent key={action.id} />;
          })
        ) : (
          <>
            {/* Basic Tools Group */}
            <ToolGroupAction
              label="Basic Tools"
              icon={basicGroupState.icon}
              isActive={basicGroupState.isActive}
              tools={basicTools}
              currentToolId={activeMode ?? undefined}
              onToolSelect={(toolId) => handleToolSelect('basic', toolId)}
              toolGroup="basic"
              defaultToolId={getDefaultToolForGroup('basic', basicTools)}
            />

            {/* Creation Tools Group */}
            <ToolGroupAction
              label="Creation Tools"
              icon={creationGroupState.icon}
              isActive={creationGroupState.isActive}
              tools={creationTools}
              currentToolId={activeMode ?? undefined}
              onToolSelect={(toolId) => handleToolSelect('creation', toolId)}
              toolGroup="creation"
              defaultToolId={getDefaultToolForGroup('creation', creationTools)}
            />

            {/* Advanced Tools Group */}
            <ToolGroupAction
              label="Advanced Tools"
              icon={advancedGroupState.icon}
              isActive={advancedGroupState.isActive}
              tools={advancedTools}
              currentToolId={activeMode ?? undefined}
              onToolSelect={(toolId) => handleToolSelect('advanced', toolId)}
              toolGroup="advanced"
              defaultToolId={getDefaultToolForGroup('advanced', advancedTools)}
            />

            {/* Undo/Redo Group removed - moved to top right */}

            {/* Zoom Group via Menu - Only show if Minimap is NOT visible */}
            {!shouldShowMinimap && (
              <ToolGroupAction
                label="Zoom Controls"
                icon={ZoomIn}
                isActive={false} // Zoom actions don't have a "mode"
                tools={[
                  { id: 'zoom-in', label: 'Zoom In', icon: ZoomIn },
                  { id: 'zoom-out', label: 'Zoom Out', icon: ZoomOut },
                  ...(hasActiveArtboard
                    ? [{ id: 'fit-artboard', label: 'Fit Artboard', icon: Maximize }]
                    : []),
                  { id: 'reset-zoom', label: 'Reset Zoom', icon: Maximize2 },
                ]}
                currentToolId=""
                onToolSelect={(id) => {
                  if (id === 'zoom-in') zoomFromCenter(zoomFactor);
                  if (id === 'zoom-out') zoomFromCenter(1 / zoomFactor);
                  if (id === 'fit-artboard') fitArtboardToViewport();
                  if (id === 'reset-zoom') resetZoom();
                }}
                counter={isZoomDifferent ? `${currentZoom}%` : undefined}
              />
            )}

            {/* Context Menu Button (replaces Delete button) */}
            <FloatingContextMenuButton />
          </>
        )}
      </HStack>
      <RenderCountBadgeWrapper componentName="BottomActionBar" position="bottom-right" />
    </FloatingToolbarShell>
  );
};
