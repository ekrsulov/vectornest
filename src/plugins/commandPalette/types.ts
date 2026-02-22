/**
 * Types for the Command Palette plugin.
 * The command palette provides VSCode-style quick command execution (⌘K / Ctrl+K).
 */

import type { ComponentType } from 'react';

/** A single executable command in the palette */
export interface PaletteCommand {
  /** Unique command identifier */
  id: string;
  /** Display label for the command */
  label: string;
  /** Category for grouping (e.g., 'Tool', 'Action', 'View') */
  category: string;
  /** Optional keyboard shortcut display text */
  shortcut?: string;
  /** Optional icon component */
  icon?: ComponentType<{ size?: number }>;
  /** Execute the command */
  execute: () => void;
  /** Whether command is currently available */
  isEnabled?: () => boolean;
  /** Search keywords (improves fuzzy matching) */
  keywords?: string[];
  /** Optional panel component to render in a modal (for Gen/Audit/Prefs/Lib panels) */
  panelComponent?: ComponentType;
  /** Label shown in the panel modal header */
  panelLabel?: string;
  /** Panel category, used to adapt modal rendering (e.g. 'prefs' shows full panel header) */
  panelCategory?: string;
}

/** Provider that contributes commands to the palette */
export interface CommandProvider {
  /** Unique provider identifier */
  id: string;
  /** Return commands this provider offers */
  getCommands: () => PaletteCommand[];
}
