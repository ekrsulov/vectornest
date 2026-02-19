import { PluginManager } from './pluginManagerCore';

export const pluginManager = new PluginManager();

export type {
  CanvasService,
  CanvasServiceContext,
  CanvasServiceInstance,
} from './plugins/CanvasServiceTypes';

export {
  useVisibleToolIds,
  useDisabledToolIds,
  useIsGlobalUndoRedoDisabled,
} from './pluginHooks';


