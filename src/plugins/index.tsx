import type { PluginDefinition } from '../types/plugins';
import type { CanvasStore } from '../store/canvasStore';
import { selectPlugin, panPlugin, filePlugin, settingsPlugin, libraryPlugin } from './basePlugins';
import { pencilPlugin } from './pencil';
import { penPlugin } from './pen';
import { textPlugin } from './text';
import { shapePlugin } from './shape';
import { markersPlugin } from './markers';
import { symbolsPlugin } from './symbols';
import { clippingPlugin } from './clipping';
import { transformationPlugin } from './transformation';
import { editPlugin } from './edit';
import { subpathPlugin } from './subpath';
import { opticalAlignmentPlugin } from './opticalAlignment';
import { guidelinesPlugin } from './guidelines';
import { objectSnapPlugin } from './objectSnap';
import { gridPlugin } from './grid';
import { wireframePlugin } from './wireframe';
import { minimapPlugin } from './minimap';
import { gridFillPlugin } from './gridFill';
import { duplicateOnDragPlugin } from './duplicateOnDrag';
import { trimPathPlugin } from './trimPath';
import { offsetPathPlugin } from './offsetPath';
import { measurePlugin } from './measure';
import { addPointPlugin } from './addPoint';
import { smoothBrushPlugin } from './smoothBrush';
import { pathSimplificationPlugin } from './pathSimplification';
import { roundPathPlugin } from './roundPath';
import { pathPlugin } from './path';
import { convertToPathPlugin } from './convertToPath';
import { lassoPlugin } from './lasso';
import { sourcePlugin } from './source';
import { pluginSelectorPlugin } from './pluginSelector';
import { wrap3dPlugin } from './wrap3d';
import { nativeTextPlugin } from './nativeText';
import { nativeShapesPlugin } from './nativeShapes';
import { gradientsPlugin } from './gradients';
import { patternsPlugin } from './patterns';
import { arrowsPlugin } from './arrows';
import { imagePlugin } from './image';
import { filterPlugin } from './filter';
import { libraryFiltersPlugin } from './libraryFilters';
import { animationSystemPlugin } from './animationSystem';
import { svgStructurePlugin } from './svgStructure';
import { masksPlugin } from './masks';
import { embeddedSvgPlugin } from './embeddedSvg';
import { clipboardPlugin } from './clipboard';
import { usePlugin } from './use';
import { artboardPlugin } from './artboard';
import { perspectiveGridPlugin } from './perspectiveGrid';
import { commandPalettePlugin } from './commandPalette';
import { contextActionsPlugin } from './contextActions';

export type DeferredPluginBatchId = 'libraryShell' | 'advancedTool' | 'longTail' | 'utility';

export const DEFERRED_PLUGIN_BATCHES: Array<{
  id: DeferredPluginBatchId;
  loadPlugins: () => Promise<PluginDefinition<CanvasStore>[]>;
}> = [
  {
    id: 'libraryShell',
    loadPlugins: () => import('./deferred/libraryShellPlugins').then((module) => module.LIBRARY_SHELL_PLUGINS),
  },
  {
    id: 'advancedTool',
    loadPlugins: () => import('./deferred/advancedToolPlugins').then((module) => module.ADVANCED_TOOL_PLUGINS),
  },
  {
    id: 'longTail',
    loadPlugins: () => import('./deferred/longTailPlugins').then((module) => module.LONG_TAIL_PLUGINS),
  },
  {
    id: 'utility',
    loadPlugins: () => import('./deferred/utilityPlugins').then((module) => module.UTILITY_PLUGINS),
  },
];

export const DEFERRED_PLUGIN_LOADERS: Array<() => Promise<PluginDefinition<CanvasStore>[]>> =
  DEFERRED_PLUGIN_BATCHES.map((batch) => batch.loadPlugins);

type DeferredUiState = Pick<
  CanvasStore,
  'activePlugin' | 'showFilePanel' | 'showSettingsPanel' | 'showLibraryPanel' | 'leftSidebarActivePanel'
>;

export const getDeferredPluginBatchIdsForUiState = (
  state: DeferredUiState
): DeferredPluginBatchId[] => {
  const required = new Set<DeferredPluginBatchId>();

  if (state.showFilePanel) {
    required.add('utility');
  }

  if (state.showSettingsPanel) {
    required.add('utility');
    required.add('longTail');
  }

  if (state.showLibraryPanel || state.leftSidebarActivePanel === 'library') {
    required.add('utility');
  }

  if (state.leftSidebarActivePanel === 'generatorLibrary') {
    required.add('utility');
    required.add('longTail');
  }

  if (state.leftSidebarActivePanel === 'animLibrary') {
    required.add('utility');
  }

  switch (state.activePlugin) {
    case 'generatorLibrary':
      required.add('libraryShell');
      required.add('utility');
      required.add('longTail');
      break;
    case 'animLibrary':
      required.add('libraryShell');
      required.add('utility');
      break;
    case 'auditLibrary':
      required.add('libraryShell');
      required.add('longTail');
      break;
    default:
      break;
  }

  return DEFERRED_PLUGIN_BATCHES
    .filter((batch) => required.has(batch.id))
    .map((batch) => batch.id);
};

export const CORE_PLUGINS: PluginDefinition<CanvasStore>[] = [
  selectPlugin,
  panPlugin,
  // animationSystemPlugin must run early so its importDefs can set IDs on elements inside defs
  // (mask, clipPath, pattern) before other plugins extract their content
  animationSystemPlugin,
  svgStructurePlugin,
  filePlugin,
  settingsPlugin,
  libraryPlugin,
  pencilPlugin,
  penPlugin,
  textPlugin,
  shapePlugin,
  markersPlugin,
  symbolsPlugin,
  clippingPlugin,
  subpathPlugin,
  transformationPlugin,
  editPlugin,
  pathPlugin,
  convertToPathPlugin,
  gridFillPlugin,
  measurePlugin,
  opticalAlignmentPlugin,
  guidelinesPlugin,
  objectSnapPlugin,
  gridPlugin,
  perspectiveGridPlugin,
  artboardPlugin,
  wireframePlugin,
  minimapPlugin,
  duplicateOnDragPlugin,
  trimPathPlugin,
  offsetPathPlugin,
  addPointPlugin,
  smoothBrushPlugin,
  pathSimplificationPlugin,
  roundPathPlugin,
  lassoPlugin,
  sourcePlugin,
  imagePlugin,
  nativeTextPlugin,
  nativeShapesPlugin,
  gradientsPlugin,
  patternsPlugin,
  wrap3dPlugin,
  arrowsPlugin,
  libraryFiltersPlugin,
  filterPlugin,
  masksPlugin,
  embeddedSvgPlugin,
  clipboardPlugin,
  usePlugin,
  commandPalettePlugin,
  contextActionsPlugin,
  // pluginSelectorPlugin must be last so its init() runs after all other plugins are registered
  pluginSelectorPlugin,
];
