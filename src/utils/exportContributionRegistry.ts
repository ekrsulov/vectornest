export interface ExportContribution {
  pluginId: string;
  serializeDefs?: (state: unknown) => string;
  serializeAnimation?: (
    animation: unknown,
    chainDelays: Map<string, number>,
    referenceAnimations?: unknown[]
  ) => string;
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
  chainDelays: Map<string, number>,
  referenceAnimations?: unknown[]
): string {
  for (const contribution of contributions.values()) {
    if (contribution.serializeAnimation) {
      const result = contribution.serializeAnimation(animation, chainDelays, referenceAnimations);
      if (result) return result;
    }
  }
  return '';
}
