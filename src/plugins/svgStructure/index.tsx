import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import { createPluginSlice } from '../../utils/pluginUtils';
import { GitBranch, FolderTree } from 'lucide-react';
import { SvgStructurePanel } from './SvgStructurePanel';
import {
  GroupEditorStructureContribution,
  GroupEditorStructureBadges
} from './GroupStructureContribution';
import {
  AdvancedAnimationStructureContribution,
  AdvancedAnimationStructureBadges
} from './AnimationStructureContribution';
import { createSvgStructureSlice } from './slice';
import { SvgStructureHighlightLayer } from './SvgStructureHighlightLayer';

const svgStructureSliceFactory = createPluginSlice(createSvgStructureSlice);

export const svgStructurePlugin: PluginDefinition<CanvasStore> = {
  id: 'svgStructure',
  metadata: {
    label: 'SVG Structure',
    icon: GitBranch,
    cursor: 'default',
  },
  slices: [svgStructureSliceFactory],
  sidebarPanels: [createToolPanel('svgStructure', SvgStructurePanel)],
  sidebarToolbarButtons: [
    {
      id: 'svg-structure-panel-toggle',
      icon: FolderTree,
      label: 'Structure',
      order: 0,
    },
  ],
  canvasLayers: [
    {
      id: 'svg-structure-highlight',
      placement: 'foreground',
      render: () => <SvgStructureHighlightLayer />,
    },
  ],
  svgStructureContributions: [
    {
      id: 'group-editor-structure-toggle',
      component: GroupEditorStructureContribution,
      badgesComponent: GroupEditorStructureBadges,
      appliesTo: (node) => node.tagName === 'g' || Boolean(node.dataElementId),
      order: 10,
    },
    {
      id: 'advanced-animation-structure-actions',
      component: AdvancedAnimationStructureContribution,
      badgesComponent: AdvancedAnimationStructureBadges,
      // Apply to regular elements (with dataElementId/idAttribute)
      // OR defs children (with defsOwnerId + childIndex)
      appliesTo: (node) =>
        Boolean(node.dataElementId || node.idAttribute) ||
        Boolean(node.isDefs && node.defsOwnerId && node.childIndex !== undefined),
      order: 30,
    },
  ],
};
