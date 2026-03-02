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

export interface CanvasModeStateConfig {
  id: CanvasMode;
  description: string;
  entry?: CanvasModeLifecycleAction[];
  exit?: CanvasModeLifecycleAction[];
  /**
   * When defined, activating the same mode twice will fall back to this mode.
   */
  toggleTo?: CanvasMode;
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
};

let canvasModeDefinitions: Record<string, CanvasModeStateConfig> = {};

/**
 * Sync mode definitions from registered plugins.
 * Should be called after plugins are registered.
 */
export function updateCanvasModeDefinitions(plugins: PluginDefinition[]): void {
  const nextDefinitions: Record<string, CanvasModeStateConfig> = {};

  plugins.forEach((plugin) => {
    if (!plugin.modeConfig) {
      return;
    }

    nextDefinitions[plugin.id] = {
      id: plugin.id,
      description: plugin.modeConfig.description,
      entry: plugin.modeConfig.entry,
      exit: plugin.modeConfig.exit,
      toggleTo: plugin.modeConfig.toggleTo,
    };
  });

  canvasModeDefinitions = nextDefinitions;
}

export const getInitialCanvasMode = (): CanvasMode => DEFAULT_MODE as CanvasMode;

const getStateDefinition = (mode: CanvasMode): CanvasModeStateConfig => {
  return canvasModeDefinitions[mode] ?? {
    ...defaultState,
    id: mode,
  };
};

export const getCanvasModeDefinition = (mode: CanvasMode): CanvasModeStateConfig => getStateDefinition(mode);

export const transitionCanvasMode = (
  currentMode: CanvasMode,
  requestedMode: CanvasMode,
): CanvasModeTransitionResult => {
  const requested = requestedMode;
  const currentDefinition = getStateDefinition(currentMode);

  if (requested === currentMode) {
    if (currentDefinition.toggleTo && currentDefinition.toggleTo !== currentMode) {
      const fallbackDefinition = getStateDefinition(currentDefinition.toggleTo);
      return {
        changed: true,
        mode: currentDefinition.toggleTo,
        actions: [...(currentDefinition.exit ?? []), ...(fallbackDefinition.entry ?? [])],
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
    actions: [...(currentDefinition.exit ?? []), ...(targetDefinition.entry ?? [])],
    reason: 'switch',
    from: currentMode,
    requested,
  };
};
