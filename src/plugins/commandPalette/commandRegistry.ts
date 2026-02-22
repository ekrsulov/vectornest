/**
 * CommandRegistry - Central registry for palette commands.
 * Plugins and core systems register command providers;
 * the palette queries this registry for available commands.
 */

import type { PaletteCommand, CommandProvider } from './types';

class CommandRegistry {
  private providers = new Map<string, CommandProvider>();

  /** Register a command provider */
  register(provider: CommandProvider): () => void {
    this.providers.set(provider.id, provider);
    return () => this.providers.delete(provider.id);
  }

  /** Unregister a command provider */
  unregister(id: string): void {
    this.providers.delete(id);
  }

  /** Get all available commands from all providers */
  getAllCommands(): PaletteCommand[] {
    const commands: PaletteCommand[] = [];
    for (const provider of this.providers.values()) {
      const providerCommands = provider.getCommands();
      for (const cmd of providerCommands) {
        if (!cmd.isEnabled || cmd.isEnabled()) {
          commands.push(cmd);
        }
      }
    }
    return commands;
  }

  /** Clear all providers */
  clear(): void {
    this.providers.clear();
  }
}

export const commandRegistry = new CommandRegistry();
