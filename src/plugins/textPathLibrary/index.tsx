/* eslint-disable react-refresh/only-export-components */
import React, { lazy } from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createTextPathLibrarySlice, type TextPathLibrarySlice } from './slice';
import { useTextPathPlacementHook } from './hooks/useTextPathPlacementHook';
import { useCanvasStore } from '../../store/canvasStore';
import type { Viewport } from '../../types';
import { BlockingOverlay } from '../../overlays/BlockingOverlay';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';
import { AspectPlacementPreview } from '../../overlays/AspectPlacementPreview';
import {
  calculateAspectPlacementRect,
  createAspectPlacementFeedback,
} from '../../utils/aspectPlacement';

const TextPathLibraryPanel = lazy(() =>
  import('./TextPathLibraryPanel').then((module) => ({ default: module.TextPathLibraryPanel }))
);

const textPathLibrarySliceFactory = createPluginSlice(createTextPathLibrarySlice);

const TextPathBlockingOverlayWrapper: React.FC<{
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}> = ({ viewport, canvasSize }) => {
  const isActive = useCanvasStore(
    (state) => (state as CanvasStore & TextPathLibrarySlice).textPathPlacementInteraction?.isActive ?? false,
  );

  return (
    <BlockingOverlay
      viewport={viewport}
      canvasSize={canvasSize}
      isActive={isActive}
    />
  );
};

const TextPathPlacementPreviewWrapper: React.FC = () => {
  const interaction = useCanvasStore(
    (state) => (state as CanvasStore & TextPathLibrarySlice).textPathPlacementInteraction,
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

const TextPathFeedbackOverlayWrapper: React.FC<{
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}> = ({ viewport, canvasSize }) => {
  const interaction = useCanvasStore(
    (state) => (state as CanvasStore & TextPathLibrarySlice).textPathPlacementInteraction,
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

export const textPathLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'textPathLibrary',
  metadata: {
    label: 'Textpath',
    cursor: 'default',
  },
  slices: [textPathLibrarySliceFactory],
  hooks: [
    {
      id: 'textpath-placement-hook',
      hook: useTextPathPlacementHook,
      global: true,
    },
  ],
  relatedPluginPanels: [
    {
      id: 'textpath-library-panel',
      targetPlugin: 'library',
      component: TextPathLibraryPanel,
      order: 9,
    },
  ],
  canvasLayers: [
    {
      id: 'textpath-placement-blocking-overlay',
      placement: 'midground',
      render: ({ viewport, canvasSize }) => (
        <TextPathBlockingOverlayWrapper viewport={viewport} canvasSize={canvasSize} />
      ),
    },
    {
      id: 'textpath-placement-preview',
      placement: 'midground',
      render: () => <TextPathPlacementPreviewWrapper />,
    },
    {
      id: 'textpath-placement-feedback',
      placement: 'foreground',
      render: ({ viewport, canvasSize }) => (
        <TextPathFeedbackOverlayWrapper viewport={viewport} canvasSize={canvasSize} />
      ),
    },
  ],
};

export type { TextPathLibrarySlice } from './slice';
