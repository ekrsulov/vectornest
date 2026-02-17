import { afterEach, describe, expect, it } from 'vitest';
import type { CanvasStore } from './canvasStore';
import {
  buildPersistPartialize,
  registerPersistenceContribution,
  registerStateKeys,
  runMigrations,
  unregisterPersistenceContribution,
} from './persistenceRegistry';

const pluginIdsUsed = new Set<string>();

afterEach(() => {
  pluginIdsUsed.forEach((pluginId) => {
    unregisterPersistenceContribution(pluginId);
  });
  pluginIdsUsed.clear();
});

const createMockStoreState = (): CanvasStore => ({
  elements: [{ id: 'path-1' }],
  activePlugin: 'select',
  documentName: 'VectorNest',
  isVirtualShiftActive: false,
  lastUsedToolByGroup: { basic: 'select' },
  isPathInteractionDisabled: true,
  pathCursorMode: 'pointer',
  settings: { exportPadding: 24 },
  viewport: { zoom: 2, panX: 10, panY: 20 },
  selectedIds: ['path-1'],
  selectionPath: [{ x: 1, y: 1 }],
  groupNameCounter: 4,
  hiddenElementIds: ['hidden-1'],
  lockedElementIds: ['locked-1'],
  snapPoints: {
    showSnapPoints: true,
    snapPointsOpacity: 55,
    snapThreshold: 10,
    snapToAnchors: true,
    snapToMidpoints: true,
    snapToPath: true,
    snapToBBoxCorners: true,
    snapToBBoxCenter: true,
    snapToIntersections: true,
  },
  style: {
    strokeWidth: 4,
    strokeColor: '#000',
    strokeOpacity: 1,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeDasharray: 'none',
    fillColor: 'none',
    fillOpacity: 1,
    fillRule: 'nonzero',
    opacity: 1,
  },
  styleEyedropper: {
    isActive: true,
    copiedStyle: null,
  },
  arrangePanelExpanded: true,
  editorAdvancedStrokeOpen: true,
  editorColorControlsOpen: false,
  isDraggingElements: true,
  showFilePanel: true,
  showSettingsPanel: false,
  showLibraryPanel: true,
  canvasSize: { width: 1200, height: 800 },
  svgStructureEnabledTags: ['path'],
  svgStructureShowWithAnimationOnly: false,
  librarySearchEnabledTypes: { icon: true },
  openSidebarPanelKey: 'sidebar:library',
  maximizedSidebarPanelKey: null,
  sidebarWidth: 320,
  isSidebarPinned: true,
  isSidebarOpen: true,
  leftSidebarWidth: 280,
  isLeftSidebarPinned: false,
  isLeftSidebarOpen: true,
  leftOpenSidebarPanelKey: 'sidebar:structure',
  leftMaximizedSidebarPanelKey: null,
  leftSidebarActivePanel: 'structure',
  librarySearchQuery: 'search',
  lastActiveLibraryPanelKey: 'sidebar:library:icons',
  lastActiveLeftLibraryPanelKey: 'sidebar:library:patterns',
  groupEditor: {
    activeGroupId: 'group-1',
    isEditing: true,
    localTransforms: true,
  },
  pluginTransientState: { enabled: true },
  updateElement: () => {},
}) as unknown as CanvasStore;

describe('persistenceRegistry', () => {
  it('persists only explicit core keys by default', () => {
    const state = createMockStoreState();
    const partialize = buildPersistPartialize();

    const persisted = partialize(state);

    expect(persisted.elements).toEqual(state.elements);
    expect(persisted.settings).toEqual(state.settings);
    expect(persisted.style).toEqual(state.style);
    expect(persisted.sidebarWidth).toBe(state.sidebarWidth);

    expect(persisted.isDraggingElements).toBeUndefined();
    expect(persisted.canvasSize).toBeUndefined();
    expect(persisted.selectionPath).toBeUndefined();
    expect(persisted.styleEyedropper).toBeUndefined();
    expect(persisted.groupEditor).toBeUndefined();
    expect(persisted.pluginTransientState).toBeUndefined();
    expect(persisted.updateElement).toBeUndefined();
  });

  it('includes persist keys registered by plugins', () => {
    const pluginId = 'test-persist-keys';
    pluginIdsUsed.add(pluginId);
    registerStateKeys(pluginId, ['pluginTransientState'], 'persist');

    const persisted = buildPersistPartialize()(createMockStoreState());
    expect(persisted.pluginTransientState).toEqual({ enabled: true });
  });

  it('runs registered migrators', () => {
    const pluginId = 'test-migrator-a';
    pluginIdsUsed.add(pluginId);

    registerPersistenceContribution({
      pluginId,
      migrate: (state: unknown) => ({
        ...(state as Record<string, unknown>),
        migratedBy: pluginId,
      }),
    });

    const migrated = runMigrations({ value: 1 }, 3) as Record<string, unknown>;
    expect(migrated.migratedBy).toBe(pluginId);
    expect(migrated.value).toBe(1);
  });

  it('removes migrators when a contribution is unregistered', () => {
    const pluginId = 'test-migrator-b';
    pluginIdsUsed.add(pluginId);

    registerPersistenceContribution({
      pluginId,
      migrate: (state: unknown) => ({
        ...(state as Record<string, unknown>),
        deleted: false,
      }),
    });

    unregisterPersistenceContribution(pluginId);
    pluginIdsUsed.delete(pluginId);

    const migrated = runMigrations({ value: 2 }, 3) as Record<string, unknown>;
    expect(migrated.deleted).toBeUndefined();
    expect(migrated.value).toBe(2);
  });

  it('uses the latest migrator for the same pluginId', () => {
    const pluginId = 'test-migrator-c';
    pluginIdsUsed.add(pluginId);

    registerPersistenceContribution({
      pluginId,
      migrate: (state: unknown) => ({
        ...(state as Record<string, unknown>),
        marker: 'first',
      }),
    });

    registerPersistenceContribution({
      pluginId,
      migrate: (state: unknown) => ({
        ...(state as Record<string, unknown>),
        marker: 'second',
      }),
    });

    const migrated = runMigrations({ value: 3 }, 3) as Record<string, unknown>;
    expect(migrated.marker).toBe('second');
    expect(migrated.value).toBe(3);
  });
});
