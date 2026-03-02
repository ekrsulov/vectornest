import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { librarySearchPlugin } from '../librarySearch';
import { manualMovePlugin } from '../manualMove';
import { gridDistributionPlugin } from '../gridDistribution';
import { llmAssistantPlugin } from '../llmAssistant';
import { selectSimilarPlugin } from '../selectSimilar';
import { animationManagerPlugin } from '../animationManager';
import { animationLibraryPlugin } from '../animationLibrary';
import { potracePlugin } from '../potrace';
import { paintsPlugin } from '../paints';

export const UTILITY_PLUGINS: PluginDefinition<CanvasStore>[] = [
  librarySearchPlugin,
  manualMovePlugin,
  gridDistributionPlugin,
  llmAssistantPlugin,
  selectSimilarPlugin,
  animationManagerPlugin,
  animationLibraryPlugin,
  potracePlugin,
  paintsPlugin,
];
