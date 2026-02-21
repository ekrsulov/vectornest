# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
bun run dev              # Start dev server (port 5173)
bun run build            # TypeScript compile + Vite build
bun run preview          # Preview production build locally
bun run type-check       # TypeScript type checking without emit
bun run lint             # ESLint code quality check
bun run test             # Run Vitest unit tests
```

**IMPORTANT**: Always run `bun run lint` and `bun run build` after making changes. Fix any errors or warnings before considering the task complete.

## Coding Standards

### Language Requirements

- **All code comments MUST be in English**
- **All UI text MUST be in English** (labels, placeholders, error messages, tooltips, etc.)
- Variable and function names should always be in English (following standard TypeScript/React conventions)

## Architecture Overview

VectorNest is a web-based vector graphics editor with a **plugin-centric architecture**. All tools (pencil, pen, shape, edit, etc.) are implemented as plugins that dynamically register state, UI, event handlers, and canvas layers.

**Tech stack**: React 19 + TypeScript + Zustand + Chakra UI v3 + Vite 7

### Core Directories

| Directory | Purpose |
|-----------|---------|
| `src/canvas/` | SVG canvas rendering, viewport, event bus, mode machine, drag/selection strategies, shortcuts, renderers |
| `src/plugins/` | All tool plugins (60+), each with slice, panel, actions |
| `src/store/` | Zustand store with temporal middleware (undo/redo) and persistence |
| `src/types/` | Core types: CanvasElement, PathData, PluginDefinition, selection types |
| `src/utils/` | pluginManager (central orchestrator), exportUtils, importManager, geometry, registries |
| `src/ui/` | 50+ reusable panel components (Panel, SliderControl, CustomSelect, etc.) |
| `src/sidebar/` | Sidebar components and panel hosting |
| `src/hooks/` | Shared React hooks (clipboard, alignment, selection, snap, layout) |
| `src/overlays/` | Selection, snap point, blocking, feedback, and animation preview overlays |
| `src/snap/` | Snap system: SnapManager, snap providers, overlay, cursor position store |
| `src/services/` | DocumentService (save/load), MovementService |
| `src/contexts/` | Sidebar context and panel state management |
| `src/theme/` | Chakra UI theme config (colors, spacing, typography, component overrides) |
| `src/design-system/` | Design system documentation page and components |

### Plugin System

All functionality is implemented as plugins in `src/plugins/<name>/`. Each plugin:
1. Exports a `PluginDefinition<CanvasStore>` from `index.tsx`
2. Optionally registers a Zustand slice via `slices` array
3. Contributes UI via `sidebarPanels`, `canvasLayers`, `overlays`, or `actions`
4. Hooks into events via `subscribedEvents` + `handler`

**Plugin registration**: Add to `CORE_PLUGINS` in `src/plugins/index.tsx`. Keep `pluginSelectorPlugin` last (its `init()` must run after all others are registered).

**Plugin structure** (`src/plugins/<name>/`):
- `index.tsx` — Plugin definition with id, metadata, slices, handlers
- `slice.ts` — Zustand state slice (if needed)
- `<Name>Panel.tsx` — Sidebar UI panel
- Other files as needed (hooks, utils, overlays, types, presets)

**Key plugin type interfaces** (`src/types/plugins.ts` — barrel re-export of `plugin-context.ts`, `plugin-ui.ts`, `plugin-definition.ts`, `plugin-slice-utils.ts`):

`PluginDefinition` is composed from 10 sub-interfaces:

| Sub-interface | Key Fields |
|---|---|
| `PluginIdentity` | `id`, `metadata` (label, cursor), `supportsMobile?`, `dependencies?` |
| `PluginImportExport` | `importers?`, `importDefs?`, `styleAttributeExtractor?` |
| `PluginMode` | `modeConfig?` (description, entry, exit), `behaviorFlags?` |
| `PluginEvents` | `subscribedEvents?`, `handler?`, `onElementDoubleClick?`, `onCanvasDoubleClick?` |
| `PluginShortcuts` | `keyboardShortcutScope?` ('activePlugin'\|'global'), `keyboardShortcuts?` |
| `PluginUIContributions` | `overlays?`, `canvasLayers?`, `canvasOverlays?`, `sidebarPanels?`, `providers?`, `sidebarToolbarButtons?`, `expandablePanel?`, `relatedPluginPanels?` |
| `PluginTool` | `toolDefinition?` (order, visibility, isDisabled, toolGroup) |
| `PluginActions` | `actions?`, `contextMenuActions?`, `arrangeConfig?` |
| `PluginSvgIntegration` | `svgStructureContributions?`, `svgDefsEditors?` |
| `PluginState` | `slices?`, `createApi?` |
| `PluginLifecycle` | `init?`, `registerHelpers?`, `hooks?`, `disablesGlobalUndoRedo?` |
| `PluginRendering` | `renderBehavior?`, `onColorModeChange?`, `elementContributions?` |

**`PluginBehaviorFlags`** (from `src/types/plugin-ui.ts`):
- `preventsSelection`, `selectionMode` ('elements'\|'subpaths'\|'commands'\|'none'), `hideSelectionOverlay`, `hideSelectionBbox`, `usesObjectSnap`, `usesMeasureSnap`, `isPanMode`, `showPointFeedback`, etc.

**Context system**: `PluginContextManager` (`src/utils/plugins/PluginContextManager.ts`) provides unified context creation:
- `createHandlerContext(pluginId)` — For event handlers and lifecycle methods
- `createHooksContext()` — For React hooks needing canvas access
- `createFullContext(pluginId)` — Complete context with all capabilities

**`PluginContextFull`** provides: `store`, `accessor`, `api`, `helpers`, `activePlugin`, `viewportZoom`, `colorMode`, `svgRef`, `screenToCanvas`, `emitPointerEvent`, `pointerState`, `requireDep`, `optionalDep`, `hasDep`

**Lifecycle management**: `LifecycleManager` (`src/utils/plugins/LifecycleManager.ts`) handles plugin lifecycle actions:
- `register(id, handler)` — Register lifecycle action handlers
- `execute(id)` — Execute handlers for a lifecycle action

**Central orchestrator**: `pluginManager` in `src/utils/pluginManager.ts` handles plugin registration, lifecycle, slice injection, and inter-plugin communication.

### Sidebar Panel Groups

The right sidebar organizes plugin panels into three tab groups, each with a distinct purpose and registration mechanism:

#### Gen (Generator Library)

**Purpose**: Generation of new elements, application of advanced effects/transforms, and utility operations that modify or create canvas content. These plugins typically present a configuration panel with parameters and an "Apply" action button.

**Registration**: Plugins contribute their panel via `relatedPluginPanels` with `targetPlugin: 'generatorLibrary'`. Panels are sorted **alphabetically** by plugin label.

**Sub-categories and plugins**:

| Sub-category | Plugins |
|---|---|
| **Generative patterns** | `celticKnot`, `fractalTree`, `gearGenerator`, `geometricPattern`, `guilloche`, `kaleidoscope`, `mandalaGenerator`, `mazeGenerator`, `noiseGenerator`, `particleField`, `spiralGenerator`, `voronoiDiagram` |
| **Path effects & transforms** | `glitchEffect`, `halftone`, `offsetPath`, `pathMorph`, `pathStitch`, `pathTexture`, `pathWeave`, `scatterAlongPath`, `stickerEffect`, `waveDistort` |
| **Layout & distribution** | `gridDistribution`, `isometricGrid`, `layoutEngine`, `manualMove`, `smartDistribute` |
| **Conversion utilities** | `convertToPath` |

---

#### Audit (Audit Library)

**Purpose**: Read-only informational reports and analysis about the SVG document and its elements. These plugins inspect and present data without modifying the canvas. They typically have a "Run" button that triggers analysis and displays results.

**Registration**: Plugins contribute their panel via `relatedPluginPanels` with `targetPlugin: 'auditLibrary'`. Panels are sorted **alphabetically** by plugin label.

**Sub-categories and plugins**:

| Sub-category | Plugins |
|---|---|
| **Document-level analysis** | `documentAudit`, `svgSizeAnalyzer`, `duplicateFinder`, `namingManager` |
| **Color & visual analysis** | `colorPalette`, `contrastChecker`, `gradientMapper` |
| **Geometry & structure** | `anchorPointAnalyzer`, `distanceMatrix`, `elementComparator`, `elementInspector`, `pathComplexityScorer`, `pathStatistics`, `pathWindingAnalyzer`, `proportionChecker`, `selectionStatistics`, `strokeProfileAnalyzer`, `symmetryDetector`, `whiteSpaceAnalyzer` |
| **Compliance & accessibility** | `accessibilityChecker`, `gridCompliance` |

---

#### Prefs (Settings Panels)

**Purpose**: Activation/deactivation and configuration of plugins that provide persistent visual overlays or real-time on-canvas feedback. Each panel features an enable/disable toggle (`PanelSwitch`) and configuration controls (sliders, selects) that take effect immediately on the canvas. These plugins always register a `canvasLayer` (foreground/background overlay) alongside their settings panel.

**Registration**: Plugins register their panel via `createSettingsPanel(key, component)` in `sidebarPanels`, which shows the panel when `ctx.showSettingsPanel` is true. Panels are sorted by explicit `order`.

**Sub-categories and plugins**:

| Sub-category | Plugins |
|---|---|
| **Canvas guides & grids** | `grid`, `guidelines`, `compositionGuides`, `isometricGrid` (overlay aspect) |
| **Path visualization** | `curvatureComb`, `pathDirection`, `pathAnatomy`, `tangentVisualizer` |
| **Element analysis overlays** | `bboxVisualizer`, `elementHeatmap`, `elementRuler`, `layerDepth`, `spacingAnalyzer`, `alignmentAnalyzer`, `intersectionDetector`, `coordinateMapper` |
| **Drawing aids** | `symmetryDraw`, `symmetryMirror` |

### State Management

Zustand store (`src/store/canvasStore.ts`) with:
- **Temporal middleware (zundo)**: 50-state undo/redo history
- **Persist middleware**: LocalStorage persistence
- **Dynamic slice registration**: Plugins inject slices via `registerPluginSlices`

Store type is `CoreCanvasStore & Record<string, any>` — plugin state is dynamic.

**Critical pattern**: Use `useShallow` for multi-property selectors:
```typescript
import { useShallow } from 'zustand/react/shallow';
const { zoom, panX } = useCanvasStore(useShallow(state => ({
  zoom: state.viewport.zoom,
  panX: state.viewport.panX
})));
```

**Persistence**: Register state keys in `src/store/persistenceRegistry.ts`:
```typescript
registerStateKeys(pluginId, ['stateKey'], mode);
// mode: 'temporal' (undo/redo only), 'persist' (localStorage only), 'both' (default)
```

### Canvas System

| Component | Location | Purpose |
|-----------|----------|---------|
| `Canvas.tsx` | `src/canvas/` | Main entry point with layered SVG rendering |
| `CanvasStage.tsx` | `src/canvas/components/` | SVG stage with viewport transforms, cursor, pointer events |
| `CanvasRenderer.tsx` | `src/canvas/components/` | Element rendering orchestrator |
| `CanvasLayers.tsx` | `src/canvas/components/` | Plugin-contributed canvas layers (bg/mid/fg) |
| `CanvasModeMachine.ts` | `src/canvas/modes/` | Tool/mode transition state machine |
| `ShortcutRegistry.ts` | `src/canvas/shortcuts/` | Keyboard shortcut management per scope |
| `ViewportController.ts` | `src/canvas/viewport/` | Zoom/pan viewport transforms |
| `CanvasEventBusContext.tsx` | `src/canvas/` | Pub/sub event bus for pointer events |
| `DragStrategy.ts` | `src/canvas/interactions/` | Drag interaction handling |
| Renderers | `src/canvas/renderers/` | PathElementRenderer, GroupElementRenderer, registry |

### Event System

- **CanvasEventBus** (`src/canvas/CanvasEventBusContext.tsx`) — Pub/sub for pointer events
- Plugins subscribe via `subscribedEvents: ['pointerdown', 'pointermove', 'pointerup']`
- Elements use `data-element-id` attribute for hit testing
- Mode machine (`src/canvas/modes/CanvasModeMachine.ts`) handles tool transitions

### Import/Export Pipeline

- **Import**: `importManager` (`src/utils/import/ImportManager.ts`) handles SVG parsing, bitmap tracing (Potrace), delegates to plugin hooks
- **Export**: `serializePathsForExport` in `src/utils/exportUtils.ts` serializes canvas to SVG, calls plugin contributors for defs/animations/filters
- Plugins can extend import/export via `importers`, `importDefs`, `elementContributions`, `svgDefsEditors`

### Element Types

`CanvasElement` union type:
- **`path`**: Main drawing primitive (also used for shapes, pencil, pen, potrace results)
- **`group`**: Hierarchical containers with transforms, masks, clipPaths
- **Plugin elements**: Custom types registered via `elementContributionRegistry` (symbols, native shapes, images, etc.)

Path data model (`src/types/index.ts`):
```typescript
type Command =
  | { type: 'M' | 'L'; position: Point }
  | { type: 'C'; controlPoint1: ControlPoint; controlPoint2: ControlPoint; position: Point }
  | { type: 'Z' };
