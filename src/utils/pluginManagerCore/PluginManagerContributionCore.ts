import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { RegisteredSvgStructureContribution } from '../svgStructureContributionRegistry';
import type { RegisteredSvgDefsEditor } from '../svgDefsEditorRegistry';
import { PluginManagerToolingCore } from './PluginManagerToolingCore';

export abstract class PluginManagerContributionCore extends PluginManagerToolingCore {
  getPlugin(id: string): PluginDefinition<CanvasStore> | undefined {
    return this.registry.get(id);
  }

  getAll(): PluginDefinition<CanvasStore>[] {
    return this.registry.getAll();
  }

  hasPlugin(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  getImporters(): PluginDefinition<CanvasStore>['importers'][] {
    return this.registry.getAll().map((plugin) => plugin.importers).filter(Boolean);
  }

  getImportDefHandlers(): NonNullable<PluginDefinition<CanvasStore>['importDefs']>[] {
    return this.registry
      .getAll()
      .map((plugin) => plugin.importDefs)
      .filter((handler): handler is NonNullable<typeof handler> => Boolean(handler));
  }

  getStyleAttributeExtractors(): NonNullable<PluginDefinition<CanvasStore>['styleAttributeExtractor']>[] {
    return this.registry
      .getAll()
      .map((plugin) => plugin.styleAttributeExtractor)
      .filter((handler): handler is NonNullable<typeof handler> => Boolean(handler));
  }

  getSvgStructureContributions(): RegisteredSvgStructureContribution[] {
    return this.contributionAdapter.getSvgStructureContributions((pluginId) =>
      this.isPluginEnabled(pluginId)
    );
  }

  getSvgDefsEditors(): RegisteredSvgDefsEditor[] {
    return this.contributionAdapter.getSvgDefsEditors((pluginId) =>
      this.isPluginEnabled(pluginId)
    );
  }
}
