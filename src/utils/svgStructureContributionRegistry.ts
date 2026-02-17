import type { SvgStructureContribution } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';

export interface RegisteredSvgStructureContribution {
  pluginId: string;
  contribution: SvgStructureContribution<CanvasStore>;
}

class SvgStructureContributionRegistry {
  private contributions: RegisteredSvgStructureContribution[] = [];

  register(pluginId: string, contribution: SvgStructureContribution<CanvasStore>): void {
    // Ensure single entry per plugin + contribution id
    this.contributions = this.contributions.filter(
      (entry) => !(entry.pluginId === pluginId && entry.contribution.id === contribution.id)
    );
    this.contributions.push({ pluginId, contribution });
  }

  unregisterPlugin(pluginId: string): void {
    this.contributions = this.contributions.filter((entry) => entry.pluginId !== pluginId);
  }

  getAll(): RegisteredSvgStructureContribution[] {
    return [...this.contributions];
  }
}

export const svgStructureContributionRegistry = new SvgStructureContributionRegistry();
