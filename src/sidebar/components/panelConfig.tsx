import type { PanelConfig } from '../../types/panel';
import { panelRegistry, initializePanelRegistry } from '../../utils/panelRegistry';

// Initialize the panel registry with core panels.
// Plugin panels are registered automatically by pluginManager.register().
initializePanelRegistry();

/**
 * Get panel configurations dynamically from the registry.
 * Returns all registered panels including core panels (file, settings, editor, documentation)
 * and plugin-contributed panels.
 * 
 * Note: Plugin panels are registered automatically when plugins are registered
 * via pluginManager.register(). This decouples the sidebar from direct plugin imports.
 */
export function getPanelConfigs(): PanelConfig[] {
  return panelRegistry.getAll();
}
