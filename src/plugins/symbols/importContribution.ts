import { registerImportContribution } from '../../utils/importContributionRegistry';
import { canvasStoreApi } from '../../store/canvasStore';
import type { SymbolPluginSlice, SymbolDefinition } from './slice';

registerImportContribution<SymbolDefinition>({
  pluginId: 'symbol',
  merge: (imports) => {
    const defs = imports as SymbolDefinition[] | undefined;
    if (!defs || defs.length === 0) return;
    const symbolState = canvasStoreApi.getState() as unknown as SymbolPluginSlice;
    if (symbolState.symbols === undefined) return;
    const existingIds = new Set(symbolState.symbols.map((s) => s.id));
    const newSymbols = defs.filter((s) => !existingIds.has(s.id));
    if (newSymbols.length === 0) return;
    canvasStoreApi.setState({
      symbols: [...symbolState.symbols, ...newSymbols],
    } as Partial<SymbolPluginSlice>);
  },
});
