import { alignmentTargets } from '../../../../utils/transformationUtils';
import type { CanvasStore } from '../../../canvasStore';
import { alignElements, distributeElements, matchSizeToTarget } from './arrangeAlgorithms';
import type { ArrangeSlice } from './arrangeSliceTypes';

type ArrangeSet = (updater: (state: CanvasStore) => Partial<CanvasStore>) => void;
type ArrangeGet = () => CanvasStore;

const updateElements = (
  set: ArrangeSet,
  get: ArrangeGet,
  updater: (
    elements: CanvasStore['elements'],
    selectedIds: string[],
    zoom: number
  ) => CanvasStore['elements']
) => {
  const { selectedIds, viewport } = get();
  set((state) => ({
    elements: updater(state.elements, selectedIds, viewport.zoom),
  }));
};

export const createArrangeSliceActions = (set: ArrangeSet, get: ArrangeGet): ArrangeSlice => ({
  alignLeft: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      alignElements(elements, selectedIds, zoom, alignmentTargets.left, 'x')
    ));
  },

  alignCenter: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      alignElements(elements, selectedIds, zoom, alignmentTargets.center, 'x')
    ));
  },

  alignRight: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      alignElements(elements, selectedIds, zoom, alignmentTargets.right, 'x')
    ));
  },

  alignTop: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      alignElements(elements, selectedIds, zoom, alignmentTargets.top, 'y')
    ));
  },

  alignMiddle: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      alignElements(elements, selectedIds, zoom, alignmentTargets.middle, 'y')
    ));
  },

  alignBottom: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      alignElements(elements, selectedIds, zoom, alignmentTargets.bottom, 'y')
    ));
  },

  distributeHorizontally: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      distributeElements(elements, selectedIds, zoom, 'x')
    ));
  },

  distributeVertically: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      distributeElements(elements, selectedIds, zoom, 'y')
    ));
  },

  matchWidthToLargest: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      matchSizeToTarget(elements, selectedIds, zoom, 'width', 'largest')
    ));
  },

  matchHeightToLargest: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      matchSizeToTarget(elements, selectedIds, zoom, 'height', 'largest')
    ));
  },

  matchWidthToSmallest: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      matchSizeToTarget(elements, selectedIds, zoom, 'width', 'smallest')
    ));
  },

  matchHeightToSmallest: () => {
    updateElements(set, get, (elements, selectedIds, zoom) => (
      matchSizeToTarget(elements, selectedIds, zoom, 'height', 'smallest')
    ));
  },
});
