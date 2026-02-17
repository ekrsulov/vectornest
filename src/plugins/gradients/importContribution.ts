import { registerImportContribution } from '../../utils/importContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';
import type { GradientsSlice, GradientDef } from './slice';

registerImportContribution<GradientDef>({
  pluginId: 'gradients',
  merge: (imports) => {
    const defs = imports as GradientDef[] | undefined;
    if (!defs || defs.length === 0) return;
    const gradientState = canvasStoreApi.getState() as unknown as GradientsSlice;
    if (gradientState.gradients === undefined) return;
    const merged = new Map<string, GradientDef>();
    gradientState.gradients.forEach((g) => merged.set(g.id, g));
    defs.forEach((g) => merged.set(g.id, { ...(merged.get(g.id) ?? {}), ...g }));
    canvasStoreApi.setState({
      gradients: Array.from(merged.values()),
    } as Partial<GradientsSlice>);
  },
});
