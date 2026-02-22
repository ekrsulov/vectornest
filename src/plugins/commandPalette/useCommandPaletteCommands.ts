/**
 * useCommandPaletteCommands - Collects all executable commands for the palette.
 * Aggregates: tool switching, core actions, context menu actions, keyboard shortcuts,
 * and panel listings from Gen, Audit, Prefs, and Lib tabs.
 */

import { useMemo } from 'react';
import { useEnabledPlugins } from '../../hooks';
import { pluginManager } from '../../utils/pluginManager';
import { useCanvasStore } from '../../store/canvasStore';
import { commandRegistry } from './commandRegistry';
import type { PaletteCommand } from './types';
import type { PluginPanelContribution } from '../../types/plugins';
import { panelRegistry } from '../../utils/panelRegistry';
import { useContextActions } from '../contextActions/useContextActions';
import {
  MousePointer,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Copy,
  Clipboard,
  Scissors,
  Eye,
  EyeOff,
  Sparkles,
  ClipboardCheck,
  Settings,
  Library,
  MousePointer2,
  FileText,
  Upload,
  Download,
  Image as ImageIcon,
  SlidersHorizontal,
  RotateCcw,
  FileCode,
  Bot,
  Settings2,
  Magnet,
  FolderTree,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { FilePanel } from '../../sidebar/panels/FilePanel';
import { EditorPanel } from '../../sidebar/panels/EditorPanel';
import { SvgStructurePanel } from '../svgStructure/SvgStructurePanel';
import { SourcePanel } from '../../plugins/source/SourcePanel';
import { LlmAssistantSettingsPanel } from '../../plugins/llmAssistant/LlmAssistantSettingsPanel';
import { ExportManager } from '../../utils/export/ExportManager';
import { ImportManager } from '../../utils/import/ImportManager';
import type { LlmAssistantSlice } from '../../plugins/llmAssistant/slice';

/**
 * Collect panels contributed to a target plugin id via relatedPluginPanels.
 * Each panel becomes a command that, when selected, opens a modal with the panel component.
 */
function collectRelatedPanels(
  targetPluginId: string,
  category: string,
  fallbackIcon: ComponentType<{ size?: number }>,
  sortAlphabetically: boolean
): PaletteCommand[] {
  const panels: Array<{
    id: string;
    label: string;
    component: ComponentType;
    icon: ComponentType<{ size?: number }> | undefined;
    order: number;
  }> = [];

  pluginManager.getRegisteredTools().forEach((plugin) => {
    plugin.relatedPluginPanels?.forEach((panelContrib: PluginPanelContribution) => {
      if (panelContrib.targetPlugin === targetPluginId) {
        panels.push({
          id: panelContrib.id,
          label: plugin.metadata.label ?? panelContrib.id,
          component: panelContrib.component as ComponentType,
          icon: plugin.metadata.icon as ComponentType<{ size?: number }> | undefined,
          order: panelContrib.order ?? 999,
        });
      }
    });
  });

  if (sortAlphabetically) {
    panels.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true })
    );
  } else {
    panels.sort((a, b) => a.order - b.order);
  }

  return panels.map((panel) => ({
    id: `panel-${targetPluginId}-${panel.id}`,
    label: panel.label,
    category,
    icon: panel.icon ?? fallbackIcon,
    execute: () => {
      // No-op: the overlay handles opening the modal via panelComponent
    },
    panelComponent: panel.component,
    panelLabel: panel.label,
    keywords: [targetPluginId, category.toLowerCase(), panel.label.toLowerCase(), 'panel'],
  }));
}

/**
 * Commands for actions and panels in the File panel.
 */
