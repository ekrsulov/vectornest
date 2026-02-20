import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import { ConvertToPathPanel } from './ConvertToPathPanel';
import { countConvertibleShapes } from './conversion';

export const convertToPathPlugin: PluginDefinition<CanvasStore> = {
  id: 'convertToPath',
  metadata: {
    label: 'Convert to Path',
  },
  init: (context) => {
    const store = context.store;
    const updateConvertibleCount = () => {
      const state = store.getState() as unknown as CanvasStore & { convertToPathConvertibleCount?: number };
      const count = countConvertibleShapes(state.selectedIds ?? [], state.elements ?? []);
      if ((state.convertToPathConvertibleCount ?? 0) === count) return;
      store.setState({ convertToPathConvertibleCount: count } as Partial<CanvasStore>, false);
    };

    updateConvertibleCount();

    const unregisterSelection = pluginManager.registerLifecycleAction('onSelectionChanged', updateConvertibleCount);
    const unregisterElements = pluginManager.registerLifecycleAction('onElementsChanged', updateConvertibleCount);

    return () => {
      unregisterSelection();
      unregisterElements();
    };
  },
  relatedPluginPanels: [
    {
      id: 'convert-to-path',
      targetPlugin: 'generatorLibrary',
      component: ConvertToPathPanel,
      order: 210,
    },
  ],
};
