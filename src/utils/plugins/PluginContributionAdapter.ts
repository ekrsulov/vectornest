import type { CanvasStore } from '../../store/canvasStore';
import type {
  PluginDefinition,
  SvgDefsEditor,
  SvgStructureContribution,
} from '../../types/plugins';
import {
  elementContributionRegistry,
  type ElementContribution,
} from '../elementContributionRegistry';
import {
  svgStructureContributionRegistry,
  type RegisteredSvgStructureContribution,
} from '../svgStructureContributionRegistry';
import {
  svgDefsEditorRegistry,
  type RegisteredSvgDefsEditor,
} from '../svgDefsEditorRegistry';

export interface PluginContributionAdapter {
  register(plugin: PluginDefinition<CanvasStore>): void;
  unregister(pluginId: string): void;
  getSvgStructureContributions(
    isPluginEnabled: (pluginId: string) => boolean
  ): RegisteredSvgStructureContribution[];
  getSvgDefsEditors(
    isPluginEnabled: (pluginId: string) => boolean
  ): RegisteredSvgDefsEditor[];
}

export function createPluginContributionAdapter(): PluginContributionAdapter {
  return {
    register(plugin: PluginDefinition<CanvasStore>): void {
      if (plugin.elementContributions?.length) {
        plugin.elementContributions.forEach((contribution) => {
          elementContributionRegistry.register(
            plugin.id,
            contribution as ElementContribution
          );
        });
      }

      if (plugin.svgStructureContributions?.length) {
        plugin.svgStructureContributions.forEach((contribution) => {
          svgStructureContributionRegistry.register(
            plugin.id,
            contribution as SvgStructureContribution<CanvasStore>
          );
        });
      }

      if (plugin.svgDefsEditors?.length) {
        plugin.svgDefsEditors.forEach((editor) => {
          svgDefsEditorRegistry.register(
            plugin.id,
            editor as SvgDefsEditor<CanvasStore>
          );
        });
      }
    },

    unregister(pluginId: string): void {
      elementContributionRegistry.unregisterPlugin(pluginId);
      svgStructureContributionRegistry.unregisterPlugin(pluginId);
      svgDefsEditorRegistry.unregisterPlugin(pluginId);
    },

    getSvgStructureContributions(
      isPluginEnabled: (pluginId: string) => boolean
    ): RegisteredSvgStructureContribution[] {
      return svgStructureContributionRegistry
        .getAll()
        .filter((entry) => isPluginEnabled(entry.pluginId));
    },

    getSvgDefsEditors(
      isPluginEnabled: (pluginId: string) => boolean
    ): RegisteredSvgDefsEditor[] {
      return svgDefsEditorRegistry
        .getAll()
        .filter((entry) => isPluginEnabled(entry.pluginId));
    },
  };
}
