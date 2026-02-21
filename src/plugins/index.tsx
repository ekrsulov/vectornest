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
import { noiseGeneratorPlugin } from './noiseGenerator';
import { symmetryDrawPlugin } from './symmetryDraw';
import { pathMorphPlugin } from './pathMorph';
import { halftonePlugin } from './halftone';
import { stickerEffectPlugin } from './stickerEffect';
import { scatterAlongPathPlugin } from './scatterAlongPath';
import { symmetryMirrorPlugin } from './symmetryMirror';
import { pathTexturePlugin } from './pathTexture';
import { glitchEffectPlugin } from './glitchEffect';
import { particleFieldPlugin } from './particleField';
import { waveDistortPlugin } from './waveDistort';
import { spiralGeneratorPlugin } from './spiralGenerator';
import { pathWeavePlugin } from './pathWeave';
import { geometricPatternPlugin } from './geometricPattern';
import { kaleidoscopePlugin } from './kaleidoscope';
import { pathStitchPlugin } from './pathStitch';
import { fractalTreePlugin } from './fractalTree';
import { voronoiDiagramPlugin } from './voronoiDiagram';
import { mazeGeneratorPlugin } from './mazeGenerator';
import { guillochePlugin } from './guilloche';
import { isometricGridPlugin } from './isometricGrid';
import { celticKnotPlugin } from './celticKnot';
import { gearGeneratorPlugin } from './gearGenerator';
import { mandalaGeneratorPlugin } from './mandalaGenerator';
import { generatorLibraryPlugin } from './generatorLibrary';
import { auditLibraryPlugin } from './auditLibrary';
import { curvatureCombPlugin } from './curvatureComb';
import { colorHarmonyPlugin } from './colorHarmony';
import { layoutEnginePlugin } from './layoutEngine';
import { pathDirectionPlugin } from './pathDirection';
import { compositionGuidesPlugin } from './compositionGuides';
import { pathAnatomyPlugin } from './pathAnatomy';
import { smartDistributePlugin } from './smartDistribute';
import { contrastCheckerPlugin } from './contrastChecker';
import { elementRulerPlugin } from './elementRuler';
import { colorPalettePlugin } from './colorPalette';
import { elementInspectorPlugin } from './elementInspector';
import { alignmentAnalyzerPlugin } from './alignmentAnalyzer';
import { svgSizeAnalyzerPlugin } from './svgSizeAnalyzer';
import { gridCompliancePlugin } from './gridCompliance';
import { duplicateFinderPlugin } from './duplicateFinder';
import { documentAuditPlugin } from './documentAudit';
import { bboxVisualizerPlugin } from './bboxVisualizer';
import { layerDepthPlugin } from './layerDepth';
import { accessibilityCheckerPlugin } from './accessibilityChecker';
import { pathStatisticsPlugin } from './pathStatistics';
import { spacingAnalyzerPlugin } from './spacingAnalyzer';
import { namingManagerPlugin } from './namingManager';
import { symmetryDetectorPlugin } from './symmetryDetector';
import { elementComparatorPlugin } from './elementComparator';
import { whiteSpaceAnalyzerPlugin } from './whiteSpaceAnalyzer';
import { coordinateMapperPlugin } from './coordinateMapper';
import { selectionStatisticsPlugin } from './selectionStatistics';
import { anchorPointAnalyzerPlugin } from './anchorPointAnalyzer';
import { pathComplexityScorerPlugin } from './pathComplexityScorer';
import { tangentVisualizerPlugin } from './tangentVisualizer';
import { elementHeatmapPlugin } from './elementHeatmap';
import { proportionCheckerPlugin } from './proportionChecker';
import { pathWindingAnalyzerPlugin } from './pathWindingAnalyzer';
import { distanceMatrixPlugin } from './distanceMatrix';
import { gradientMapperPlugin } from './gradientMapper';
import { intersectionDetectorPlugin } from './intersectionDetector';
import { strokeProfileAnalyzerPlugin } from './strokeProfileAnalyzer';
import { knifePlugin } from './knife';
import { blobBrushPlugin } from './blobBrush';
import { perspectiveGridPlugin } from './perspectiveGrid';
import { smartEraserPlugin } from './smartEraser';
import { sprayCanPlugin } from './sprayCan';
import { pathWeldPlugin } from './pathWeld';
import { shapeCutterPlugin } from './shapeCutter';
import { roughenToolPlugin } from './roughenTool';
import { cornerRounderPlugin } from './cornerRounder';
import { zigzagToolPlugin } from './zigzagTool';
import { stampBrushPlugin } from './stampBrush';
import { stippleBrushPlugin } from './stippleBrush';
import { coilToolPlugin } from './coilTool';
import { starBurstPlugin } from './starBurst';
import { erodeDilatePlugin } from './erodeDilate';
import { scallopToolPlugin } from './scallopTool';
import { fractureToolPlugin } from './fractureTool';
import { bridgeToolPlugin } from './bridgeTool';
import { smoothPaintPlugin } from './smoothPaint';

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
  generatorLibraryPlugin,
  auditLibraryPlugin,
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
  knifePlugin,
  pathWeldPlugin,
  shapeCutterPlugin,
  roughenToolPlugin,
  cornerRounderPlugin,
  smartEraserPlugin,
  blobBrushPlugin,
  sprayCanPlugin,
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
  noiseGeneratorPlugin,
  symmetryDrawPlugin,
  pathMorphPlugin,
  halftonePlugin,
  stickerEffectPlugin,
  scatterAlongPathPlugin,
  symmetryMirrorPlugin,
  pathTexturePlugin,
  glitchEffectPlugin,
  particleFieldPlugin,
  waveDistortPlugin,
  spiralGeneratorPlugin,
  pathWeavePlugin,
  geometricPatternPlugin,
  kaleidoscopePlugin,
  pathStitchPlugin,
  fractalTreePlugin,
  voronoiDiagramPlugin,
  mazeGeneratorPlugin,
  guillochePlugin,
  isometricGridPlugin,
  celticKnotPlugin,
  gearGeneratorPlugin,
  mandalaGeneratorPlugin,
  curvatureCombPlugin,
  colorHarmonyPlugin,
  layoutEnginePlugin,
  pathDirectionPlugin,
  compositionGuidesPlugin,
  pathAnatomyPlugin,
  smartDistributePlugin,
  contrastCheckerPlugin,
  elementRulerPlugin,
  colorPalettePlugin,
  elementInspectorPlugin,
  alignmentAnalyzerPlugin,
  svgSizeAnalyzerPlugin,
  gridCompliancePlugin,
  duplicateFinderPlugin,
  documentAuditPlugin,
  bboxVisualizerPlugin,
  layerDepthPlugin,
  accessibilityCheckerPlugin,
  pathStatisticsPlugin,
  spacingAnalyzerPlugin,
  namingManagerPlugin,
  symmetryDetectorPlugin,
  elementComparatorPlugin,
  whiteSpaceAnalyzerPlugin,
  coordinateMapperPlugin,
  selectionStatisticsPlugin,
  anchorPointAnalyzerPlugin,
  pathComplexityScorerPlugin,
  tangentVisualizerPlugin,
  elementHeatmapPlugin,
  proportionCheckerPlugin,
  pathWindingAnalyzerPlugin,
  distanceMatrixPlugin,
  gradientMapperPlugin,
  intersectionDetectorPlugin,
  strokeProfileAnalyzerPlugin,
  zigzagToolPlugin,
  stampBrushPlugin,
  stippleBrushPlugin,
  coilToolPlugin,
  starBurstPlugin,
  erodeDilatePlugin,
  scallopToolPlugin,
  fractureToolPlugin,
  bridgeToolPlugin,
  smoothPaintPlugin,
  // pluginSelectorPlugin must be last so its init() runs after all other plugins are registered
  pluginSelectorPlugin,
];
