import { useMemo, type ElementType } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGroupActions } from './useGroupActions';
import { useSidebarLayout } from './useSidebarLayout';
import { useAlignmentActions } from './useAlignmentActions';
import { useClipboardActions } from './useClipboardActions';
import { useEnabledPlugins } from './useEnabledPlugins';
import { useCanvasStore } from '../store/canvasStore';
import type { FloatingContextMenuAction } from '../types/plugins';
import type { SelectionContextInfo } from '../types/selection';
import { pluginManager } from '../utils/pluginManager';
import { PanelLeft, PanelRight } from 'lucide-react';

export interface ContextActionConfig {
  alignment: boolean;
  plugin: boolean;
  group: boolean;
  clipboard: boolean;
}

const DEFAULT_CONTEXT_ACTION_CONFIG: Record<string, ContextActionConfig> = {
  'multiselection': { alignment: true, plugin: true, group: true, clipboard: true },
  'group': { alignment: true, plugin: true, group: true, clipboard: true },
  'path': { alignment: true, plugin: true, group: true, clipboard: true },
  'element': { alignment: true, plugin: true, group: true, clipboard: true },
  'subpath': { alignment: true, plugin: true, group: false, clipboard: true },
  'canvas': { alignment: false, plugin: true, group: false, clipboard: false },
  'point-anchor-m': { alignment: true, plugin: true, group: false, clipboard: false },
  'point-anchor-l': { alignment: true, plugin: true, group: false, clipboard: false },
  'point-anchor-c': { alignment: true, plugin: true, group: false, clipboard: false },
  'point-control': { alignment: true, plugin: true, group: false, clipboard: false },
};

const pluginContextConfigs: Map<string, ContextActionConfig> = new Map();

export function registerContextActionConfig(type: string, config: ContextActionConfig): void {
  pluginContextConfigs.set(type, config);
}

export function unregisterContextActionConfig(type: string): void {
  pluginContextConfigs.delete(type);
}

function getContextActionConfig(type: string): ContextActionConfig | undefined {
  return pluginContextConfigs.get(type) ?? DEFAULT_CONTEXT_ACTION_CONFIG[type];
}

export function useFloatingContextMenuActions(
  context: SelectionContextInfo | null
): FloatingContextMenuAction[] {
  const enabledPlugins = useEnabledPlugins();

  const { isSidebarPinned } = useSidebarLayout();
  const {
    isSidebarOpen,
    toggleSidebar,
    showLeftSidebar,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
    toggleLeftSidebar,
  } = useCanvasStore(
    useShallow((state) => ({
      isSidebarOpen: state.isSidebarOpen,
      toggleSidebar: state.toggleSidebar,
      showLeftSidebar: state.settings.showLeftSidebar,
      isLeftSidebarPinned: state.isLeftSidebarPinned,
      isLeftSidebarOpen: state.isLeftSidebarOpen,
      toggleLeftSidebar: state.toggleLeftSidebar,
    }))
  );

  const { actions: groupActions } = useGroupActions(context);
  const alignmentActions = useAlignmentActions(context);
  const clipboardActions = useClipboardActions(context);

  const pluginActions = useMemo(() => {
    if (!context) return [];

    const actions: FloatingContextMenuAction[] = [];
    pluginManager.getRegisteredTools().forEach((plugin) => {
      plugin.contextMenuActions?.forEach((contribution) => {
        const action = contribution.action(context);
        if (action) {
          actions.push(action);
        }
      });
    });
    return actions;
    // enabledPlugins is needed to invalidate when plugins are toggled
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, enabledPlugins]);

  const sidebarAction = useMemo<FloatingContextMenuAction>(() => ({
    id: 'toggle-sidebar',
    label: isSidebarOpen ? 'Close sidebar' : 'Open sidebar',
    icon: PanelLeft as unknown as ElementType,
    onClick: toggleSidebar,
  }), [isSidebarOpen, toggleSidebar]);

  const leftSidebarAction = useMemo<FloatingContextMenuAction>(() => ({
    id: 'toggle-left-sidebar',
    label: isLeftSidebarOpen ? 'Close left sidebar' : 'Open left sidebar',
    icon: PanelRight as unknown as ElementType,
    onClick: toggleLeftSidebar,
  }), [isLeftSidebarOpen, toggleLeftSidebar]);

  return useMemo<FloatingContextMenuAction[]>(() => {
    const sidebarActions: FloatingContextMenuAction[] = [];
    if (!isSidebarPinned) {
      sidebarActions.push(sidebarAction);
    }
    if (showLeftSidebar && !isLeftSidebarPinned) {
      sidebarActions.push(leftSidebarAction);
    }

    if (!context) {
      return sidebarActions;
    }

    const config = getContextActionConfig(context.type);
    if (!config) {
      return sidebarActions;
    }

    const result: FloatingContextMenuAction[] = [];
    if (config.alignment) result.push(...alignmentActions);
    if (config.plugin) result.push(...pluginActions);
    if (config.group) result.push(...groupActions);
    if (config.clipboard) result.push(...clipboardActions);
    result.push(...sidebarActions);
    return result;
  }, [
    context,
    alignmentActions,
    pluginActions,
    groupActions,
    clipboardActions,
    isSidebarPinned,
    sidebarAction,
    showLeftSidebar,
    isLeftSidebarPinned,
    leftSidebarAction,
  ]);
}
