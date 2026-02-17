import type { PluginDefinition } from '../../types/plugins';
import type { CanvasDecorator, CanvasDecoratorContext } from '../../types/interaction';
import type { CanvasStore } from '../../store/canvasStore';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { useCanvasStore } from '../../store/canvasStore';
import { createGridPluginSlice } from './slice';
import type { GridPluginSlice } from './slice';
import GridPanelComponent from './GridPanel';
import { GridOverlay } from './GridOverlay';
import { createGridSnapModifier } from './snapModifier';
import { pluginManager } from '../../utils/pluginManager';
import { Rulers, RULER_SIZE } from '../../ui/Rulers';
import { GridSnapSource } from './GridSnapSource';
import { snapManager } from '../../snap/SnapManager';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { registerToggleFlag, unregisterToggleFlag } from '../../utils/toggleFlagRegistry';
import { createPluginSlice } from '../../utils/pluginUtils';

registerStateKeys('grid', ['grid'], 'temporal');

const GRID_ENABLED_TOGGLE_ID = 'grid-enabled';
const GRID_RULERS_TOGGLE_ID = 'grid-show-rulers';

const registerGridToggleFlags = () => {
  registerToggleFlag({
    id: GRID_ENABLED_TOGGLE_ID,
    pluginId: 'grid',
    label: 'Grid',
    group: 'view',
    isActive: (state) => (state as CanvasStore & GridPluginSlice).grid?.enabled ?? false,
    toggle: (state) => {
      const gridState = (state as CanvasStore & GridPluginSlice).grid;
      (state as CanvasStore & GridPluginSlice).updateGridState?.({
        enabled: !(gridState?.enabled ?? false),
      });
    },
  });

  registerToggleFlag({
    id: GRID_RULERS_TOGGLE_ID,
    pluginId: 'grid',
    label: 'Grid Rulers',
    group: 'view',
    isActive: (state) => (state as CanvasStore & GridPluginSlice).grid?.showRulers ?? false,
    toggle: (state) => {
      const gridState = (state as CanvasStore & GridPluginSlice).grid;
      (state as CanvasStore & GridPluginSlice).updateGridState?.({
        showRulers: !(gridState?.showRulers ?? false),
      });
    },
  });
};

const unregisterGridToggleFlags = () => {
  unregisterToggleFlag(GRID_ENABLED_TOGGLE_ID);
  unregisterToggleFlag(GRID_RULERS_TOGGLE_ID);
};

const gridSliceFactory = createPluginSlice(createGridPluginSlice);

/**
 * Creates the grid rulers decorator.
 * Shows rulers when grid is enabled and showRulers is true,
 * but yields to guidelines rulers when they are active.
 */
const createGridRulersDecorator = (): CanvasDecorator => ({
  id: 'grid-rulers',
  placement: 'before-canvas',
  isVisible: (store: Record<string, unknown>) => {
    const grid = store.grid as { enabled?: boolean; showRulers?: boolean } | undefined;
    const guidelines = store.guidelines as { enabled?: boolean; manualGuidesEnabled?: boolean } | undefined;
    // Don't show if guidelines rulers are active (they take precedence)
    if (guidelines?.enabled && guidelines?.manualGuidesEnabled) return false;
    return grid?.enabled && grid?.showRulers || false;
  },
  getOffset: () => ({
    top: RULER_SIZE,
    left: RULER_SIZE,
    width: RULER_SIZE,
    height: RULER_SIZE,
  }),
  render: ({ viewport, canvasSize }: CanvasDecoratorContext) => {
    return (
      <Rulers
        width={canvasSize.width}
        height={canvasSize.height}
        viewport={viewport}
        interactive={false}
      />
    );
  },
});

export const gridPlugin: PluginDefinition<CanvasStore> = {
  id: 'grid',
  metadata: {
    label: 'Grid',
    cursor: 'default',
  },
  canvasLayers: [
    {
      id: 'grid-overlay',
      placement: 'background',
      render: ({ viewport, canvasSize }) => {
        // Access grid state from store instead of context
        const GridOverlayWrapper = () => {
          const grid = useCanvasStore(state => (state as CanvasStore & GridPluginSlice).grid);
          return (
            <GridOverlay
              grid={grid ?? { enabled: false, type: 'square', spacing: 20, showRulers: false }}
              viewport={viewport}
              canvasSize={canvasSize}
            />
          );
        };
        return <GridOverlayWrapper />;
      },
    },
  ],
  slices: [gridSliceFactory],
  init: (context) => {
    registerGridToggleFlags();

    // Register the drag modifier for grid snapping
    const unregisterDragModifier = pluginManager.registerDragModifier(
      createGridSnapModifier(context)
    );

    // Register the canvas decorator for rulers
    const unregisterDecorator = pluginManager.registerCanvasDecorator(
      createGridRulersDecorator()
    );

    // Register snap source
    const gridSnapSource = new GridSnapSource(context.store);
    snapManager.registerSource(gridSnapSource);

    // Return cleanup function
    return () => {
      unregisterDragModifier();
      unregisterDecorator();
      snapManager.unregisterSource(gridSnapSource.id);
      unregisterGridToggleFlags();
    };
  },
  sidebarPanels: [createSettingsPanel('grid', GridPanelComponent)],
};

export type { GridPluginSlice };
export { GridPanelComponent as GridPanel };
export { GridOverlay } from './GridOverlay';
