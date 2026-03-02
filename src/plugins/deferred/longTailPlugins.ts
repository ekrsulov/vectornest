import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { noiseGeneratorPlugin } from '../noiseGenerator';
import { symmetryDrawPlugin } from '../symmetryDraw';
import { pathMorphPlugin } from '../pathMorph';
import { halftonePlugin } from '../halftone';
import { stickerEffectPlugin } from '../stickerEffect';
import { scatterAlongPathPlugin } from '../scatterAlongPath';
import { symmetryMirrorPlugin } from '../symmetryMirror';
import { pathTexturePlugin } from '../pathTexture';
import { glitchEffectPlugin } from '../glitchEffect';
import { particleFieldPlugin } from '../particleField';
import { waveDistortPlugin } from '../waveDistort';
import { spiralGeneratorPlugin } from '../spiralGenerator';
import { pathWeavePlugin } from '../pathWeave';
import { geometricPatternPlugin } from '../geometricPattern';
import { kaleidoscopePlugin } from '../kaleidoscope';
import { pathStitchPlugin } from '../pathStitch';
import { fractalTreePlugin } from '../fractalTree';
import { voronoiDiagramPlugin } from '../voronoiDiagram';
import { mazeGeneratorPlugin } from '../mazeGenerator';
import { guillochePlugin } from '../guilloche';
import { isometricGridPlugin } from '../isometricGrid';
import { celticKnotPlugin } from '../celticKnot';
import { gearGeneratorPlugin } from '../gearGenerator';
import { mandalaGeneratorPlugin } from '../mandalaGenerator';
import { curvatureCombPlugin } from '../curvatureComb';
import { colorHarmonyPlugin } from '../colorHarmony';
import { layoutEnginePlugin } from '../layoutEngine';
import { pathDirectionPlugin } from '../pathDirection';
import { compositionGuidesPlugin } from '../compositionGuides';
import { pathAnatomyPlugin } from '../pathAnatomy';
import { smartDistributePlugin } from '../smartDistribute';
import { contrastCheckerPlugin } from '../contrastChecker';
import { elementRulerPlugin } from '../elementRuler';
import { colorPalettePlugin } from '../colorPalette';
import { elementInspectorPlugin } from '../elementInspector';
import { alignmentAnalyzerPlugin } from '../alignmentAnalyzer';
import { svgSizeAnalyzerPlugin } from '../svgSizeAnalyzer';
import { gridCompliancePlugin } from '../gridCompliance';
import { duplicateFinderPlugin } from '../duplicateFinder';
import { documentAuditPlugin } from '../documentAudit';
import { bboxVisualizerPlugin } from '../bboxVisualizer';
import { layerDepthPlugin } from '../layerDepth';
import { accessibilityCheckerPlugin } from '../accessibilityChecker';
import { pathStatisticsPlugin } from '../pathStatistics';
import { spacingAnalyzerPlugin } from '../spacingAnalyzer';
import { namingManagerPlugin } from '../namingManager';
import { symmetryDetectorPlugin } from '../symmetryDetector';
import { elementComparatorPlugin } from '../elementComparator';
import { whiteSpaceAnalyzerPlugin } from '../whiteSpaceAnalyzer';
import { coordinateMapperPlugin } from '../coordinateMapper';
import { selectionStatisticsPlugin } from '../selectionStatistics';
import { anchorPointAnalyzerPlugin } from '../anchorPointAnalyzer';
import { pathComplexityScorerPlugin } from '../pathComplexityScorer';
import { tangentVisualizerPlugin } from '../tangentVisualizer';
import { elementHeatmapPlugin } from '../elementHeatmap';
import { proportionCheckerPlugin } from '../proportionChecker';
import { pathWindingAnalyzerPlugin } from '../pathWindingAnalyzer';
import { distanceMatrixPlugin } from '../distanceMatrix';
import { gradientMapperPlugin } from '../gradientMapper';
import { intersectionDetectorPlugin } from '../intersectionDetector';
import { strokeProfileAnalyzerPlugin } from '../strokeProfileAnalyzer';

export const LONG_TAIL_PLUGINS: PluginDefinition<CanvasStore>[] = [
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
];