function collectFilePanelCommands(): PaletteCommand[] {
  return [
    {
      id: 'file-name',
      label: 'Document Name',
      category: 'File',
      icon: FileText,
      execute: () => {},
      panelComponent: FilePanel,
      panelLabel: 'File',
      keywords: ['name', 'document', 'title', 'rename', 'file'],
    },
    {
      id: 'file-import-svg',
      label: 'Import SVG',
      category: 'File',
      icon: Upload,
      execute: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.svg,image/svg+xml';
        input.multiple = true;
        input.addEventListener('change', async (e) => {
          const target = e.target as HTMLInputElement;
          if (!target.files?.length) return;
          const { settings } = useCanvasStore.getState();
          await ImportManager.importFiles(target.files, {
            appendMode: true,
            resizeImport: settings.importResize,
            resizeWidth: settings.importResizeWidth,
            resizeHeight: settings.importResizeHeight,
            applyUnion: settings.importApplyUnion,
            addFrame: settings.importAddFrame,
          });
        });
        input.click();
      },
      keywords: ['import', 'svg', 'open', 'load', 'file'],
    },
    {
      id: 'file-export-svg',
      label: 'Export SVG',
      category: 'File',
      icon: Download,
      execute: () => {
        const { documentName, settings } = useCanvasStore.getState();
        ExportManager.exportSelection('svg', documentName, false, settings.exportPadding);
      },
      keywords: ['export', 'save', 'svg', 'download'],
    },
    {
      id: 'file-export-png',
      label: 'Export PNG',
      category: 'File',
      icon: ImageIcon,
      execute: () => {
        const { documentName, settings } = useCanvasStore.getState();
        ExportManager.exportSelection('png', documentName, false, settings.exportPadding);
      },
      keywords: ['export', 'save', 'png', 'image', 'download'],
    },
    {
      id: 'file-advanced',
      label: 'Advanced Options',
      category: 'File',
      icon: SlidersHorizontal,
      execute: () => {},
      panelComponent: FilePanel,
      panelLabel: 'File',
      keywords: ['advanced', 'options', 'import', 'export', 'padding', 'resize', 'frame'],
    },
    {
      id: 'file-reset-app',
      label: 'Reset App',
      category: 'File',
      icon: RotateCcw,
      execute: () => {
        useCanvasStore.persist.clearStorage();
        window.location.reload();
      },
      keywords: ['reset', 'clear', 'restart', 'reload', 'delete'],
    },
    {
      id: 'file-svg-source',
      label: 'SVG Source',
      category: 'File',
      icon: FileCode,
      execute: () => {},
      panelComponent: SourcePanel,
      panelLabel: 'SVG Source',
      keywords: ['source', 'svg', 'code', 'xml', 'raw', 'markup'],
    },
    {
      id: 'file-llm-assistant',
      label: 'LLM Assistant',
      category: 'File',
      icon: Bot,
      execute: () => {},
      panelComponent: LlmAssistantSettingsPanel,
      panelLabel: 'LLM Assistant',
      keywords: ['llm', 'assistant', 'ai', 'openai', 'gpt', 'api', 'configuration'],
    },
  ];
}

/**
 * Collect panels visible in select mode using actual store state.
 * These become the "Select" category in the command palette.
 */
function collectSelectPanels(
  _selectedIds: string[],
  selectedPathsCount: number,
  selectedElementsCount: number,
  totalElementsCount: number,
  activeGroupId: string | null | undefined,
  llmAssistantConfigured: boolean
): PaletteCommand[] {
  if (selectedElementsCount === 0) return [];

  const allPanels = panelRegistry.getAll();
  const selectCtx = {
    activePlugin: 'select' as const,
    showFilePanel: false,
    showSettingsPanel: false,
    showLibraryPanel: false,
    isInSpecialPanelMode: false,
    canPerformOpticalAlignment: selectedElementsCount >= 2,
    selectedSubpathsCount: 0,
    selectedCommandsCount: 0,
    selectedPathsCount,
    selectedElementsCount,
    totalElementsCount,
    hasPathWithMultipleSubpaths: false,
    activeGroupId: activeGroupId ?? null,
    selectedGroupsCount: 0,
    llmAssistantConfigured,
  };

  const commands: PaletteCommand[] = [];

  for (const panel of allPanels) {
    if (['file', 'documentation', 'snap-points', 'settings'].includes(panel.key)) continue;
    try {
      if (!panel.condition(selectCtx)) continue;
    } catch {
      continue;
    }

    const pluginId = panel.pluginId ?? panel.key.split(':')[0];
    const plugin = pluginManager.getPlugin(pluginId);
    const label = plugin?.metadata?.label ?? panel.key;
    const pluginIcon = plugin?.metadata?.icon as ComponentType<{ size?: number }> | undefined;

    // Panels with interactive header buttons need the header visible in the modal
    const needsHeader = panel.key === 'animation-system:animation-controls';

    commands.push({
      id: `panel-select-${panel.key}`,
      label,
      category: 'Select',
      icon: pluginIcon ?? MousePointer2,
      execute: () => {},
      panelComponent: panel.component as ComponentType,
      panelLabel: label,
      panelCategory: needsHeader ? 'prefs' : undefined,
      keywords: ['select', 'selection', label.toLowerCase(), 'panel'],
    });
  }

  return commands;
}