```

## Creating a New Plugin

### Step-by-Step Guide

#### 1. Create the plugin directory

```
src/plugins/myFeature/
├── index.tsx          # Plugin definition (required)
├── slice.ts           # State slice (if plugin has state)
├── MyFeaturePanel.tsx  # Sidebar panel UI (if plugin has UI)
├── types.ts           # Plugin-specific types (optional)
└── utils.ts           # Plugin-specific utilities (optional)
```

#### 2. Define the state slice (`slice.ts`)

Use `createSimplePluginSlice` for standard state with an update method:

```typescript
import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

// State interface MUST extend Record<string, unknown>
export interface MyFeatureState extends Record<string, unknown> {
  enabled: boolean;
  intensity: number;
}

export interface MyFeaturePluginSlice {
  myFeature: MyFeatureState;
  updateMyFeatureState: (state: Partial<MyFeatureState>) => void;
}

export const createMyFeaturePluginSlice: StateCreator<
  MyFeaturePluginSlice,
  [],
  [],
  MyFeaturePluginSlice
> = createSimplePluginSlice<'myFeature', MyFeatureState, MyFeaturePluginSlice>(
  'myFeature',
  { enabled: false, intensity: 50 }
);
```

For custom actions, use `createCustomPluginSlice` from the same file.

#### 3. Create the sidebar panel (`MyFeaturePanel.tsx`)

```tsx
import React from 'react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { MyFeaturePluginSlice } from './slice';

