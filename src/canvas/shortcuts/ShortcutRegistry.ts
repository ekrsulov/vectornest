import { isTextFieldFocused } from '../../utils/domHelpers';
import type { CanvasEventBus } from '../CanvasEventBusContext';
import type {
  CanvasShortcutContext,
  CanvasShortcutDefinition,
  CanvasShortcutMap,
  CanvasShortcutOptions,
} from '../../types/plugins';

interface ShortcutInternal {
  handler: CanvasShortcutDefinition['handler'];
  options: Required<Omit<CanvasShortcutOptions, 'when'>> & {
    when?: CanvasShortcutOptions['when'];
  };
}

const DEFAULT_SHORTCUT_OPTIONS: Required<Omit<CanvasShortcutOptions, 'when'>> = {
  preventDefault: true,
  stopPropagation: false,
  allowWhileTyping: false,
};

const MODIFIER_ALIASES: Record<string, 'ctrl' | 'meta' | 'shift' | 'alt'> = {
  control: 'ctrl',
  ctrl: 'ctrl',
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  option: 'alt',
  alt: 'alt',
  shift: 'shift',
};

const MODIFIER_ORDER: Array<'ctrl' | 'meta' | 'shift' | 'alt'> = ['ctrl', 'meta', 'shift', 'alt'];

const NORMALIZED_SPACE_KEYS = new Set([' ', 'space', 'spacebar']);

const isEventTargetEditable = (event: KeyboardEvent): boolean => {
  const target = event.target as Element | null;
  if (!target) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  const editable =
    target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') !== 'false';
  return editable || tagName === 'input' || tagName === 'textarea';
};

const getActivePlugin = (context: CanvasShortcutContext | null): string | null => {
  if (!context) {
    return null;
  }
  try {
    const state = context.store.getState();
    if (typeof state === 'object' && state !== null && 'activePlugin' in state) {
      const activePlugin = (state as { activePlugin?: string | null }).activePlugin;
      return activePlugin ?? null;
    }
    return null;
  } catch (_error) {
    return null;
  }
};

export class ShortcutRegistry {
  private context: CanvasShortcutContext | null = null;
  private target: Window | Document | null = null;
  private listener: ((event: KeyboardEvent) => void) | null = null;
  private readonly sources = new Map<string, Map<string, ShortcutInternal>>();
  private readonly activeShortcuts = new Map<string, ShortcutInternal>();

  setContext(context: CanvasShortcutContext | null): void {
    this.context = context;
  }

  mount(target: Window | Document = window): void {
    if (this.listener && this.target === target) {
      return;
    }

    this.unmount();

    this.target = target;
    this.listener = (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    };
    this.target.addEventListener('keydown', this.listener as EventListener);
  }

  unmount(): void {
    if (this.listener && this.target) {
      this.target.removeEventListener('keydown', this.listener as EventListener);
    }
    this.listener = null;
    this.target = null;
  }

  register(sourceId: string, shortcuts: CanvasShortcutMap): () => void {
    const normalized = this.normalizeShortcuts(shortcuts);
    this.sources.set(sourceId, normalized);
    this.rebuildActiveShortcuts();

    return () => {
      this.sources.delete(sourceId);
      this.rebuildActiveShortcuts();
    };
  }

  clear(): void {
    this.sources.clear();
    this.activeShortcuts.clear();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.context) {
      return;
    }

    const { eventBus } = this.context;
    this.emitKeyboardEvent(eventBus, event);

    const combination = this.createCombinationFromEvent(event);
    const shortcut = combination ? this.activeShortcuts.get(combination) : undefined;

    if (!shortcut) {
      return;
    }

    if (!shortcut.options.allowWhileTyping && (isTextFieldFocused() || isEventTargetEditable(event))) {
      return;
    }

    if (shortcut.options.when && !shortcut.options.when(this.context, event)) {
      return;
    }

    if (shortcut.options.preventDefault) {
      event.preventDefault();
    }

    if (shortcut.options.stopPropagation) {
      event.stopPropagation();
    }

    shortcut.handler(event, this.context);
  }

  private emitKeyboardEvent(eventBus: CanvasEventBus, event: KeyboardEvent): void {
    if (!eventBus) {
      return;
    }

    const activePlugin = getActivePlugin(this.context);
    eventBus.emit('keyboard', {
      event,
      activePlugin,
    });
  }

  private rebuildActiveShortcuts(): void {
    this.activeShortcuts.clear();
    for (const source of this.sources.values()) {
      for (const [combination, shortcut] of source.entries()) {
        this.activeShortcuts.set(combination, shortcut);
      }
    }
  }

  private normalizeShortcuts(shortcuts: CanvasShortcutMap): Map<string, ShortcutInternal> {
    const map = new Map<string, ShortcutInternal>();
    for (const [combination, definition] of Object.entries(shortcuts)) {
      const normalizedCombination = this.normalizeCombination(combination);
      const entry = this.normalizeShortcutDefinition(definition);
      map.set(normalizedCombination, entry);
    }
    return map;
  }

  private normalizeShortcutDefinition(definition: CanvasShortcutMap[string]): ShortcutInternal {
    if (typeof definition === 'function') {
      return {
        handler: definition,
        options: { ...DEFAULT_SHORTCUT_OPTIONS },
      };
    }

    const options = definition.options ?? {};

    return {
      handler: definition.handler,
      options: {
        ...DEFAULT_SHORTCUT_OPTIONS,
        ...options,
      },
    };
  }

  private normalizeCombination(combination: string): string {
    const parsed = this.parseCombination(combination);
    return this.buildCombinationString(parsed);
  }

  private parseCombination(combination: string): {
    key: string;
    modifiers: Record<'ctrl' | 'meta' | 'shift' | 'alt', boolean>;
  } {
    const modifiers: Record<'ctrl' | 'meta' | 'shift' | 'alt', boolean> = {
      ctrl: false,
      meta: false,
      shift: false,
      alt: false,
    };

    let key: string | null = null;

    for (const partRaw of combination.split('+')) {
      const part = partRaw.trim();
      if (!part) {
        continue;
      }

      const lower = part.toLowerCase();
      const alias = MODIFIER_ALIASES[lower];
      if (alias) {
        modifiers[alias] = true;
        continue;
      }

      if (key !== null) {
        throw new Error(`Multiple keys specified in shortcut combination "${combination}".`);
      }

      key = this.normalizeKey(lower);
    }

    if (!key) {
      throw new Error(`Shortcut combination "${combination}" must include a key.`);
    }

    return { key, modifiers };
  }

  private createCombinationFromEvent(event: KeyboardEvent): string | null {
    const key = this.normalizeKey(event.key);
    if (!key) {
      return null;
    }

    return this.buildCombinationString({
      key,
      modifiers: {
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        shift: event.shiftKey,
        alt: event.altKey,
      },
    });
  }

  private buildCombinationString({
    key,
    modifiers,
  }: {
    key: string;
    modifiers: Record<'ctrl' | 'meta' | 'shift' | 'alt', boolean>;
  }): string {
    const parts: string[] = [];
    for (const modifier of MODIFIER_ORDER) {
      if (modifiers[modifier]) {
        parts.push(modifier);
      }
    }
    parts.push(key);
    return parts.join('+');
  }

  private normalizeKey(rawKey: string): string {
    if (!rawKey) {
      return rawKey;
    }

    if (rawKey === '+') {
      return 'plus';
    }

    const normalized = NORMALIZED_SPACE_KEYS.has(rawKey) ? 'space' : rawKey;
    return normalized.toLowerCase();
  }
}

export type { CanvasShortcutContext } from '../../types/plugins';