/**
 * Collect settings panels (Prefs tab).
 */
function collectSettingsPanels(): PaletteCommand[] {
  const allPanels = panelRegistry.getAll();

  // Settings panels respond to showSettingsPanel: true
  const settingsCtx = {
    activePlugin: 'settings',
    showFilePanel: false,
    showSettingsPanel: true,
    showLibraryPanel: false,
    isInSpecialPanelMode: true,
    canPerformOpticalAlignment: false,
    selectedSubpathsCount: 0,
    selectedCommandsCount: 0,
    selectedPathsCount: 0,
    selectedElementsCount: 0,
    totalElementsCount: 0,
    hasPathWithMultipleSubpaths: false,
    activeGroupId: null,
    selectedGroupsCount: 0,
  };

  const commands: PaletteCommand[] = [];

  // Human-readable labels and icons for core (non-plugin) panels
  const CORE_PANEL_META: Record<string, { label: string; icon: ComponentType<{ size?: number }> }> = {
    settings: { label: 'Theme & Configuration', icon: Settings2 as ComponentType<{ size?: number }> },
    'snap-points': { label: 'Snap Points', icon: Magnet as ComponentType<{ size?: number }> },
  };

  for (const panel of allPanels) {
    // Skip only file and documentation (not settings / snap-points)
    if (['file', 'documentation'].includes(panel.key)) continue;

    try {
      if (panel.condition(settingsCtx)) {
        const coreMeta = CORE_PANEL_META[panel.key];
        let label: string;
        let pluginIcon: ComponentType<{ size?: number }> | undefined;

        if (coreMeta) {
          label = coreMeta.label;
          pluginIcon = coreMeta.icon;
        } else {
          const pluginId = panel.pluginId ?? panel.key.split(':')[0];
          const plugin = pluginManager.getPlugin(pluginId);
          label = plugin?.metadata?.label ?? panel.key;
          pluginIcon = plugin?.metadata?.icon as ComponentType<{ size?: number }> | undefined;
        }

        commands.push({
          id: `panel-prefs-${panel.key}`,
          label,
          category: 'Prefs',
          icon: pluginIcon ?? Settings,
          execute: () => {},
          panelComponent: panel.component as ComponentType,
          panelLabel: label,
          panelCategory: 'prefs',
          keywords: ['settings', 'prefs', 'preferences', label.toLowerCase()],
        });
      }
    } catch {
      // Skip panels whose condition check throws
    }
  }

  commands.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return commands;
}

