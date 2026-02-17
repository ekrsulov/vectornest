import { registerImportContribution } from '../../utils/importContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';
import type { PatternsSlice, PatternDef } from './slice';

registerImportContribution<PatternDef>({
  pluginId: 'pattern',
  merge: (imports) => {
    const defs = imports as PatternDef[] | undefined;
    if (!defs || defs.length === 0) return;
    const patternState = canvasStoreApi.getState() as unknown as PatternsSlice;
    if (patternState.patterns === undefined) return;
    const existingIds = new Set(patternState.patterns.map((p) => p.id));
    const newPatterns = defs.filter((p) => !existingIds.has(p.id));
    if (newPatterns.length === 0) return;
    canvasStoreApi.setState({
      patterns: [...patternState.patterns, ...newPatterns],
    } as Partial<PatternsSlice>);
  },
});
