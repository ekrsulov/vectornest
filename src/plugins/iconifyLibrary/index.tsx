/* eslint-disable react-refresh/only-export-components */
import React, { lazy } from 'react';
import { Shapes } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { useCanvasStore } from '../../store/canvasStore';
import type { Viewport } from '../../types';
import { BlockingOverlay } from '../../overlays/BlockingOverlay';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';
import { AspectPlacementPreview } from '../../overlays/AspectPlacementPreview';
import {
  calculateAspectPlacementRect,
  createAspectPlacementFeedback,
} from '../../utils/aspectPlacement';
import { createIconifyLibrarySlice, type IconifyLibrarySlice } from './slice';
import { useIconifyPlacementHook } from './hooks/useIconifyPlacementHook';

const IconifyLibraryPanel = lazy(() =>
  import('./IconifyLibraryPanel').then((module) => ({
    default: module.IconifyLibraryPanel,
  })),
);

const iconifyLibrarySliceFactory = createPluginSlice(createIconifyLibrarySlice);

const IconifyBlockingOverlayWrapper: React.FC<{
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}> = ({ viewport, canvasSize }) => {
  const isActive = useCanvasStore(
    (state) => (state as CanvasStore & IconifyLibrarySlice).iconifyPlacementInteraction?.isActive ?? false,
  );

  return (
    <BlockingOverlay
      viewport={viewport}
      canvasSize={canvasSize}
      isActive={isActive}
    />
  );
};

const IconifyPlacementPreviewWrapper: React.FC = () => {
  const interaction = useCanvasStore(
    (state) => (state as CanvasStore & IconifyLibrarySlice).iconifyPlacementInteraction,
  );
  const viewport = useCanvasStore((state) => state.viewport);

  if (!interaction?.isActive || !interaction.startPoint || !interaction.targetPoint) {
    return null;
  }

  const rect = calculateAspectPlacementRect(
    interaction.startPoint,
    interaction.targetPoint,
    {
      width: interaction.sourceWidth,
      height: interaction.sourceHeight,
    },
  );

  return <AspectPlacementPreview rect={rect} viewport={viewport} />;
};

const IconifyFeedbackOverlayWrapper: React.FC<{
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}> = ({ viewport, canvasSize }) => {
  const interaction = useCanvasStore(
    (state) => (state as CanvasStore & IconifyLibrarySlice).iconifyPlacementInteraction,
  );

  if (!interaction?.isActive || !interaction.startPoint || !interaction.targetPoint) {
    return null;
  }

  const rect = calculateAspectPlacementRect(
    interaction.startPoint,
    interaction.targetPoint,
    {
      width: interaction.sourceWidth,
      height: interaction.sourceHeight,
    },
  );

  return (
    <FeedbackOverlay
      viewport={viewport}
      canvasSize={canvasSize}
      shapeFeedback={createAspectPlacementFeedback(rect, interaction.isShiftPressed)}
    />
  );
};

export const iconifyLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'iconifyLibrary',
  metadata: {
    label: 'Iconify',
    icon: Shapes,
    cursor: 'default',
  },
  slices: [iconifyLibrarySliceFactory],
  hooks: [
    {
      id: 'iconify-placement-hook',
      hook: useIconifyPlacementHook,
      global: true,
    },
  ],
  canvasLayers: [
    {
      id: 'iconify-placement-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize }) => (
        <IconifyBlockingOverlayWrapper viewport={viewport} canvasSize={canvasSize} />
      ),
    },
    {
      id: 'iconify-placement-preview',
      placement: 'midground',
      render: () => <IconifyPlacementPreviewWrapper />,
    },
    {
      id: 'iconify-placement-feedback',
      placement: 'foreground',
      render: ({ viewport, canvasSize }) => (
        <IconifyFeedbackOverlayWrapper viewport={viewport} canvasSize={canvasSize} />
      ),
    },
  ],
  relatedPluginPanels: [
    {
      id: 'iconify-library-panel',
      targetPlugin: 'library',
      component: IconifyLibraryPanel,
      order: 1,
    },
  ],
};

export type { IconifyLibrarySlice } from './slice';
