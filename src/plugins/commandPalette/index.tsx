/**
 * Command Palette Plugin
 * Provides a VSCode-style command palette (⌘K / Ctrl+K) for quick action execution.
 * Reduces desktop workflows from 3 clicks to 1 keyboard action.
 */

/* eslint-disable react-refresh/only-export-components */
import React, { useState, useCallback } from 'react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { CommandPaletteOverlay } from './CommandPaletteOverlay';
import { OPEN_COMMAND_PALETTE_EVENT } from './events';

/**
 * Global overlay component that manages command palette open/close state.
 * Registered as a global overlay so it renders above everything.
 */
const CommandPaletteGlobalOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => setIsOpen(false), []);

  // Listen for the global keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }
    };
    const handleOpenPalette = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenPalette);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenPalette);
    };
  }, []);

  return <CommandPaletteOverlay isOpen={isOpen} onClose={handleClose} />;
};

CommandPaletteGlobalOverlay.displayName = 'CommandPaletteGlobalOverlay';

export const commandPalettePlugin: PluginDefinition<CanvasStore> = {
  id: 'commandPalette',
  metadata: {
    label: 'Command Palette',
    cursor: 'default',
  },
  supportsMobile: true,

  // Register as a global overlay (always visible, manages own open/close)
  overlays: [
    {
      id: 'command-palette-overlay',
      component: CommandPaletteGlobalOverlay,
      placement: 'global',
    },
  ],

  // Global keyboard shortcut for ⌘K / Ctrl+K 
  keyboardShortcutScope: 'global',
  keyboardShortcuts: {
    'meta+k': {
      handler: () => {
        // Handled by the overlay's own keydown listener for toggle behavior
        // This registration ensures the shortcut is documented in the system
      },
      options: {
        preventDefault: true,
        allowWhileTyping: false,
      },
    },
    'ctrl+k': {
      handler: () => {
        // Handled by the overlay's own keydown listener for toggle behavior
      },
      options: {
        preventDefault: true,
        allowWhileTyping: false,
      },
    },
  },
};

export { commandRegistry } from './commandRegistry';
export type { PaletteCommand, CommandProvider } from './types';
