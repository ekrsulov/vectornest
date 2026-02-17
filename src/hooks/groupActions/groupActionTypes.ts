import type { CanvasElement } from '../../types';

export interface GroupActionStoreSlice {
  elements: CanvasElement[];
  selectedIds: string[];
  hiddenElementIds?: string[];
  lockedElementIds?: string[];
  isElementHidden?: (id: string) => boolean;
  isElementLocked?: (id: string) => boolean;
  createGroupFromSelection: () => void;
  ungroupSelectedGroups: () => void;
  ungroupGroupById: (groupId: string) => void;
  toggleGroupVisibility: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  toggleElementVisibility: (elementId: string) => void;
  toggleElementLock: (elementId: string) => void;
  showAllElements?: () => void;
  unlockAllElements?: () => void;
}

export interface GroupActionHelpers {
  isGroupHidden: (groupId: string) => boolean;
  isGroupLocked: (groupId: string) => boolean;
  isElementHidden: (id: string) => boolean;
  isElementLocked: (id: string) => boolean;
  hasGroupsInSelection: (ids: string[]) => boolean;
  findTopMostGroupForElement: (elementId: string) => string;
}
