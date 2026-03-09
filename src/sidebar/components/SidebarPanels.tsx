import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Badge, Box, useColorModeValue } from '@chakra-ui/react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasStore } from '../../store/canvasStore';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useEnabledPlugins } from '../../hooks/useEnabledPlugins';
import { usePluginRegistrationVersion } from '../../hooks/usePluginRegistrationVersion';
import { AutoPanelKeyProvider } from '../../contexts/AutoPanelKeyProvider';
import {
  getPanelConfigs,
} from './panelConfig';
import type { PanelComponentProps, PanelConfig } from '../../types/panel';
import { pluginManager } from '../../utils/pluginManager';

type ReactLazyLike = {
  _payload?: unknown;
  _init?: (payload: unknown) => unknown;
};

const PREFS_PRELOAD_CONTEXT = {
  activePlugin: null,
  showFilePanel: false,
  showSettingsPanel: true,
  showLibraryPanel: false,
  isInSpecialPanelMode: true,
  canPerformOpticalAlignment: false,
  llmAssistantConfigured: false,
  selectedSubpathsCount: 0,
  selectedCommandsCount: 0,
  selectedPathsCount: 0,
  selectedElementsCount: 0,
  totalElementsCount: 0,
  hasPathWithMultipleSubpaths: false,
  canApplyOffset: () => false,
  activeGroupId: null,
  selectedGroupsCount: 0,
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => (
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  'then' in value &&
  typeof value.then === 'function'
);

// React.lazy has no public preload API, so we opportunistically trigger its loader in idle time.
const preloadLazyPanelComponent = async (component: PanelConfig['component']): Promise<void> => {
  const lazyComponent = component as ReactLazyLike;
  if (typeof lazyComponent._init !== 'function' || !('_payload' in lazyComponent)) {
    return;
  }

  try {
    lazyComponent._init(lazyComponent._payload);
  } catch (error) {
    if (isPromiseLike(error)) {
      await Promise.resolve(error).then(() => undefined, () => undefined);
    }
  }
};

const getSettingsPanelSortGroup = (panelConfig: { key: string }): number => {
  if (panelConfig.key === 'settings') return 0;
  if (panelConfig.key === 'snap-points') return 1;
  if (panelConfig.key === 'documentation') return 3;
  return 2;
};

const getSettingsPanelSortLabel = (panelConfig: { key: string; pluginId?: string }): string => {
  if ('settingsTitle' in panelConfig && typeof panelConfig.settingsTitle === 'string') {
    return panelConfig.settingsTitle;
  }
  if (panelConfig.pluginId) {
    return pluginManager.getPlugin(panelConfig.pluginId)?.metadata.label ?? panelConfig.key;
  }
  return panelConfig.key;
};

const SELECT_PANEL_SORT_TITLE_OVERRIDES: Record<string, string> = {
  filter: 'Filters',
  llmAssistant: 'Assistant',
};

const getSelectPanelSortLabel = (panelConfig: { key: string; pluginId?: string }): string => {
  if (panelConfig.pluginId && SELECT_PANEL_SORT_TITLE_OVERRIDES[panelConfig.pluginId]) {
    return SELECT_PANEL_SORT_TITLE_OVERRIDES[panelConfig.pluginId];
  }

  if (panelConfig.pluginId) {
    return pluginManager.getPlugin(panelConfig.pluginId)?.metadata.label ?? panelConfig.key;
  }

  return panelConfig.key;
};

type SidebarPanelsExtendedStore = CanvasStore & {
  llmAssistant?: {
    settings?: {
      apiKey?: string;
      model?: string;
      baseUrl?: string;
    };
  };
  groupEditor?: {
    activeGroupId: string | null;
  };
};

const selectSidebarPanelsState = (state: CanvasStore) => {
  const selectedIds = state.selectedIds ?? [];
  const elements = state.elements ?? [];
  const elementMap = new Map(elements.map((element) => [element.id, element]));

  let selectedPathsCount = 0;
  let selectedGroupsCount = 0;
  let hasPathWithMultipleSubpaths = false;

  selectedIds.forEach((id) => {
    const element = elementMap.get(id);
    if (!element) {
      return;
    }

    if (element.type === 'path') {
      selectedPathsCount += 1;
      if (!hasPathWithMultipleSubpaths) {
        const subPaths = (element.data as { subPaths?: unknown[] }).subPaths;
        hasPathWithMultipleSubpaths = Array.isArray(subPaths) && subPaths.length > 1;
      }
      return;
    }

    if (element.type === 'group') {
      selectedGroupsCount += 1;
    }
  });

  const extendedState = state as SidebarPanelsExtendedStore;
  const llmAssistantSettings = extendedState.llmAssistant?.settings;
  const groupEditor = extendedState.groupEditor;

  return {
    canPerformOpticalAlignment: state.canPerformOpticalAlignment?.() ?? false,
    selectedSubpathsCount: state.selectedSubpaths?.length ?? 0,
    selectedCommandsCount: state.selectedCommands?.length ?? 0,
    selectedPathsCount,
    selectedElementsCount: selectedIds.length,
    totalElementsCount: elements.length,
    hasPathWithMultipleSubpaths,
    showRenderCountBadges: state.settings.showRenderCountBadges,
    maximizedSidebarPanelKey: state.maximizedSidebarPanelKey,
    setMaximizedSidebarPanelKey: state.setMaximizedSidebarPanelKey,
    activeGroupId: groupEditor?.activeGroupId ?? null,
    selectedGroupsCount,
    canApplyOffset: state.canApplyOffset,
    llmAssistantConfigured: Boolean(
      llmAssistantSettings?.apiKey?.trim() &&
      llmAssistantSettings?.model?.trim() &&
      llmAssistantSettings?.baseUrl?.trim()
    ),
  };
};

/**
 * Main panels section of the sidebar with conditional rendering
 * Uses a data-driven approach to render panels based on configuration.
 * State comes from SidebarContext and store directly.
 */
export const SidebarPanels: React.FC = () => {
  // Get state from sidebar context
  const { activePlugin, showFilePanel, showSettingsPanel, showLibraryPanel } = useSidebarContext();

  const scrollbarTrack = useColorModeValue('#f1f1f1', 'rgba(255, 255, 255, 0.06)');
  const scrollbarThumb = useColorModeValue('#888', 'rgba(255, 255, 255, 0.3)');
  const panelLoadingBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  const enabledPlugins = useEnabledPlugins();
  const registrationVersion = usePluginRegistrationVersion();
  const preloadedPrefsPanelKeysRef = useRef<Set<string>>(new Set());

  const scrollbarThumbHover = useColorModeValue('#555', 'rgba(255, 255, 255, 0.45)');

  // Check if we're in special panel mode (file or settings)
  const isInSpecialPanelMode = showFilePanel || showSettingsPanel || showLibraryPanel;

  // Gen/Audit panels also hide the footer but are NOT treated as special panel mode
  // (so their own tool panels still render via createToolPanel's !isInSpecialPanelMode check)
  const isFooterHidingPlugin = activePlugin === 'generatorLibrary' || activePlugin === 'animLibrary' || activePlugin === 'auditLibrary' || activePlugin === 'svgStructure';

  const {
    canPerformOpticalAlignment,
    selectedSubpathsCount,
    selectedCommandsCount,
    selectedPathsCount,
    selectedElementsCount,
    totalElementsCount,
    hasPathWithMultipleSubpaths,
    showRenderCountBadges,
    maximizedSidebarPanelKey,
    setMaximizedSidebarPanelKey,
    activeGroupId,
    selectedGroupsCount,
    canApplyOffset,
    llmAssistantConfigured,
  } = useCanvasStore(useShallow(selectSidebarPanelsState));

  const showPanelNameBadge = activePlugin === 'select' && showRenderCountBadges;

  // Prepare the context for condition evaluation
  const conditionContext = useMemo(() => ({
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    showLibraryPanel,
    isInSpecialPanelMode,
    canPerformOpticalAlignment,
    selectedSubpathsCount,
    selectedCommandsCount,
    selectedPathsCount,
    selectedElementsCount,
    totalElementsCount,
    hasPathWithMultipleSubpaths,
    llmAssistantConfigured,
    canApplyOffset,
    activeGroupId,
    selectedGroupsCount,
  }), [
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    showLibraryPanel,
    isInSpecialPanelMode,
    canPerformOpticalAlignment,
    selectedSubpathsCount,
    selectedCommandsCount,
    selectedPathsCount,
    selectedElementsCount,
    totalElementsCount,
    hasPathWithMultipleSubpaths,
    llmAssistantConfigured,
    canApplyOffset,
    activeGroupId,
    selectedGroupsCount,
  ]);

  // Prepare all props for panels that might need them
  const allPanelProps: PanelComponentProps = useMemo(() => ({
    activePlugin,
  }), [activePlugin]);

  const renderWithPanelBadge = (child: React.ReactNode, label: string) => (
    showPanelNameBadge ? (
      <Box position="relative">
        <Badge
          position="absolute"
          top={1}
          right={1}
          zIndex={1}
          colorScheme="purple"
          variant="subtle"
          opacity={0.6}
          pointerEvents="none"
        >
          {label}
        </Badge>
        {child}
      </Box>
    ) : child
  );

  // Filter panel configs to only include panels from enabled plugins
  // Re-evaluate when plugins register or their enabled state changes.
  const filteredPanelConfigs = useMemo(() => {
    void enabledPlugins;
    void registrationVersion;

    return getPanelConfigs().filter(panelConfig => {
      // If panel has a pluginId property, check if that plugin is enabled
      if ('pluginId' in panelConfig && typeof panelConfig.pluginId === 'string') {
        return pluginManager.isPluginEnabled(panelConfig.pluginId);
      }
      // Built-in panels (file, settings, editor, pan, documentation) are always shown
      return true;
    });
  }, [enabledPlugins, registrationVersion]);

  const visiblePanelConfigs = useMemo(() => {
    const scopedPanels = (() => {
      if (!maximizedSidebarPanelKey) return filteredPanelConfigs;
      const match = filteredPanelConfigs.find(panelConfig => panelConfig.key === maximizedSidebarPanelKey);
      return match ? [match] : filteredPanelConfigs;
    })();

    if (showSettingsPanel && !maximizedSidebarPanelKey) {
      return [...scopedPanels].sort((a, b) => {
        const groupA = getSettingsPanelSortGroup(a);
        const groupB = getSettingsPanelSortGroup(b);

        if (groupA !== groupB) {
          return groupA - groupB;
        }

        if (groupA !== 2) {
          return 0;
        }

        return getSettingsPanelSortLabel(a).localeCompare(
          getSettingsPanelSortLabel(b),
          undefined,
          { sensitivity: 'base', numeric: true }
        );
      });
    }

    if (!isInSpecialPanelMode && activePlugin === 'select') {
      return [...scopedPanels].sort((a, b) =>
        getSelectPanelSortLabel(a).localeCompare(
          getSelectPanelSortLabel(b),
          undefined,
          { sensitivity: 'base', numeric: true }
        )
      );
    }

    return scopedPanels;
  }, [activePlugin, filteredPanelConfigs, isInSpecialPanelMode, maximizedSidebarPanelKey, showSettingsPanel]);

  const prefsPanelConfigs = useMemo(() => (
    filteredPanelConfigs.filter((panelConfig) => panelConfig.condition(PREFS_PRELOAD_CONTEXT))
  ), [filteredPanelConfigs]);

  useEffect(() => {
    if (!maximizedSidebarPanelKey) return;
    const match = filteredPanelConfigs.find(panelConfig => panelConfig.key === maximizedSidebarPanelKey);
    if (!match || !match.condition(conditionContext)) {
      setMaximizedSidebarPanelKey(null);
    }
  }, [conditionContext, filteredPanelConfigs, maximizedSidebarPanelKey, setMaximizedSidebarPanelKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const browserWindow = window;
    const requestIdleCallback = browserWindow.requestIdleCallback?.bind(browserWindow);
    const cancelIdleCallback = browserWindow.cancelIdleCallback?.bind(browserWindow);

    const pendingPanels = prefsPanelConfigs.filter((panelConfig) => !preloadedPrefsPanelKeysRef.current.has(panelConfig.key));
    if (pendingPanels.length === 0) {
      return;
    }

    let cancelled = false;
    const preload = () => {
      if (cancelled) {
        return;
      }

      pendingPanels.forEach((panelConfig) => {
        preloadedPrefsPanelKeysRef.current.add(panelConfig.key);
        void preloadLazyPanelComponent(panelConfig.component);
      });
    };

    if (requestIdleCallback && cancelIdleCallback) {
      const idleId = requestIdleCallback(preload, { timeout: 1200 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(preload, 250);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [prefsPanelConfigs]);

  const isFooterVisible = !isInSpecialPanelMode && !isFooterHidingPlugin && !maximizedSidebarPanelKey;
  const panelExclusivityNamespace = showSettingsPanel
    ? 'sidebar:prefs'
    : !isInSpecialPanelMode && (activePlugin === 'select' || activePlugin === 'edit')
      ? `sidebar:${activePlugin}`
      : null;

  return (
    <Box
      data-sidebar-scroll-area="true"
      flex={1}
      px={2}
      pb={isFooterVisible ? 0 : 0}
      mb={isFooterVisible ? 'var(--sidebar-footer-height, 0px)' : 0}
      overflowY="auto"
      overflowX="hidden"
      display="flex"
      flexDirection="column"
      gap={0}
      bg="surface.panel"
      minH={0} // Important: allows flex item to shrink below content size
      css={{
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {
          width: '0px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'transparent',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'transparent',
        },
        '[data-sidebar-shell="true"]:hover &': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${scrollbarThumb} ${scrollbarTrack}`,
        },
        '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar': {
          width: '8px',
        },
        '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar-track': {
          background: scrollbarTrack,
        },
        '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar-thumb': {
          background: scrollbarThumb,
        },
        '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar-thumb:hover': {
          background: scrollbarThumbHover,
        },
      }}
    >
      <AutoPanelKeyProvider namespace={panelExclusivityNamespace}>
        {visiblePanelConfigs.map((panelConfig) => {
          const shouldShow = panelConfig.condition(conditionContext);
          if (!shouldShow) {
            return null;
          }

          const PanelComponent = panelConfig.component;
          const panelProps = {
            ...allPanelProps,
            ...(panelConfig.getProps
              ? panelConfig.getProps(allPanelProps)
              : {}),
            panelKey: panelConfig.key,
          };
          const panelContent = renderWithPanelBadge(
            <PanelComponent {...panelProps} />,
            panelConfig.key
          );

          return (
            <Suspense key={panelConfig.key} fallback={<Box h="20px" bg={panelLoadingBg} />}>
              {panelContent}
            </Suspense>
          );
        })}
      </AutoPanelKeyProvider>
    </Box>
  );
};
