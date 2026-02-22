/**
 * useContextActions - Collects ALL actions relevant to the current selection.
 * Returns structured action groups for the context overlay bar:
 * - Direct actions: single icon buttons
 * - Grouped actions: submenu parent with child actions (shown via popover)
 */

import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { useSelectionContext, useEnabledPlugins } from '../../hooks';
import { useFloatingContextMenuActions } from '../../hooks/useFloatingContextMenuActions';
import type { FloatingContextMenuAction } from '../../types/plugins';

/** A simple quick action (single button) */
export interface QuickAction {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

/** A group of actions (parent with submenu items) */
export interface ActionGroup {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** If present, the parent itself is clickable */
  onClick?: () => void;
  children: QuickAction[];
}

/** Full structured result from the hook */
export interface ContextActionsResult {
  /** Top-level actions with no submenu */
  directActions: QuickAction[];
  /** Groups of actions (parent + submenu) */
  groups: ActionGroup[];
}

/**
 * Process all context menu actions into structured direct actions and groups.
 */
function processActions(actions: FloatingContextMenuAction[]): ContextActionsResult {
  const directActions: QuickAction[] = [];
  const groups: ActionGroup[] = [];

  for (const action of actions) {
    // Skip sidebar toggle actions
    if (action.id === 'toggle-sidebar' || action.id === 'toggle-left-sidebar') continue;
    if (action.isDisabled) continue;

    if (action.submenu && action.submenu.length > 0) {
      // Action with submenu → becomes a group
      const children: QuickAction[] = [];
      for (const sub of action.submenu) {
        if (sub.onClick && !sub.isDisabled) {
          children.push({
            id: `${action.id}-${sub.id}`,
            label: sub.label,
            icon: sub.icon as ComponentType<{ size?: number }>,
            onClick: sub.onClick,
            variant: sub.variant,
          });
        }
      }
      if (children.length > 0) {
        groups.push({
          id: action.id,
          label: action.label,
          icon: action.icon as ComponentType<{ size?: number }>,
          onClick: action.onClick,
          children,
        });
      }
    } else if (action.onClick) {
      // Direct action
      directActions.push({
        id: action.id,
        label: action.label,
        icon: action.icon as ComponentType<{ size?: number }>,
        onClick: action.onClick,
        variant: action.variant,
      });
    }
  }

  return { directActions, groups };
}

export function useContextActions(): ContextActionsResult {
  const context = useSelectionContext();
  const allActions = useFloatingContextMenuActions(context);
  useEnabledPlugins();

  return useMemo(() => {
    if (!context || context.type === 'canvas') {
      return { directActions: [], groups: [] };
    }
    return processActions(allActions);
  }, [context, allActions]);
}

