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
  selectedIds: string[];
  hasGroupsInSelection: (ids: string[]) => boolean;
  createGroupFromSelection: () => void;
  ungroupSelectedGroups: () => void;
  handleLockSelected: () => void;
  handleHideSelected: () => void;
  hasHiddenElements: () => boolean;
  showAllElements?: () => void;
  hasLockedElements: () => boolean;
  unlockAllElements?: () => void;
}

interface BuildGroupActionsParams {
  groupId: string;
  isGroupHidden: (groupId: string) => boolean;
  isGroupLocked: (groupId: string) => boolean;
  ungroupGroupById: (groupId: string) => void;
  toggleGroupLock: (groupId: string) => void;
  toggleGroupVisibility: (groupId: string) => void;
}

interface BuildElementActionsParams {
  elementId: string;
  selectedIds: string[];
  isElementHidden: (id: string) => boolean;
  isElementLocked: (id: string) => boolean;
  createGroupFromSelection: () => void;
  toggleElementLock: (id: string) => void;
  toggleElementVisibility: (id: string) => void;
}

export const buildMultiSelectionActions = ({
  selectedIds,
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
      isDisabled: selectedIds.length < 2,
    },
  ];

  if (hasGroupsInSelection(selectedIds)) {
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

  if (hasHiddenElements()) {
    actions.push({
      id: 'show-all',
      label: 'Show All',
      icon: Eye,
      onClick: () => showAllElements?.(),
    });
  }

  if (hasLockedElements()) {
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
  const isHidden = isGroupHidden(groupId);
  const isLocked = isGroupLocked(groupId);

  return [
    {
      id: 'ungroup',
      label: 'Ungroup',
      icon: UngroupIcon,
      onClick: () => ungroupGroupById(groupId),
      isDisabled: isLocked,
    },
    {
      id: 'lock',
      label: isLocked ? 'Unlock' : 'Lock',
      icon: isLocked ? Unlock : Lock,
      onClick: () => toggleGroupLock(groupId),
    },
    {
      id: 'visibility',
      label: isHidden ? 'Show' : 'Hide',
      icon: isHidden ? Eye : EyeOff,
      onClick: () => toggleGroupVisibility(groupId),
    },
  ];
};

export const buildElementContextActions = ({
  elementId,
  selectedIds,
  isElementHidden,
  isElementLocked,
  createGroupFromSelection,
  toggleElementLock,
  toggleElementVisibility,
}: BuildElementActionsParams): FloatingContextMenuAction[] => {
  const isHidden = isElementHidden(elementId);
  const isLocked = isElementLocked(elementId);

  return [
    {
      id: 'group',
      label: 'Group',
      icon: GroupIcon,
      onClick: () => createGroupFromSelection(),
      isDisabled: selectedIds.length < 2,
    },
    {
      id: 'lock',
      label: isLocked ? 'Unlock' : 'Lock',
      icon: isLocked ? Unlock : Lock,
      onClick: () => toggleElementLock(elementId),
    },
    {
      id: 'visibility',
      label: isHidden ? 'Show' : 'Hide',
      icon: isHidden ? Eye : EyeOff,
      onClick: () => toggleElementVisibility(elementId),
    },
  ];
};
