import type { CanvasStore } from './canvasStore';
import type { PersistenceContribution } from '../types/extensionPoints';
import { logger } from '../utils/logger';

type Partializer = (state: CanvasStore) => Record<string, unknown>;
type Migrator = (state: unknown, version: number) => unknown;

const temporalPartializers = new Map<string, Partializer>();
const persistPartializers = new Map<string, Partializer>();
const migrators = new Map<string, Migrator>();

const buildPartialFromKeys =
  (keys: readonly string[]): Partializer =>
    (state) =>
      keys.reduce<Record<string, unknown>>((acc, key) => {
        const value = (state as Record<string, unknown>)[key];
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

export const registerStateKeys = (
  pluginId: string,
  keys: string[],
  mode: 'temporal' | 'persist' | 'both' = 'both'
): void => {
  const partializer = buildPartialFromKeys(keys);
  const contribution: PersistenceContribution = {
    pluginId,
    temporalPartialize: mode === 'temporal' || mode === 'both' ? partializer : undefined,
    persistPartialize: mode === 'persist' || mode === 'both' ? partializer : undefined,
  };
  registerPersistenceContribution(contribution);
};

export const registerPersistenceContribution = (contribution: PersistenceContribution): void => {
  const { pluginId, temporalPartialize, persistPartialize, migrate } = contribution;
  if (temporalPartialize) {
    temporalPartializers.set(pluginId, temporalPartialize);
  }
  if (persistPartialize) {
    persistPartializers.set(pluginId, persistPartialize);
  }
  if (migrate) {
    migrators.set(pluginId, migrate);
  }
};

export const unregisterPersistenceContribution = (pluginId: string): void => {
  temporalPartializers.delete(pluginId);
  persistPartializers.delete(pluginId);
  migrators.delete(pluginId);
};

const baseTemporalPartialize: Partializer = (state) => ({
  elements: state.elements,
  selectedIds: state.selectedIds,
  // Note: viewport intentionally excluded — pan/zoom should not pollute undo history
});

// Persist only stable core keys. Plugin state is persisted explicitly through
// registerStateKeys/registerPersistenceContribution to avoid writing transient data by default.
const CORE_PERSIST_KEYS = [
  // Base/document
  'elements',
  'activePlugin',
  'documentName',
  'isVirtualShiftActive',
  'lastUsedToolByGroup',
  'settings',

  // Viewport
  'viewport',

  // Group
  'groupNameCounter',
  'hiddenElementIds',
  'lockedElementIds',

  // Snap/style
  'snapPoints',
  'style',

  // UI preferences
  'arrangePanelExpanded',
  'editorAdvancedStrokeOpen',
  'editorColorControlsOpen',
  'svgStructureEnabledTags',
  'svgStructureShowWithAnimationOnly',
  'librarySearchEnabledTypes',
  'openSidebarPanelKey',
  'maximizedSidebarPanelKey',
  'sidebarWidth',
  'isSidebarPinned',
  'isSidebarOpen',
  'leftSidebarWidth',
  'isLeftSidebarPinned',
  'isLeftSidebarOpen',
  'leftOpenSidebarPanelKey',
  'leftMaximizedSidebarPanelKey',
  'leftSidebarActivePanel',
  'librarySearchQuery',
  'lastActiveLibraryPanelKey',
  'lastActiveLeftLibraryPanelKey',
] as const;

const basePersistPartialize: Partializer = buildPartialFromKeys(CORE_PERSIST_KEYS);

export const buildTemporalPartialize = (): Partializer => {
  return (state) => {
    const partials = [baseTemporalPartialize(state)];
    temporalPartializers.forEach((fn) => {
      try {
        partials.push(fn(state));
      } catch (e) {
        logger.warn('[persistence] temporal partializer error:', e);
      }
    });
    return Object.assign({}, ...partials);
  };
};

export const buildPersistPartialize = (): Partializer => {
  return (state) => {
    const partials = [basePersistPartialize(state)];
    persistPartializers.forEach((fn) => {
      try {
        partials.push(fn(state));
      } catch (e) {
        logger.warn('[persistence] persist partializer error:', e);
      }
    });
    return Object.assign({}, ...partials);
  };
};

export const runMigrations = (state: unknown, version: number): unknown => {
  let nextState = state;
  migrators.forEach((migrate) => {
    try {
      nextState = migrate(nextState, version);
    } catch (e) {
      logger.warn('[persistence] migration error:', e);
    }
  });
  return nextState;
};
