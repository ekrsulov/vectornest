import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { generatorLibraryPlugin } from '../generatorLibrary';
import { animLibraryPlugin } from '../animLibrary';
import { auditLibraryPlugin } from '../auditLibrary';

export const LIBRARY_SHELL_PLUGINS: PluginDefinition<CanvasStore>[] = [
  generatorLibraryPlugin,
  animLibraryPlugin,
  auditLibraryPlugin,
];