export const MyFeaturePanel: React.FC = () => {
  const myFeature = useCanvasStore(
    (state) => (state as CanvasStore & MyFeaturePluginSlice).myFeature
  );
  const updateMyFeatureState = useCanvasStore(
    (state) => (state as CanvasStore & MyFeaturePluginSlice).updateMyFeatureState
  );

  return (
    <Panel
      title="My Feature"
      isCollapsible={myFeature?.enabled ?? false}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={myFeature?.enabled ?? false}
          onChange={(e) => updateMyFeatureState?.({ enabled: e.target.checked })}
          aria-label="Toggle my feature"
        />
      }
    >
      {myFeature?.enabled && (
        <SliderControl
          label="Intensity"
          value={myFeature.intensity}
          min={0}
          max={100}
          onChange={(val) => updateMyFeatureState?.({ intensity: val })}
        />
      )}
    </Panel>
  );
};
```

**Available panel components** (from `src/ui/`):
- `Panel`, `SectionHeader`, `PanelHeader`, `PanelActionButton`
- `PanelSwitch`, `PanelToggle`, `PanelToggleGroup`
- `SliderControl`, `PercentSliderControl`, `NumberInput`
- `CustomSelect`, `PanelTextInput`
- `ToggleButton`, `JoinedButtonGroup`, `PanelStyledButton`
- `PresetButtonGrid`, `FillRuleSelector`, `LinecapSelector`, `LinejoinSelector`

#### 4. Create the plugin definition (`index.tsx`)

```tsx
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createMyFeaturePluginSlice } from './slice';
import { MyFeaturePanel } from './MyFeaturePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

