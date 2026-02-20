import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';
import type { StateCreator } from 'zustand';

export interface PathAnatomyState extends Record<string, unknown> {
  enabled: boolean;
  /** Highlight segment types with color coding */
  highlightSegments: boolean;
  /** Show node type markers */
  showNodeTypes: boolean;
  /** Show path metrics in panel */
  showMetrics: boolean;
  /** Show segment length annotations */
  showLengths: boolean;
  /** Highlight color for lines */
  lineColor: string;
  /** Highlight color for curves */
  curveColor: string;
  /** Highlight color for move commands */
  moveColor: string;
}

export interface PathAnatomyPluginSlice {
  pathAnatomy: PathAnatomyState;
  updatePathAnatomyState: (state: Partial<PathAnatomyState>) => void;
}

export const createPathAnatomySlice: StateCreator<
  PathAnatomyPluginSlice,
  [],
  [],
  PathAnatomyPluginSlice
> = createSimplePluginSlice<'pathAnatomy', PathAnatomyState, PathAnatomyPluginSlice>(
  'pathAnatomy',
  {
    enabled: false,
    highlightSegments: true,
    showNodeTypes: true,
    showMetrics: true,
    showLengths: false,
    lineColor: '#3182CE',
    curveColor: '#D53F8C',
    moveColor: '#DD6B20',
  }
);
