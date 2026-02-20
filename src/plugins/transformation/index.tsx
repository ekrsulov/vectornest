/* eslint-disable react-refresh/only-export-components */
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import { SquareDashedMousePointer } from 'lucide-react';
import { createTransformationPluginSlice } from './slice';
import type { TransformationPluginSlice } from './slice';
import React from 'react';
import { TransformationPanel } from './TransformationPanel';
import { TransformationOverlay } from './TransformationOverlay';
import { TransformationFeedbackLayer } from './TransformationFeedbackLayer';
import { BlockingOverlay } from '../../overlays';
import { measureSubpathBounds } from '../../utils/measurementUtils';
import type { PathData } from '../../types';
import { useTransformationHook } from './hooks/useTransformationHook';
import { useCanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import type { InlineTextEditSlice } from '../nativeText/inlineEditSlice';

// Helper component to read transformation state for BlockingOverlay
const TransformationBlockingOverlay: React.FC<{
  viewport: { panX: number; panY: number; zoom: number };
  canvasSize: { width: number; height: number };
}> = ({ viewport, canvasSize }) => {
  const transformState = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformState
  );
  const advancedTransformState = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).advancedTransformState
  );
  const isTransforming =
    transformState?.isTransforming ||
    advancedTransformState?.isTransforming ||
    false;

  return (
    <BlockingOverlay
      viewport={viewport}
      canvasSize={canvasSize}
      isActive={isTransforming}
      onPointerUp={undefined}
    />
  );
};

const transformationSliceFactory = createPluginSlice(createTransformationPluginSlice);