export function useCommandPaletteCommands(): PaletteCommand[] {
  const enabledPlugins = useEnabledPlugins();
  // Subscribe to selection length so SELECT/ACTION categories update when selection changes
  const selectedElementsCount = useCanvasStore((state) => state.selectedIds.length);
  // Reuse context bar's full action set — identical to what ContextActionOverlay shows
  const { directActions, groups } = useContextActions();

  return useMemo(() => {
    const commands: PaletteCommand[] = [];
    const store = useCanvasStore.getState();

    // --- Tool switching commands ---
    // Build set of plugin IDs that contribute panels to gen/audit/lib/prefs
    // so we can exclude them from the Tool category (they belong in their panel section)
    const tools = pluginManager.getRegisteredTools();
    const panelPluginIds = new Set<string>();
    for (const plugin of tools) {
      const targets = plugin.relatedPluginPanels?.map(
        (p: PluginPanelContribution) => p.targetPlugin
      );
      if (targets?.some((t: string) => ['generatorLibrary', 'auditLibrary', 'library'].includes(t))) {
        panelPluginIds.add(plugin.id);
      }
      // Settings panel plugins (have sidebarPanels with createSettingsPanel pattern)
      try {
        if (plugin.sidebarPanels?.some((sp) => sp.condition({ activePlugin: 'settings', showFilePanel: false, showSettingsPanel: true, showLibraryPanel: false, isInSpecialPanelMode: true, canPerformOpticalAlignment: false, selectedSubpathsCount: 0, selectedCommandsCount: 0, selectedPathsCount: 0, selectedElementsCount: 0, totalElementsCount: 0, hasPathWithMultipleSubpaths: false, activeGroupId: null, selectedGroupsCount: 0 }))) {
          panelPluginIds.add(plugin.id);
        }
      } catch {
        // Skip plugins whose condition check throws
      }
    }

    for (const plugin of tools) {
      if ((plugin.toolDefinition || plugin.modeConfig) && !panelPluginIds.has(plugin.id)) {
        commands.push({
          id: `tool-${plugin.id}`,
          label: plugin.metadata.label ?? plugin.id,
          category: 'Tool',
          icon: plugin.metadata.icon as ComponentType<{ size?: number }> | undefined,
          execute: () => useCanvasStore.getState().setMode(plugin.id),
          keywords: [plugin.id, 'switch', 'mode', 'tool'],
        });
      }
    }

    // --- Core actions ---
    commands.push({
      id: 'core-undo',
      label: 'Undo',
      category: 'Edit',
      shortcut: '⌘Z',
      icon: Undo2,
      execute: () => useCanvasStore.temporal.getState().undo(),
      keywords: ['undo', 'revert'],
    });

    commands.push({
      id: 'core-redo',
      label: 'Redo',
      category: 'Edit',
      shortcut: '⌘⇧Z',
      icon: Redo2,
      execute: () => useCanvasStore.temporal.getState().redo(),
      keywords: ['redo', 'forward'],
    });

    commands.push({
      id: 'core-select-all',
      label: 'Select All',
      category: 'Edit',
      shortcut: '⌘A',
      icon: MousePointer,
      execute: () => useCanvasStore.getState().selectAllElements(),
      keywords: ['select', 'all'],
    });

    commands.push({
      id: 'core-deselect',
      label: 'Deselect All',
      category: 'Edit',
      shortcut: 'Esc',
      icon: MousePointer,
      execute: () => useCanvasStore.getState().clearSelection(),
      keywords: ['deselect', 'clear', 'none'],
    });

    commands.push({
      id: 'core-delete',
      label: 'Delete Selected',
      category: 'Edit',
      shortcut: 'Del',
      icon: Trash2,
      execute: () => {
        const s = useCanvasStore.getState();
        if (s.selectedIds.length > 0) {
          s.deleteElements(s.selectedIds);
        }
      },
      isEnabled: () => useCanvasStore.getState().selectedIds.length > 0,
      keywords: ['delete', 'remove', 'trash'],
    });

    // --- Zoom commands ---
    commands.push({
      id: 'view-zoom-in',
      label: 'Zoom In',
      category: 'View',
      shortcut: '⌘+',
      icon: ZoomIn,
      execute: () => useCanvasStore.getState().zoom(1.2),
      keywords: ['zoom', 'in', 'bigger'],
    });

    commands.push({
      id: 'view-zoom-out',
      label: 'Zoom Out',
      category: 'View',
      shortcut: '⌘-',
      icon: ZoomOut,
      execute: () => useCanvasStore.getState().zoom(1 / 1.2),
      keywords: ['zoom', 'out', 'smaller'],
    });

    commands.push({
      id: 'view-reset-zoom',
      label: 'Reset Zoom',
      category: 'View',
      shortcut: '⌘0',
      icon: Maximize2,
      execute: () => useCanvasStore.getState().resetZoom(),
      keywords: ['zoom', 'reset', 'fit', '100%'],
    });

    // --- Clipboard commands ---
    commands.push({
      id: 'clipboard-copy',
      label: 'Copy',
      category: 'Edit',
      shortcut: '⌘C',
      icon: Copy,
      execute: () => document.execCommand('copy'),
      keywords: ['copy', 'clipboard'],
    });

    commands.push({
      id: 'clipboard-paste',
      label: 'Paste',
      category: 'Edit',
      shortcut: '⌘V',
      icon: Clipboard,
      execute: () => document.execCommand('paste'),
      keywords: ['paste', 'clipboard'],
    });

    commands.push({
      id: 'clipboard-cut',
      label: 'Cut',
      category: 'Edit',
      shortcut: '⌘X',
      icon: Scissors,
      execute: () => document.execCommand('cut'),
      keywords: ['cut', 'clipboard'],
    });

    // --- Sidebar toggle ---
    commands.push({
      id: 'view-toggle-sidebar',
      label: store.isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar',
      category: 'View',
      icon: store.isSidebarOpen ? EyeOff : Eye,
      execute: () => useCanvasStore.getState().toggleSidebar(),
      keywords: ['sidebar', 'toggle', 'panel'],
    });

    // --- Generator Library panels (Gen tab) ---
    commands.push(
      ...collectRelatedPanels('generatorLibrary', 'Generator', Sparkles, true)
    );

    // --- Audit Library panels (Audit tab) ---
    commands.push(
      ...collectRelatedPanels('auditLibrary', 'Audit', ClipboardCheck, true)
    );

    // --- Library panels (Lib tab) ---
    commands.push(
      ...collectRelatedPanels('library', 'Library', Library, false)
    );

    // --- File panel commands ---
    commands.push(...collectFilePanelCommands());

    // --- Settings panels (Prefs tab) ---
    commands.push(...collectSettingsPanels());

    // --- Editor panel (always available in Select category) ---
    commands.push({
      id: 'panel-editor',
      label: 'Editor',
      category: 'Select',
      icon: SlidersHorizontal,
      execute: () => {},
      panelComponent: EditorPanel as ComponentType,
      panelLabel: 'Editor',
      panelCategory: 'editor',
      keywords: ['editor', 'fill', 'stroke', 'color', 'dash', 'opacity', 'style', 'panel'],
    });

    // --- Struct panel (always available) ---
    commands.push({
      id: 'panel-struct',
      label: 'Struct',
      category: 'Select',
      icon: FolderTree,
      execute: () => {},
      panelComponent: SvgStructurePanel as ComponentType,
      panelLabel: 'Struct',
      panelCategory: 'editor',
      keywords: ['struct', 'structure', 'svg', 'tree', 'layers', 'hierarchy', 'groups', 'elements', 'panel'],
    });

    // --- Select mode panels (shown when elements are selected) ---
    {
      const selIds = store.selectedIds;
      const elements = store.elements ?? [];
      const totalElements = elements.length;
      const selPaths = selIds.filter((id) => {
        const el = elements.find((e: { id: string; type?: string }) => e.id === id);
        return !el || el.type === 'path';
      }).length;
      const activeGroupId = (store as { activeGroupId?: string }).activeGroupId ?? null;
      // Determine if LLM assistant is configured so the panel appears in select results
      const llmSettings = (store as typeof store & LlmAssistantSlice).llmAssistant?.settings;
      const llmAssistantConfigured = Boolean(
        llmSettings?.apiKey?.trim() &&
        llmSettings?.model?.trim() &&
        llmSettings?.baseUrl?.trim()
      );
      commands.push(...collectSelectPanels(selIds, selPaths, selIds.length, totalElements, activeGroupId, llmAssistantConfigured));
    }

    // --- Context actions (full set, matching ContextActionOverlay / context bar) ---
    // Direct actions
    for (const action of directActions) {
      commands.push({
        id: `action-${action.id}`,
        label: action.label,
        category: 'Action',
        icon: action.icon,
        execute: action.onClick,
        keywords: [action.label.toLowerCase(), 'action'],
      });
    }
    // Group actions — parent + all children as individual searchable commands
    for (const group of groups) {
      // The group itself (if directly clickable)
      if (group.onClick) {
        commands.push({
          id: `action-${group.id}`,
          label: group.label,
          category: 'Action',
          icon: group.icon,
          execute: group.onClick,
          keywords: [group.label.toLowerCase(), 'action'],
        });
      }
      // Each child action listed individually (with parent label for context)
      for (const child of group.children) {
        commands.push({
          id: `action-${group.id}-${child.id}`,
          label: `${group.label}: ${child.label}`,
          category: 'Action',
          icon: child.icon,
          execute: child.onClick,
          keywords: [group.label.toLowerCase(), child.label.toLowerCase(), 'action'],
        });
      }
    }

    // --- Custom providers from commandRegistry ---
    commands.push(...commandRegistry.getAllCommands());

    return commands;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledPlugins, selectedElementsCount, directActions, groups]);
}
