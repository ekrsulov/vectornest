import type { PluginDefinition } from '../../types/plugins';
import { DEFAULT_MODE } from '../../constants';

// Tool modes are now defined per-plugin and aggregated via the Plugin Manager.
// We treat canvas modes as plain strings to allow arbitrary plugin-defined modes.
export type CanvasMode = string & {};

/**
 * Lifecycle actions executed during mode transitions.
 * Plugins can register their own actions via pluginManager.registerLifecycleAction().
 * Built-in actions: 'clearSubpathSelection', 'clearSelectedCommands'
 */
export type CanvasModeLifecycleAction = string & {};

export interface CanvasModeResources {
  plugins?: CanvasMode[];
  listeners?: string[];
  overlays?: string[];
}

export interface CanvasModeStateConfig {
  id: CanvasMode;
  description: string;
  entry?: CanvasModeLifecycleAction[];
  exit?: CanvasModeLifecycleAction[];
  /**
   * When defined, activating the same mode twice will fall back to this mode.
   */
  toggleTo?: CanvasMode;
  resources?: CanvasModeResources;
}

export interface CanvasModeMachineDefinition {
  initial: CanvasMode;
  /** Base configuration for built-in modes. */
  states: Record<string, CanvasModeStateConfig>;
  /** Definition used for any custom mode that isn't explicitly described. */
  defaultState: CanvasModeStateConfig;
  global?: {
    onTransition?: CanvasModeLifecycleAction[];
  };
}

export interface CanvasModeEvent {
  type: 'ACTIVATE';
  value: CanvasMode;
}

export interface CanvasModeTransitionResult {
  changed: boolean;
  mode: CanvasMode;
  actions: CanvasModeLifecycleAction[];
  reason: 'noop' | 'switch' | 'toggle-fallback' | 'denied';
  from: CanvasMode;
  requested: CanvasMode;
}

const defaultState: CanvasModeStateConfig = {
  id: DEFAULT_MODE,
  description: 'Mode defined by an external plugin.',
  resources: { plugins: [], listeners: [], overlays: [] },
};

/**
 * Builds the canvas mode machine dynamically from registered plugins.
 * This allows plugins to define their own modes with custom configurations.
 */
export function buildCanvasModeMachine(plugins: PluginDefinition[]): CanvasModeMachineDefinition {
  const states: Record<string, CanvasModeStateConfig> = {};

  // Add all plugin modes (including core modes like select, pan, text, curves)
  plugins.forEach(plugin => {
    if (plugin.modeConfig) {
      states[plugin.id] = {
        id: plugin.id,
        description: plugin.modeConfig.description,
        entry: plugin.modeConfig.entry,
        exit: plugin.modeConfig.exit,
        toggleTo: plugin.modeConfig.toggleTo,
        resources: { plugins: [plugin.id] },
      };
    }
  });

  return {
    initial: DEFAULT_MODE,
    states,
    defaultState,
    global: {
      onTransition: [],
    },
  };
}

// Default empty machine (will be replaced by buildCanvasModeMachine when plugins are registered)
let CANVAS_MODE_MACHINE: CanvasModeMachineDefinition = {
  initial: DEFAULT_MODE,
  states: {},
  defaultState,
  global: {
    onTransition: [],
  },
};

/**
 * Updates the canvas mode machine with plugin configurations.
 * Should be called after plugins are registered.
 */
export function updateCanvasModeMachine(plugins: PluginDefinition[]): void {
  CANVAS_MODE_MACHINE = buildCanvasModeMachine(plugins);
}

/**
 * Gets the current canvas mode machine.
 */
export function getCanvasModeMachine(): CanvasModeMachineDefinition {
  return CANVAS_MODE_MACHINE;
}

/**
 * Resets the mode machine to its empty default state.
 * Intended for test isolation — prevents state leaking between test runs.
 */
export function resetCanvasModeMachine(): void {
  CANVAS_MODE_MACHINE = {
    initial: DEFAULT_MODE,
    states: {},
    defaultState,
    global: { onTransition: [] },
  };
}

const getStateDefinition = (mode: CanvasMode): CanvasModeStateConfig => {
  const machine = getCanvasModeMachine();
  return machine.states[mode] ?? {
    ...machine.defaultState,
    id: mode,
  };
};

export const getCanvasModeDefinition = (mode: CanvasMode): CanvasModeStateConfig => getStateDefinition(mode);

export const getCanvasModeResources = (mode: CanvasMode): CanvasModeResources => {
  const definition = getStateDefinition(mode);
  return {
    plugins: definition.resources?.plugins && definition.resources.plugins.length > 0
      ? definition.resources.plugins
      : [mode],
    listeners: definition.resources?.listeners ?? [],
    overlays: definition.resources?.overlays ?? [],
  };
};

const collectActions = (
  from: CanvasModeStateConfig,
  to: CanvasModeStateConfig,
  reason: CanvasModeTransitionResult['reason'],
): CanvasModeLifecycleAction[] => {
  const exitActions = from.exit ?? [];
  const entryActions = to.entry ?? [];
  const globalActions = getCanvasModeMachine().global?.onTransition ?? [];

  if (reason === 'noop') {
    return [];
  }

  return [...exitActions, ...globalActions, ...entryActions];
};

export const transitionCanvasMode = (
  currentMode: CanvasMode,
  event: CanvasModeEvent,
): CanvasModeTransitionResult => {
  const requested = event.value;
  const currentDefinition = getStateDefinition(currentMode);

  if (requested === currentMode) {
    if (currentDefinition.toggleTo && currentDefinition.toggleTo !== currentMode) {
      const fallbackDefinition = getStateDefinition(currentDefinition.toggleTo);
      return {
        changed: true,
        mode: currentDefinition.toggleTo,
        actions: collectActions(currentDefinition, fallbackDefinition, 'toggle-fallback'),
        reason: 'toggle-fallback',
        from: currentMode,
        requested,
      };
    }

    return {
      changed: false,
      mode: currentMode,
      actions: [],
      reason: 'noop',
      from: currentMode,
      requested,
    };
  }

  // All transitions are now allowed - no need to check transition table
  const targetDefinition = getStateDefinition(requested);
  return {
    changed: true,
    mode: requested,
    actions: collectActions(currentDefinition, targetDefinition, 'switch'),
    reason: 'switch',
    from: currentMode,
    requested,
  };
};
