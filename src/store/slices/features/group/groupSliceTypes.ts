import type { StateCreator } from 'zustand';
import type { CanvasElement, GroupElement } from '../../../../types';
import type { CanvasStore } from '../../../canvasStore';

export interface GroupSlice {
  groupNameCounter: number;
  hiddenElementIds: string[];
  lockedElementIds: string[];
  createGroupFromSelection: (name?: string) => string | null;
  ungroupSelectedGroups: () => void;
  ungroupGroupById: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
  toggleGroupVisibility: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  toggleElementVisibility: (elementId: string) => void;
  toggleElementLock: (elementId: string) => void;
  showAllElements: () => void;
  unlockAllElements: () => void;
  getGroupById: (groupId: string) => GroupElement | null;
  getGroupDescendants: (groupId: string) => string[];
  isElementHidden: (elementId: string) => boolean;
  isElementLocked: (elementId: string) => boolean;
}

export interface GroupSliceHelpers {
  normalizeRootZIndices: (elements: CanvasElement[]) => CanvasElement[];
  hasSelectedAncestor: (
    element: CanvasElement,
    selectedIds: Set<string>,
    map: Map<string, CanvasElement>
  ) => boolean;
  findTopMostGroup: (element: CanvasElement, map: Map<string, CanvasElement>) => CanvasElement;
  getElementMap: (elements: CanvasElement[]) => Map<string, CanvasElement>;
  collectDescendants: (group: GroupElement, map: Map<string, CanvasElement>) => string[];
}

export interface IdSetCacheEntry {
  source: string[] | undefined;
  set: Set<string>;
}

export interface ElementMapCacheEntry {
  source: CanvasElement[] | null;
  map: Map<string, CanvasElement>;
}

export interface GroupFlagCache {
  hidden: IdSetCacheEntry;
  locked: IdSetCacheEntry;
  elementMap: ElementMapCacheEntry;
}

export type GroupSliceSet = Parameters<StateCreator<CanvasStore, [], [], GroupSlice>>[0];
export type GroupSliceGet = Parameters<StateCreator<CanvasStore, [], [], GroupSlice>>[1];
