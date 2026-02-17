import { registerImportContribution } from '../../utils/importContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';
import type { ClippingPluginSlice, ClipDefinition } from './slice';

registerImportContribution<ClipDefinition>({
  pluginId: 'clip',
  merge: (imports) => {
    const defs = imports as ClipDefinition[] | undefined;
    if (!defs || defs.length === 0) return;
    const clipState = canvasStoreApi.getState() as unknown as ClippingPluginSlice;
    const existingClips = clipState.clips ?? [];
    const mergedById = new Map<string, ClipDefinition>();
    [...existingClips, ...defs].forEach((clip) => {
      const c = clip as ClipDefinition;
      mergedById.set(c.id, { ...c, name: c.name ?? c.id });
    });
    const mergedClips = Array.from(mergedById.values());
    canvasStoreApi.setState({
      clips: mergedClips,
    } as Partial<ClippingPluginSlice>);
  },
});
