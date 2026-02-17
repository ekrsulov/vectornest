import { registerImportContribution } from '../../utils/importContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';
import type { MaskDefinition, MasksSlice } from './types';

registerImportContribution<MaskDefinition>({
  pluginId: 'mask',
  merge: (imports) => {
    const defs = imports as MaskDefinition[] | undefined;
    if (!defs || defs.length === 0) return;
    const maskState = canvasStoreApi.getState() as unknown as MasksSlice;
    const existing = maskState.masks ?? [];
    const existingIds = new Set(existing.map((m) => m.id));
    const merged = [...existing];
    defs.forEach((m) => {
      const normalized = { ...m, name: m.name ?? m.id };
      if (!existingIds.has(m.id)) {
        merged.push(normalized);
        existingIds.add(m.id);
      }
    });
    canvasStoreApi.setState({
      masks: merged,
      importedMasks: [...merged],
    } as Partial<MasksSlice>);
  },
});
