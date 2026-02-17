import type { CanvasStore } from '../store/canvasStore';

export interface ImportContribution<T = unknown> {
  pluginId: string;
  /**
   * Merge imported definitions for a plugin. Implementations should handle undefined/empty imports gracefully.
   */
  merge: (imports: T[] | undefined, sourceIdMap: Map<string, string>, state: CanvasStore) => void;
}

const contributions = new Map<string, ImportContribution<unknown>>();

export function registerImportContribution<T>(contribution: ImportContribution<T>): void {
  contributions.set(contribution.pluginId, contribution as unknown as ImportContribution<unknown>);
}

export function unregisterImportContribution(pluginId: string): void {
  contributions.delete(pluginId);
}

export function clearImportContributions(): void {
  contributions.clear();
}

export function mergeImportedResources(
  pluginImports: Record<string, unknown[]>,
  sourceIdMap: Map<string, string>,
  state: CanvasStore
): void {
  contributions.forEach((contribution) => {
    const imports = pluginImports?.[contribution.pluginId] as unknown[] | undefined;
    contribution.merge(imports as unknown[] | undefined, sourceIdMap, state);
  });
}
