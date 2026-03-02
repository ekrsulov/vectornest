import {
  Eye,
  EyeOff,
  Group as GroupIcon,
  Lock,
  Ungroup as UngroupIcon,
  Unlock,
} from 'lucide-react';
import type { FloatingContextMenuAction } from '../../types/plugins';

interface BuildMultiSelectionActionsParams {
  selectedIdsCount: number;
  hasGroupsInSelection: boolean;
  createGroupFromSelection: () => void;
  ungroupSelectedGroups: () => void;
  handleLockSelected: () => void;
  handleHideSelected: () => void;
  hasHiddenElements: boolean;
  showAllElements?: () => void;
  hasLockedElements: boolean;
  unlockAllElements?: () => void;
}

interface BuildGroupActionsParams {
  groupId: string;
  isGroupHidden: boolean;
  isGroupLocked: boolean;
  ungroupGroupById: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  toggleGroupVisibility: (groupId: string) => void;
}

interface BuildElementActionsParams {
  elementId: string;
  selectedIdsCount: number;
  isElementHidden: boolean;
  isElementLocked: boolean;
  createGroupFromSelection: () => void;
  toggleElementLock: (id: string) => void;
  toggleElementVisibility: (id: string) => void;
}

export const buildMultiSelectionActions = ({
  selectedIdsCount,
  hasGroupsInSelection,
  createGroupFromSelection,
  ungroupSelectedGroups,
  handleLockSelected,
  handleHideSelected,
  hasHiddenElements,
  showAllElements,
  hasLockedElements,
  unlockAllElements,
}: BuildMultiSelectionActionsParams): FloatingContextMenuAction[] => {
  const actions: FloatingContextMenuAction[] = [
    {
      id: 'group',
      label: 'Group',
      icon: GroupIcon,
      onClick: () => createGroupFromSelection(),
      isDisabled: selectedIdsCount < 2,
    },
  ];

  if (hasGroupsInSelection) {
    actions.push({
      id: 'ungroup',
      label: 'Ungroup',
      icon: UngroupIcon,
      onClick: () => ungroupSelectedGroups(),
    });
  }

  actions.push(
    {
      id: 'lock',
      label: 'Lock',
      icon: Lock,
      onClick: handleLockSelected,
    },
    {
      id: 'hide',
      label: 'Hide',
      icon: EyeOff,
      onClick: handleHideSelected,
    }
  );

  if (hasHiddenElements) {
    actions.push({
      id: 'show-all',
      label: 'Show All',
      icon: Eye,
      onClick: () => showAllElements?.(),
    });
  }

  if (hasLockedElements) {
    actions.push({
      id: 'unlock-all',
      label: 'Unlock All',
      icon: Unlock,
      onClick: () => unlockAllElements?.(),
    });
  }

  return actions;
};

export const buildGroupContextActions = ({
  groupId,
  isGroupHidden,
  isGroupLocked,
  ungroupGroupById,
  toggleGroupLock,
  toggleGroupVisibility,
}: BuildGroupActionsParams): FloatingContextMenuAction[] => {
  return [
    {
      id: 'ungroup',
      label: 'Ungroup',
      icon: UngroupIcon,
      onClick: () => ungroupGroupById(groupId),
      isDisabled: isGroupLocked,
    },
    {
      id: 'lock',
      label: isGroupLocked ? 'Unlock' : 'Lock',
      icon: isGroupLocked ? Unlock : Lock,
      onClick: () => toggleGroupLock(groupId),
    },
    {
      id: 'visibility',
      label: isGroupHidden ? 'Show' : 'Hide',
      icon: isGroupHidden ? Eye : EyeOff,
      onClick: () => toggleGroupVisibility(groupId),
    },
  ];
};

export const buildElementContextActions = ({
  elementId,
  selectedIdsCount,
  isElementHidden,
  isElementLocked,
  createGroupFromSelection,
  toggleElementLock,
  toggleElementVisibility,
}: BuildElementActionsParams): FloatingContextMenuAction[] => {
  return [
    {
      id: 'group',
      label: 'Group',
      icon: GroupIcon,
      onClick: () => createGroupFromSelection(),
      isDisabled: selectedIdsCount < 2,
    },
    {
      id: 'lock',
      label: isElementLocked ? 'Unlock' : 'Lock',
      icon: isElementLocked ? Unlock : Lock,
      onClick: () => toggleElementLock(elementId),
    },
    {
      id: 'visibility',
      label: isElementHidden ? 'Show' : 'Hide',
      icon: isElementHidden ? Eye : EyeOff,
      onClick: () => toggleElementVisibility(elementId),
    },
  ];
};
