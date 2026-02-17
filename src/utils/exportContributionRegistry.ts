export interface ExportContribution {
  pluginId: string;
  serializeDefs?: (state: unknown) => string;
  serializeAnimation?: (animation: unknown, chainDelays: Map<string, number>) => string;
}

const contributions = new Map<string, ExportContribution>();

export function registerExportContribution(contribution: ExportContribution): void {
  contributions.set(contribution.pluginId, contribution);
}

export function unregisterExportContribution(pluginId: string): void {
  contributions.delete(pluginId);
}

export function clearExportContributions(): void {
  contributions.clear();
}

export function serializeAnimationFromContributions(
  animation: unknown,
  chainDelays: Map<string, number>
): string {
  for (const contribution of contributions.values()) {
    if (contribution.serializeAnimation) {
      const result = contribution.serializeAnimation(animation, chainDelays);
      if (result) return result;
    }
  }
  return '';
}