// Register state for undo/redo ('temporal'), localStorage ('persist'), or 'both'
registerStateKeys('myFeature', ['myFeature'], 'temporal');

export const myFeaturePlugin: PluginDefinition<CanvasStore> = {
  id: 'myFeature',
  metadata: {
    label: 'My Feature',
    cursor: 'default',
  },

  // State slice
  slices: [createPluginSlice(createMyFeaturePluginSlice)],

  // Sidebar panel (shown when condition returns true)
  sidebarPanels: [
    {
      key: 'myFeature',
      condition: (ctx) => ctx.showSettingsPanel, // or ctx.showSelectPanel, etc.
      component: MyFeaturePanel,
    },
  ],

  // Optional: subscribe to canvas pointer events
  // subscribedEvents: ['pointerdown', 'pointermove', 'pointerup'],
  // handler: (eventType, event, point, target, context) => { ... },

  // Optional: keyboard shortcuts
  // keyboardShortcutScope: 'global', // or 'activePlugin'
  // keyboardShortcuts: { ... },

  // Optional: canvas layers (background/midground/foreground)
  // canvasLayers: [{ position: 'background', component: MyOverlay }],

  // Optional: mode config for tools that switch canvas mode
  // modeConfig: { description: 'My tool mode' },

  // Optional: tool definition for toolbar visibility
  // toolDefinition: { order: 100 },
};

