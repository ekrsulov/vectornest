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
import { librarySearchPlugin } from './librarySearch';
import { potracePlugin } from './potrace';
import { shapeBuilderPlugin } from './shapeBuilder';
import { selectSimilarPlugin } from './selectSimilar';
import { animationSystemPlugin } from './animationSystem';
import { svgStructurePlugin } from './svgStructure';
import { masksPlugin } from './masks';
import { animationLibraryPlugin } from './animationLibrary';
import { embeddedSvgPlugin } from './embeddedSvg';
import { clipboardPlugin } from './clipboard';
import { manualMovePlugin } from './manualMove';
import { gridDistributionPlugin } from './gridDistribution';
import { usePlugin } from './use';
import { paintsPlugin } from './paints';
import { artboardPlugin } from './artboard';
import { llmAssistantPlugin } from './llmAssistant';

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
  librarySearchPlugin,
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
  potracePlugin,
  shapeBuilderPlugin,
  selectSimilarPlugin,
  masksPlugin,
  animationLibraryPlugin,
  embeddedSvgPlugin,
  clipboardPlugin,
  manualMovePlugin,
  gridDistributionPlugin,
  paintsPlugin,
  usePlugin,
  llmAssistantPlugin,
  // pluginSelectorPlugin must be last so its init() runs after all other plugins are registered
  pluginSelectorPlugin,
];