export const transformationPlugin: PluginDefinition<CanvasStore> = {
  id: 'transformation',
  metadata: {
    label: 'Transform',
    icon: SquareDashedMousePointer,
    cursor: 'move',
  },
  modeConfig: {
    description: 'Manipulation of size, rotation and position.',
    toggleTo: 'select',
  },
  behaviorFlags: () => ({
    selectionMode: 'elements',
    skipSubpathMeasurements: true,
  }),
  toolDefinition: {
    order: 3,
    visibility: 'dynamic',
    toolGroup: 'basic',
    isDisabled: (store) => {
      // Allow transformation when at least one element is selected (paths, images, groups, or any contributed type)
      return store.selectedIds.length === 0;
    },
  },
  hooks: [
    {
      id: 'transformation-controls',
      hook: useTransformationHook,
      global: true, // Execute regardless of active plugin
    },
  ],
  keyboardShortcuts: {
    Escape: (_event, { store }) => {
      const state = store.getState() as CanvasStore;
      if ((state.selectedSubpaths?.length ?? 0) > 0) {
        state.setActivePlugin('subpath');
      } else {
        state.setActivePlugin('select');
      }
    },
  },
  onElementDoubleClick: (elementId, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = state.selectedIds.length === 1 && state.selectedIds[0] === elementId;
    if (wasAlreadySelected) {
      const element = state.elements.find(el => el.id === elementId);
      if (!element) return;
      
      // For paths: go to edit mode
      if (element.type === 'path') {
        state.setActivePlugin('edit');
      }
      // For nativeText: start inline text editing and switch to nativeText mode
      else if (element.type === 'nativeText') {
        state.setActivePlugin('nativeText');
        const inlineState = state as unknown as InlineTextEditSlice;
        inlineState.startInlineTextEdit?.(elementId);
      }
      // For image: go to image panel
      else if (element.type === 'image') {
        state.setActivePlugin('image');
      }
      // For nativeShape: go to nativeShapes panel
      else if (element.type === 'nativeShape') {
        state.setActivePlugin('nativeShapes');
      }
    }
  },
  onSubpathDoubleClick: (elementId, subpathIndex, _event, context) => {
    const state = context.store.getState();
    const wasAlreadySelected = (state.selectedSubpaths?.length ?? 0) === 1 &&
      state.selectedSubpaths?.[0].elementId === elementId &&
      state.selectedSubpaths?.[0].subpathIndex === subpathIndex;

    if (wasAlreadySelected) {
      state.setActivePlugin('edit');
    } else {
      const subpathSelection = [{ elementId, subpathIndex }];
      context.store.setState({ selectedSubpaths: subpathSelection });
    }
  },
  onCanvasDoubleClick: (_event, context) => {
    context.store.getState().setActivePlugin('select');
  },
  handler: (
    _event,
    _point,
    _target,
    _context
  ) => {
    // Transformation tool relies on pointer event listeners elsewhere
  },
  canvasLayers: [
    {
      id: 'transformation-controls',
      placement: 'foreground',
      render: (props) => {
        const {
          selectedIds,
          selectedSubpaths,
          elementMap,
          viewport,
          activePlugin,
          isElementHidden,
          isWorkingWithSubpaths,
          getElementBounds,
        } = props;
        const transformation = props.transformation as {
          showCoordinates?: boolean;
          showRulers?: boolean;
          advancedMode?: boolean;
          rotationPivot?: { x: number; y: number } | null;
          rotationPivotTarget?: string | null;
        } | undefined;
        // This layer handles:
        // 1. Subpath transformations (when in subpath/transformation mode)
        // 2. Single path transformations (when in select/transformation mode)
        // Note: Group and multi-selection handlers are rendered by the select plugin

        // Case 1: Working with subpaths
        if (isWorkingWithSubpaths?.() && (selectedSubpaths ?? []).length > 0) {
          return (
            <>
              {selectedSubpaths!.map((selection: { elementId: string; subpathIndex: number }) => {
                const element = elementMap.get(selection.elementId);

                if (!element || element.type !== 'path' || (isElementHidden && isElementHidden(selection.elementId))) {
                  return null;
                }

                const pathData = element.data as PathData;
                const bounds = measureSubpathBounds(
                  pathData.subPaths[selection.subpathIndex],
                  pathData.strokeWidth ?? 1,
                  viewport.zoom
                );

                return (
                  <TransformationOverlay
                    key={`subpath-${selection.elementId}-${selection.subpathIndex}`}
                    element={element}
                    bounds={bounds}
                    selectedSubpaths={selectedSubpaths ?? []}
                    viewport={viewport}
                    activePlugin={activePlugin}
                    transformation={transformation}
                    isWorkingWithSubpaths={true}
                  />
                );
              })}
            </>
          );
        }

        // Case 2: Single element selected (not a group, not multi-selection)
        // Only show if in select or transformation mode
        if (selectedIds.length === 1 && (activePlugin === 'select' || activePlugin === 'transformation')) {
          const element = elementMap.get(selectedIds[0]);
          if (!element || (isElementHidden && isElementHidden(selectedIds[0]))) {
            return null;
          }

          // Only handle non-group elements here (groups are handled by select plugin)
          if (element.type !== 'group') {
            const bounds = getElementBounds(element);
            if (bounds) {
              return (
                <TransformationOverlay
                  element={element}
                  bounds={bounds}
                  selectedSubpaths={[]}
                  viewport={viewport}
                  activePlugin={activePlugin}
                  transformation={transformation}
                  isWorkingWithSubpaths={false}
                />
              );
            }
          }
        }

        return null;
      },
    },
    {
      id: 'transformation-feedback',
      placement: 'foreground',
      render: ({ viewport, canvasSize }) => (
        <TransformationFeedbackLayer viewport={viewport} canvasSize={canvasSize} />
      ),
    },
    {
      id: 'transformation-blocking-overlay',
      placement: 'foreground',
      render: ({ viewport, canvasSize }) => (
        <TransformationBlockingOverlay
          viewport={viewport}
          canvasSize={canvasSize}
        />
      ),
    },
  ],
  slices: [transformationSliceFactory],
  expandablePanel: () => React.createElement(TransformationPanel, { hideTitle: true }),
  sidebarPanels: [createToolPanel('transformation', TransformationPanel)],
};