export type { MyFeaturePluginSlice };
```

#### 5. Register the plugin

Add to `CORE_PLUGINS` in `src/plugins/index.tsx`:

```typescript
import { myFeaturePlugin } from './myFeature';

export const CORE_PLUGINS: PluginDefinition<CanvasStore>[] = [
  // ... existing plugins ...
  myFeaturePlugin,
  pluginSelectorPlugin, // MUST remain last
];
```

#### 6. Slice helper utilities

| Helper | Location | Purpose |
|--------|----------|---------|
| `createSimplePluginSlice(key, initialState)` | `src/utils/pluginSliceHelpers.ts` | Auto-generates state + `update<Key>State` method |
| `createCustomPluginSlice(key, initialState, actionsFactory)` | `src/utils/pluginSliceHelpers.ts` | State with custom actions beyond the update method |
| `createPluginSlice(stateCreator)` | `src/utils/pluginUtils.ts` | Wraps a StateCreator into a `PluginSliceFactory` |
| `createSettingsPanel(key, component)` | `src/utils/pluginFactories.ts` | Shorthand for settings-panel sidebar entry |

## Inter-Plugin Communication

1. **`createApi`**: Expose public methods from a plugin
   ```typescript
   createApi: ({ store }) => ({
     myMethod: () => { /* ... */ }
   })
   ```
   Call via `pluginManager.callPluginApi('pluginId', 'myMethod', args)`

2. **`registerHelpers`**: Share utility functions accessible by all plugins
   ```typescript
   init: (context) => {
     context.helpers.register('myHelper', myHelperFn);
   }
   ```

3. **`registerLifecycleAction`**: Hook into mode transitions
   ```typescript
   pluginManager.registerLifecycleAction('onModeEnter:my-mode', () => { /* ... */ });
   ```

4. **Dependencies**: Declare inter-plugin dependencies
   ```typescript
   dependencies: ['otherPlugin'],           // required — plugin won't load without it
   optionalDependencies: ['anotherPlugin'],  // optional — graceful degradation
   // Access in handlers:
   context.requireDep('otherPlugin');  // throws if missing
   context.optionalDep('anotherPlugin');  // returns undefined if missing
   context.hasDep('anotherPlugin');  // returns boolean
   ```

## Testing

- **E2E**: Playwright tests in `tests/` using helpers from `tests/helpers.ts`
  ```typescript
  import { clickToolButton, getCanvasPaths, waitForLoad } from './helpers';
  await clickToolButton(page, 'Shape');
  ```
- **Unit**: Vitest tests in `src/**/*.test.ts`
  - Mock `opentype.js` via `src/testing/vitest.setup.ts`
  - Run specific test: `npx vitest run src/utils/path/parsing.test.ts`

## Common Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `clientToCanvas` | `src/utils/pointUtils.ts` | Convert screen to canvas coordinates |
| `mergeBounds` | `src/utils/measurementUtils.ts` | Merge element bounds |
| `buildElementMap` | `src/utils/elementMapUtils.ts` | Create element lookup map |
| `distanceSquared` | `src/utils/geometry.ts` | Squared distance (avoids sqrt) |
| `collectGroupDescendants` | `src/utils/groupTraversalUtils.ts` | BFS collection of group descendant IDs |
| `isPointSelectionType` | `src/types/selection.ts` | Check if selection is a point type |
| `pluginManager` | `src/utils/pluginManager.ts` | Central plugin orchestration |
| `registerStateKeys` | `src/store/persistenceRegistry.ts` | Register state for persistence/undo |
| `createSimplePluginSlice` | `src/utils/pluginSliceHelpers.ts` | Generate plugin slice with defaults |
| `createPluginSlice` | `src/utils/pluginUtils.ts` | Wrap StateCreator into PluginSliceFactory |
| `createSettingsPanel` | `src/utils/pluginFactories.ts` | Shorthand for settings sidebar panel |

## Mobile Considerations

- Plugins should set `supportsMobile?: boolean` (defaults to true)
- Use `isTouchDevice()` from `src/utils/domHelpers.ts` for touch detection
- Viewport uses `dvh` units for dynamic keyboard handling
- Safe area insets handled in `src/canvas/hooks/useMobileTouchGestures.ts`
