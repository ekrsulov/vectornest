import type { PluginDefinition, CanvasShortcutContext } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { useCanvasStore } from '../../store/canvasStore';
import { createGuidelinesPluginSlice } from './slice';
import type { GuidelinesPluginSlice } from './slice';
import { GuidelinesPanel } from './GuidelinesPanel';
import { GuidelinesLayer } from './GuidelinesLayer';
import type { GuidelinesState } from './types';
import { useGuidelinesAltKey } from './hooks/useGuidelinesAltKey';
import { useGuidelinesHoverElement } from './hooks/useGuidelinesHoverElement';
import { createGuidelinesDragModifier } from './hooks/useGuidelinesDragSnap';
import { createRulersDecorator } from './decorators/RulersDecorator';
import { pluginManager } from '../../utils/pluginManager';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { registerToggleFlag, unregisterToggleFlag } from '../../utils/toggleFlagRegistry';
import { createPluginSlice } from '../../utils/pluginUtils';

registerStateKeys('guidelines', ['guidelines'], 'temporal');

const GUIDELINES_ENABLED_TOGGLE_ID = 'guidelines-enabled';
const MANUAL_GUIDES_TOGGLE_ID = 'manual-guides-enabled';

const registerGuidelinesToggleFlags = () => {
  registerToggleFlag({
    id: GUIDELINES_ENABLED_TOGGLE_ID,
    pluginId: 'guidelines',
    label: 'Guidelines',
    group: 'view',
    isActive: (state) => {
      const casted = state as CanvasStore & GuidelinesPluginSlice;
      return casted.guidelines?.enabled ?? false;
    },
    toggle: (state) => {
      const casted = state as CanvasStore & GuidelinesPluginSlice;
      casted.updateGuidelinesState?.({
        enabled: !(casted.guidelines?.enabled ?? false),
      });
    },
  });

  registerToggleFlag({
    id: MANUAL_GUIDES_TOGGLE_ID,
    pluginId: 'guidelines',
    label: 'Manual Guides',
    group: 'view',
    isActive: (state) => {
      const casted = state as CanvasStore & GuidelinesPluginSlice;
      return casted.guidelines?.manualGuidesEnabled ?? false;
    },
    toggle: (state) => {
      const casted = state as CanvasStore & GuidelinesPluginSlice;
      casted.updateGuidelinesState?.({
        manualGuidesEnabled: !(casted.guidelines?.manualGuidesEnabled ?? false),
      });
    },
  });
};

const unregisterGuidelinesToggleFlags = () => {
  unregisterToggleFlag(GUIDELINES_ENABLED_TOGGLE_ID);
  unregisterToggleFlag(MANUAL_GUIDES_TOGGLE_ID);
};

const guidelinesSliceFactory = createPluginSlice(createGuidelinesPluginSlice);
// Type guard for guidelines state
const hasGuidelines = (state: unknown): state is { guidelines: GuidelinesState } => {
  return state !== null && typeof state === 'object' && 'guidelines' in state;
};

const handleToggleGuidelinesShortcut = (_event: KeyboardEvent, context: CanvasShortcutContext) => {
  const state = context.store.getState();
  if (hasGuidelines(state) && state.guidelines) {
    const updateFn = (state as unknown as { updateGuidelinesState?: (s: Partial<GuidelinesState>) => void }).updateGuidelinesState;
    updateFn?.({ enabled: !state.guidelines.enabled });
  }
};

export const guidelinesPlugin: PluginDefinition<CanvasStore> = {
  id: 'guidelines',
  metadata: {
    label: 'Guidelines',
    cursor: 'default',
  },
  keyboardShortcuts: {
    // Toggle guidelines (Cmd/Ctrl + Shift + G).
    'meta+shift+g': {
      handler: handleToggleGuidelinesShortcut,
      options: { preventDefault: true },
    },
    'ctrl+shift+g': {
      handler: handleToggleGuidelinesShortcut,
      options: { preventDefault: true },
    },
  },
  canvasLayers: [
    {
      id: 'guidelines-overlay',
      placement: 'foreground',
      render: () => <GuidelinesLayer />,
    },
  ],
  hooks: [
    {
      id: 'guidelines-alt-key-listener',
      global: true,
      hook: useGuidelinesAltKey,
    },
    {
      id: 'guidelines-hover-element-listener',
      global: true,
      hook: useGuidelinesHoverElement,
    },
  ],
  slices: [guidelinesSliceFactory],
  init: (context) => {
    registerGuidelinesToggleFlags();

    // Register the element drag modifier for guidelines snapping
    const unregisterDragModifier = pluginManager.registerElementDragModifier(
      createGuidelinesDragModifier(context)
    );

    // Register the canvas decorator for rulers
    const unregisterDecorator = pluginManager.registerCanvasDecorator(
      createRulersDecorator()
    );

    // Register lifecycle action for clearing guidelines on mode transitions
    const unregisterClearAction = pluginManager.registerLifecycleAction(
      'clearGuidelines',
      () => {
        const state = useCanvasStore.getState();
        state.clearGuidelines?.();
      },
      { global: true } // Run on every mode transition
    );

    // Register lifecycle action for element deletion cleanup
    const unregisterDeleteAction = pluginManager.registerLifecycleAction(
      'onElementDeleted',
      () => {
        const state = useCanvasStore.getState();
        state.clearGuidelines?.();
      }
    );

    // Register lifecycle action for drag end cleanup
    const unregisterDragEndAction = pluginManager.registerLifecycleAction(
      'onDragEnd',
      () => {
        const state = useCanvasStore.getState();
        state.clearGuidelines?.();
      }
    );

    // Return cleanup function
    return () => {
      unregisterDragModifier();
      unregisterDecorator();
      unregisterClearAction();
      unregisterDeleteAction();
      unregisterDragEndAction();
      unregisterGuidelinesToggleFlags();
    };
  },
  sidebarPanels: [createSettingsPanel('guidelines', GuidelinesPanel)],
};

// eslint-disable-next-line react-refresh/only-export-components
export * from './types';
