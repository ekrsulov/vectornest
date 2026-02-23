# Animation Manager Plugin — Design & Implementation Plan

## 1. Problem Statement

The current animation system spreads functionality across **3 disconnected UIs**:

| Entry Point | What It Does | Limitations |
|---|---|---|
| **Animation Library** (Gen tab) | Apply preset animations to selection | No customization, no editing, no visibility into existing animations |
| **Animation Workspace** (Modal) | Full timeline + editor + preview + sync | Blocks canvas interaction, no selection context, massive form with 25+ state hooks, fragmented tabs |
| **SVG Structure Tree** (per-node) | Per-node animation badges, inline quick-presets, custom creator | Buried in the tree, no overview across elements, limited editing surface |

**Key pain points:**
- No single place to see "all animations affecting my selection"
- Modal blocks the canvas — can't see changes live
- Direct vs. indirect (ref-based) animations are hard to discover
- No "Apply & Customize" workflow — presets are fire-and-forget
- Timeline is locked inside a modal with no canvas context
- Three different preset formats with no consistency

---

## 2. Design Philosophy

### Core Principles

1. **Selection-centric**: The manager always shows animations for the current selection — not all animations globally. When selection changes, the view updates.
2. **Non-blocking**: Use a docked/floating side panel instead of a modal overlay. The user can interact with the canvas while the manager is open.
3. **Discovery-first**: Automatically discover and display both **direct animations** (target = element) and **indirect animations** (target = gradient/filter/pattern/mask/marker/clipPath/symbol referenced by the element).
4. **Progressive disclosure**: Start simple (overview + quick actions), expand into detail (property editing, timing curves, gizmos) on demand.
5. **Live feedback**: Every edit is applied immediately to the canvas with SMIL rendering — no "save" step needed. Changes go through the Zustand store and are automatically undo/redo-able.
6. **Unified presets**: One preset browser that combines Library presets (multi-animation, with preview SVGs) and Editor presets (single-animation, by category) into a searchable, filterable catalog.

---

## 3. UX Design

### 3.1 Activation & Placement

**Plugin type**: Tool plugin with a toolbar button and keyboard shortcut.

- **Toolbar button**: Appears in the main tool sidebar (left), with a "motion lines" icon. Order ~85 (after eraser tools, before audit tools).
- **Keyboard shortcut**: `Shift+A` (global scope) toggles the plugin.
- **Activation**: When activated, a **docked right panel** slides open (width ~420px, resizable) alongside the existing sidebar. This is NOT a modal — the canvas remains fully interactive.
- **Selection sync**: The panel listens to `selectedIds` from the store. When selection changes, the panel updates to show animations for the new selection. Empty selection shows a "Select elements to manage animations" placeholder.

### 3.2 Panel Layout — Three Zones

The manager panel is vertically divided into 3 collapsible zones:

```
┌─────────────────────────────────────────┐
│  ANIMATION MANAGER          [▶][⏹][⚙]  │  ← Header: title + playback mini-controls + settings
├─────────────────────────────────────────┤
│                                         │
│  ZONE 1: ANIMATION MAP                 │  ← Discovery zone: visual map of all animations
│  (collapsible, default open)            │     affecting the selection
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ZONE 2: ANIMATION EDITOR              │  ← Editing zone: properties of the selected
│  (collapsible, default open)            │     animation, with live preview
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ZONE 3: PRESET CATALOG                │  ← Creation zone: unified preset browser
│  (collapsible, default collapsed)       │     with search, categories, and preview
│                                         │
└─────────────────────────────────────────┘
```

---

### 3.3 Zone 1: Animation Map

**Purpose**: At a glance, show every animation that affects the selected element(s), organized by relationship type.

```
┌─────────────────────────────────────────┐
│ ▼ Animation Map                    [+]  │  ← Section header with "Add" button
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Direct ──────────────────────────┐  │
│  │ ⚡ rotate 360°        1.5s  ∞  ▸ │  │  ← Animation row: icon + description +
│  │ ⚡ fadeIn opacity      0.8s  1  ▸ │  │     dur + repeat + expand arrow
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ Gradient: "sunset-grad" ─────────┐  │  ← Indirect group header (ref name)
│  │ 🎨 stop[0] color      2.0s  ∞  ▸ │  │
│  │ 🎨 stop[1] offset     2.0s  ∞  ▸ │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ Filter: "blur-effect" ───────────┐  │
│  │ 🔮 stdDeviation       1.0s  1  ▸ │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ Mini Timeline ───────────────────┐  │
│  │ ▏████░░░░░░░░░░░░░░░░░░░░░░░░░▕  │  │  ← Compact timeline showing all anims
│  │ ▏██████████░░░░░░░░░░░░░░░░░░░▕  │  │     as colored bars, with playhead
│  │ ▏░░░░████████████░░░░░░░░░░░░░▕  │  │
│  │  0s              1.5s          3s │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- **Grouping**: Animations grouped by relationship: "Direct", then one group per referenced def ("Gradient: name", "Filter: name", "Pattern: name", "Mask: name", etc.)
- **Animation rows**: Each row shows:
  - Type icon (⚡ animate, 🔄 animateTransform, 📐 animateMotion, ⏸ set)
  - Human-readable description auto-generated from the animation properties (e.g., "rotate 360°", "opacity 0→1", "translateX 0→100")
  - Duration pill
  - Repeat count pill (∞ for indefinite)
  - Expand chevron → click to select this animation for editing in Zone 2
- **Row actions** (on hover): 
  - 👁 Toggle visibility (temporarily disable without deleting)
  - 📋 Duplicate
  - 🗑 Delete
  - ⚙ Open gizmo mode for this animation
- **Mini Timeline**: Compact Gantt-like view showing all animations as horizontal colored bars within a shared time axis. The playhead is draggable. Clicking a bar selects the animation. This replaces the need for the full Timeline tab.
- **Multi-selection**: When multiple elements are selected, the map shows animations per element in collapsible sections, each headed by an element thumbnail and name.
- **[+] button**: Creates a new animation targeting the current element (opens Zone 2 in creation mode).

---

### 3.4 Zone 2: Animation Editor

**Purpose**: Edit the currently selected animation's properties with live canvas feedback. Appears when an animation is selected from Zone 1, or when creating a new animation.

```
┌─────────────────────────────────────────┐
│ ▼ Editor: "rotate 360°"    [Gizmo][🗑] │  ← Section header with gizmo toggle + delete
├─────────────────────────────────────────┤
│                                         │
│  Type    [animateTransform ▾]           │  ← Core properties (always visible)
│  Attr    [rotate           ▾]           │
│  Target  [Element (direct) ▾]           │
│                                         │
│  ── Values ──────────────────────────── │
│  Mode    ○ From/To    ● Values          │  ← Toggle between simple & keyframe mode
│                                         │
│  ┌─ Keyframe Track ─────────────────┐   │
│  │  ◆────────◆────────◆────────◆   │   │  ← Visual keyframe editor
│  │  0°      90°      270°     360°  │   │     Drag diamonds to reposition
│  │  0       0.33     0.66      1    │   │     Click to add/remove keyframes
│  └──────────────────────────────────┘   │
│                                         │
│  ── Timing ──────────────────────────── │
│  Duration  [━━━━━━━━━━━━━●━] 1.5s      │
│  Repeat    [━━━━━━━━━━━━━━━●] ∞         │
│  Delay     [●━━━━━━━━━━━━━━━] 0s        │
│  Fill      [freeze ▾]                   │
│                                         │
│  ── Easing ──────────────────────────── │
│  ┌──────────────────────────────────┐   │
│  │         ╱‾‾‾‾‾‾╲                │   │  ← Interactive cubic-bezier curve
│  │       ╱          ╲               │   │     editor (drag control points)
│  │     ╱              ╲             │   │
│  │   ╱                  ╲           │   │
│  │  •                     •         │   │
│  └──────────────────────────────────┘   │
│  Preset [ease-in-out ▾]                 │
│  CalcMode [spline ▾]                    │
│                                         │
│  ▸ Advanced                             │  ← Expandable: begin, end, additive,
│                                         │     accumulate, attrType, repeatDur
│                                         │
│  [Apply to All Selected]                │  ← Batch apply to multi-selection
│                                         │
└─────────────────────────────────────────┘
```

**Key innovations:**

1. **Visual Keyframe Track**: Instead of text inputs for `values`/`keyTimes`, render a horizontal track with draggable diamond markers. Each keyframe shows its value below. Click between keyframes to add. Right-click to delete. Values are auto-computed as the user drags.

2. **Interactive Easing Curve Editor**: Instead of typing `keySplines` strings, render a bezier curve canvas where users drag the two control points. Common easing presets are available via a dropdown. The curve updates in real-time on the canvas.

3. **Smart Attribute Picker**: Instead of a text input for `attributeName`, provide a categorized dropdown that shows:
   - **Common**: opacity, fill, stroke, transform, d (path morph)
   - **Position**: x, y, cx, cy, dx, dy, width, height, r, rx, ry
   - **Style**: stroke-width, stroke-dashoffset, stroke-dasharray, fill-opacity, stroke-opacity
   - **Filter**: stdDeviation, baseFrequency, scale, etc. (when targeting a filter)
   - **Gradient**: offset, stop-color, stop-opacity (when targeting a gradient)
   - **Text**: font-size, letter-spacing, word-spacing, textLength
   And it auto-filters based on the animation type and target.

4. **Live canvas feedback**: Every property change is immediately applied to the Zustand store → canvas re-renders with SMIL. No save button. Undo with Ctrl+Z works per-field-change.

5. **Gizmo integration**: The "Gizmo" button activates the gizmo overlay for the selected animation directly on the canvas. The gizmo handles appear, and dragging them updates the editor fields bidirectionally.

6. **Target switcher**: Change animation target between direct and any available def reference with a clean dropdown (same as `AnimationTargetSelector` but integrated inline).

---

### 3.5 Zone 3: Preset Catalog

**Purpose**: Unified preset browser combining all preset sources into a single searchable catalog.

```
┌─────────────────────────────────────────┐
│ ▸ Preset Catalog                        │  ← Collapsed by default
├─────────────────────────────────────────┤
│                                         │
│  🔍 [Search presets...              ]   │
│                                         │
│  Tags: [All] [Entrance] [Exit] [Loop]   │
│        [Transform] [Style] [Path]       │
│        [Filter] [Text] [Advanced]       │
│                                         │
│  ┌───────┐ ┌───────┐ ┌───────┐         │
│  │ ◌→◉   │ │  ↻    │ │ ↕     │         │  ← Preview cards with animated
│  │Fade In│ │Rotate │ │Bounce │         │     SVG thumbnails
│  │ 0.8s  │ │ 1.5s  │ │ 0.6s  │         │
│  │[Apply]│ │[Apply]│ │[Apply]│         │
│  └───────┘ └───────┘ └───────┘         │
│  ┌───────┐ ┌───────┐ ┌───────┐         │
│  │  ~    │ │  ⟲    │ │  ≈    │         │
│  │Pulse  │ │Swing  │ │Wave   │         │
│  │ loop  │ │ loop  │ │ 2.0s  │         │
│  │[Apply]│ │[Apply]│ │[Apply]│         │
│  └───────┘ └───────┘ └───────┘         │
│                                         │
│  [Load more...]                         │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- **Unified search**: Searches across Library presets (100+) and Editor presets (195+) by name, category, and description.
- **Tag filtering**: Quick filter chips for categories. Support multi-select tags.
- **Animated preview cards**: Each card shows a small looping SVG animation thumbnail. Library presets use their `previewSvg`; Editor presets get auto-generated previews.
- **Apply action**: Clicking "Apply" on a card:
  1. Creates the animation(s) targeting the selected element(s)
  2. Automatically selects the first created animation in Zone 1
  3. Opens Zone 2 with the animation loaded for immediate customization
  - This solves the "Apply & Customize" gap.
- **Contextual filtering**: When an element is selected, presets are auto-filtered by `targetType` compatibility (e.g., text-only presets hidden for non-text elements).
- **Recent/Favorites**: Track recently applied and user-starred presets at the top.

---

### 3.6 Header Bar

```
┌──────────────────────────────────────────────────┐
│ 🎬 Animation Manager     [⏮][▶/⏸][⏭][⏹] [⚙]   │
└──────────────────────────────────────────────────┘
```

- **Playback mini-controls**: Play/Pause, Stop, Skip back/forward 0.5s. These control the animation playback on the canvas using the existing `animationState` in the store.
- **Settings gear**: Opens a small popover with:
  - Auto-play on edit (toggle)
  - Show gizmos by default (toggle)
  - Default duration for new animations
  - Preview loop mode

---

### 3.7 Multi-Element Selection UX

When multiple elements are selected, the Animation Map (Zone 1) changes layout:

```
┌─────────────────────────────────────────┐
│ ▼ Animation Map (3 elements)       [+]  │
├─────────────────────────────────────────┤
│                                         │
│  ▼ 🔷 "star-path"  (2 animations)      │  ← Per-element collapsible section
│     ⚡ rotate 360°        1.5s  ∞       │
│     ⚡ fadeIn opacity      0.8s  1       │
│                                         │
│  ▸ 🔶 "circle-bg"  (1 animation)       │  ← Collapsed by default if many
│                                         │
│  ▸ 🔷 "text-label" (0 animations)      │  ← Shows even elements with no anims
│                                         │
│  ── Batch Actions ─────────────────── │
│  [Apply Preset to All] [Stagger +0.2s] │  ← Batch operations
│  [Chain Sequential]    [Clear All]      │
│                                         │
└─────────────────────────────────────────┘
```

**Batch operations** (unique to multi-selection):
- **Apply Preset to All**: Opens the Preset Catalog with multi-target mode — applies to every selected element.
- **Stagger**: Adds incremental delay to animations across elements (e.g., each element starts 0.2s after the previous). Adjustable via a slider popover.
- **Chain Sequential**: Creates an animation chain where each element's animations play in order after the previous element's finish.
- **Clear All**: Removes all animations from all selected elements.

---

## 4. Technical Architecture

### 4.1 Plugin Structure

```
src/plugins/animationManager/
├── index.tsx                    # Plugin definition
├── slice.ts                     # Zustand state slice
├── types.ts                     # Plugin-specific types
├── AnimationManagerPanel.tsx     # Main panel container (the 3 zones)
├── components/
│   ├── AnimationMap.tsx          # Zone 1: Discovery view
│   ├── AnimationRow.tsx          # Single animation row in the map
│   ├── MiniTimeline.tsx          # Compact timeline visualization
│   ├── AnimationEditor.tsx       # Zone 2: Property editor
│   ├── KeyframeTrack.tsx         # Visual keyframe editor
│   ├── EasingCurveEditor.tsx     # Interactive bezier curve editor
│   ├── SmartAttributePicker.tsx  # Categorized attribute dropdown
│   ├── PresetCatalog.tsx         # Zone 3: Unified preset browser
│   ├── PresetCard.tsx            # Preset preview card
│   ├── BatchActions.tsx          # Multi-selection batch operations
│   ├── SettingsPopover.tsx       # Settings gear popover
│   └── TargetIndicator.tsx       # Visual indicator showing animation-to-element mapping
├── hooks/
│   ├── useAnimationDiscovery.ts  # Discovers all animations for selection (direct + indirect)
│   ├── useAnimationDescription.ts# Generates human-readable animation descriptions
│   ├── usePresetCatalog.ts       # Unified preset search and filtering
│   ├── useKeyframeEditing.ts     # Keyframe drag/drop state management
│   └── useEasingCurve.ts         # Bezier curve interaction state
└── utils/
    ├── animationDiscovery.ts     # Core logic: resolve element → all affecting animations
    ├── descriptionGenerator.ts   # Human-readable description from SVGAnimation
    ├── presetUnifier.ts          # Merges Library + Editor presets into unified catalog
    ├── staggerCalculator.ts      # Computes stagger delays for multi-element
    └── attributeCategories.ts    # Categorized attribute definitions per element/def type
```

### 4.2 State Slice

```typescript
interface AnimationManagerState extends Record<string, unknown> {
  // Panel state
  isOpen: boolean;
  
  // Selection tracking
  selectedAnimationId: string | null;       // Currently selected animation in Zone 1
  expandedGroups: string[];                 // Which groups in Zone 1 are expanded
  
  // Editor state
  editorMode: 'idle' | 'editing' | 'creating';
  draftAnimation: Partial<SVGAnimation> | null;  // Unsaved new animation being configured
  
  // Catalog state
  catalogSearchQuery: string;
  catalogActiveTags: string[];
  catalogFavorites: string[];               // Preset IDs starred by user
  catalogRecents: string[];                 // Recently applied preset IDs
  
  // Settings
  autoPlayOnEdit: boolean;
  showGizmosByDefault: boolean;
  defaultDuration: number;                  // seconds
  
  // Visual
  miniTimelineZoom: number;                 // Zoom level for mini timeline
  disabledAnimationIds: string[];           // Temporarily hidden animations
}
```

**Persistence**: `catalogFavorites`, `catalogRecents`, `defaultDuration`, `autoPlayOnEdit`, `showGizmosByDefault` → persisted to localStorage. `selectedAnimationId`, `editorMode`, `draftAnimation` → temporal (undo/redo only).

### 4.3 Animation Discovery Hook

The core innovation — `useAnimationDiscovery(selectedIds: string[])`:

```typescript
interface DiscoveredAnimationGroup {
  groupType: 'direct' | 'gradient' | 'pattern' | 'filter' | 'mask' | 'marker' | 'clipPath' | 'symbol';
  groupLabel: string;         // e.g., "Direct", "Gradient: sunset-grad"
  defId?: string;             // ID of the referenced def (if indirect)
  animations: SVGAnimation[];
}

interface DiscoveredElementAnimations {
  elementId: string;
  elementName: string;        // Display name from element
  elementThumb?: string;      // Mini SVG path for thumbnail
  groups: DiscoveredAnimationGroup[];
  totalCount: number;
}

function useAnimationDiscovery(selectedIds: string[]): DiscoveredElementAnimations[]
```

**Discovery algorithm:**
1. For each selected element, get all animations where `targetElementId === elementId` → "Direct" group.
2. Extract all def references from the element (using existing `extractDefReferences()` from `defReferences.ts`).
3. For each referenced def, find animations where any def target ID matches:
   - `gradientTargetId`, `patternTargetId`, `filterTargetId`, `maskTargetId`, `markerTargetId`, `clipPathTargetId`, `symbolTargetId`
   - Including sub-targets (stop indices, child indices, primitive indices)
4. Group results by relationship type and def ID.
5. Memoize with `useMemo` keyed on `selectedIds` + `animations` array reference.

### 4.4 Dependencies on Existing Systems

The plugin **does not duplicate** animation CRUD logic. It delegates to the existing `animationSystem` plugin:

| Operation | Delegation Target |
|---|---|
| Add animation | `store.addAnimation(animation)` |
| Update animation | `store.updateAnimation(id, updates)` |
| Remove animation | `store.removeAnimation(id)` |
| Playback control | `store.setAnimationPlaying(bool)`, `store.setAnimationCurrentTime(t)`, `store.resetAnimation()` |
| Apply preset | `store.applyPresetToSelection(preset)` (from animationLibrary slice) |
| Chain management | `store.createAnimationChain(config)` (from animationSystem slice) |
| Gizmo activation | `pluginManager.callPluginApi('animationSystem', 'activateGizmo', animId)` |

**Plugin dependencies declaration:**
```typescript
dependencies: ['animationSystem'],
optionalDependencies: ['animationLibrary'],
```

### 4.5 Integration Points

| What | How |
|---|---|
| **Panel rendering** | Register as `sidebarPanels` entry, visible when `animationManager.isOpen` |
| **Canvas interaction** | The panel is non-blocking — canvas remains interactive. Clicking an element on canvas updates selection → panel updates. |
| **Store communication** | Reads `animations[]` from `AnimationPluginSlice`, reads `selectedIds` from core store, reads `elements` for thumbnails and def extraction |
| **Gizmo bridge** | Clicking "Gizmo" on an animation row calls the animationSystem's gizmo activation API |
| **Export/Import** | No custom export/import needed — all data flows through the existing `animationSystem` store |
| **Undo/Redo** | All mutations go through existing store actions which are already covered by temporal middleware |

---

## 5. Innovation Highlights

### 5.1 vs. Current Animation Workspace

| Aspect | Current Workspace (Modal) | New Animation Manager |
|---|---|---|
| Canvas access | Blocked by modal overlay | Fully accessible — side panel |
| Selection sync | Static (captured when opened) | Live — updates with selection changes |
| Animation discovery | Manual (user must know what exists) | Automatic — scans direct + all indirect refs |
| Editing workflow | Tab-switching: Editor → Preview → Timeline | Single-panel: Map + Editor + live canvas preview |
| Keyframe editing | Text input for values/keyTimes/keySplines | Visual track with draggable keyframe diamonds |
| Easing control | Dropdown + text for keySplines | Interactive bezier curve editor with presets |
| Preset application | Fire-and-forget (Library) or manual config (Editor) | Apply & Customize — auto-enters editing mode |
| Multi-element | Must handle elements one at a time | Batch operations: stagger, chain, apply to all |
| Gizmos | Separate activation flow | One-click gizmo toggle per animation |

### 5.2 The "Animation Map" Concept

No existing SVG animation tool (Inkscape, SVGator, Figma) provides a view that automatically discovers and maps **all** animations affecting an element through transitive references. This is uniquely powerful for complex SVG documents where:
- A gradient stop color is animated (users often don't even know this exists)
- A filter primitive blur is animated
- A clipPath child rect is animated for a reveal effect
- A pattern transform is animated for a texture scroll

The Animation Map makes these "hidden" animations visible and editable.

### 5.3 Stagger & Chain Batch Operations

Multi-element animation choreography currently requires manually setting chain delays. The new batch operations provide one-click workflows:
- **Stagger**: "Make these 5 items fade in with 0.1s delay between each" → slider sets the stagger interval
- **Chain Sequential**: "Play element A animations, then element B, then element C" → auto-generates chain
- **Apply to All with offset**: Apply the same preset to all selected elements but with computed delay offsets

---

## 6. Implementation Plan

### Phase 1: Foundation (Core Plugin Shell)
**Estimated effort: ~1 day**

1. Create plugin directory structure (`src/plugins/animationManager/`)
2. Define `AnimationManagerState` slice with `createSimplePluginSlice`
3. Register persistence keys
4. Create plugin definition in `index.tsx` with:
   - `id: 'animationManager'`
   - Slice registration
   - Sidebar panel registration (condition: `isOpen`)
   - Keyboard shortcut `Shift+A` (global)
   - Tool definition for toolbar button
   - Dependencies on `animationSystem`
5. Register in `CORE_PLUGINS` array
6. Create basic `AnimationManagerPanel.tsx` shell with the 3-zone layout
7. Validate: plugin loads, panel opens/closes, shortcut works

### Phase 2: Animation Discovery (Zone 1 — Read-Only)
**Estimated effort: ~2 days**

1. Implement `animationDiscovery.ts` — core algorithm to resolve element → all affecting animations
2. Implement `useAnimationDiscovery` hook with memoization
3. Implement `descriptionGenerator.ts` — human-readable labels from `SVGAnimation`
4. Build `AnimationMap.tsx` component:
   - Grouped animation list (direct + indirect)
   - `AnimationRow.tsx` with type icon, description, duration, repeat count
   - Row selection → sets `selectedAnimationId`
   - Row hover actions (delete, duplicate, gizmo)
5. Build multi-element view with per-element collapsible sections
6. Validate: select elements, see all their animations grouped correctly

### Phase 3: Mini Timeline
**Estimated effort: ~1 day**

1. Build `MiniTimeline.tsx` — compact horizontal Gantt view
2. Render animation bars with colors based on type
3. Draggable playhead synced to `animationState.currentTime`
4. Click bar to select animation
5. Time scale with auto-ranging based on total duration
6. Validate: timeline shows all animations, playhead works

### Phase 4: Animation Editor (Zone 2)
**Estimated effort: ~3 days**

1. Build `AnimationEditor.tsx` — master editor component
2. Implement `SmartAttributePicker.tsx` — categorized attribute dropdown with context-aware filtering
3. Implement `KeyframeTrack.tsx`:
   - Parse `values`/`keyTimes` into diamond positions
   - Drag diamonds to reposition → recompute values/keyTimes strings
   - Click to add keyframe, right-click to delete
   - Visual display of individual keyframe values
4. Implement `EasingCurveEditor.tsx`:
   - SVG-based cubic bezier curve renderer
   - Two draggable control points
   - Parse/emit `keySplines` format
   - Common easing preset dropdown (ease-in, ease-out, ease-in-out, bounce, elastic, etc.)
5. Build the property form with progressive disclosure:
   - Core properties (type, attribute, target) — always visible
   - Values section (From/To toggle vs Keyframes toggle)
   - Timing section (duration, repeat, delay, fill)
   - Easing section (curve editor + calcMode + presets)
   - Advanced section (collapsible: begin, end, additive, accumulate, attrType, repeatDur)
6. Wire all fields to `store.updateAnimation()` for live editing
7. Implement creation flow: draft animation → finalize via `store.addAnimation()`
8. Validate: select animation, edit properties, see canvas update live

### Phase 5: Preset Catalog (Zone 3)
**Estimated effort: ~2 days**

1. Implement `presetUnifier.ts` — merge Library presets + Editor presets into a unified format
2. Implement `usePresetCatalog` hook — search, tag filter, favorites, recents
3. Build `PresetCatalog.tsx`:
   - Search input
   - Tag filter chips
   - Grid of `PresetCard.tsx` components
   - Lazy loading / virtualization for 200+ presets
4. Build `PresetCard.tsx`:
   - Animated SVG thumbnail (using `previewSvg` or auto-generated)
   - Name, duration, category badge
   - "Apply" button
5. Implement "Apply & Customize" flow:
   - Apply preset → auto-select first created animation → open Zone 2 in editing mode
6. Persist favorites and recents
7. Validate: search presets, apply to selection, edit immediately after

### Phase 6: Batch Operations & Multi-Element
**Estimated effort: ~1-2 days**

1. Build `BatchActions.tsx` component
2. Implement stagger calculator:
   - Input: selected elements, stagger interval (seconds)
   - Output: computed `begin` offsets per element
   - Apply: update chain delays or begin attributes
3. Implement sequential chain:
   - Auto-create animation chain using existing `createAnimationChain` from animationSystem
4. Implement "Apply Preset to All" with stagger options
5. Implement "Clear All" for multi-selection
6. Validate: 5 elements selected → stagger → see incremental delays

### Phase 7: Gizmo Integration & Polish
**Estimated effort: ~1 day**

1. Wire "Gizmo" button on animation rows → call `activateGizmo` on the animationSystem plugin
2. Bidirectional sync: gizmo drag updates → editor fields update and vice versa
3. Settings popover implementation
4. Keyboard shortcuts within the panel (Delete to remove animation, Enter to confirm, Escape to cancel creation)
5. Empty states and loading states
6. Accessibility: aria-labels, keyboard navigation for all interactive elements
7. Responsive behavior for narrow viewports

### Phase 8: Testing & QA
**Estimated effort: ~1 day**

1. Vitest unit tests for:
   - `animationDiscovery.ts` — correct grouping of direct/indirect
   - `descriptionGenerator.ts` — human-readable output
   - `presetUnifier.ts` — correct merging
   - `staggerCalculator.ts` — correct delay computation
2. E2E Playwright tests for:
   - Open/close animation manager
   - See animations for selected element
   - Apply preset and verify animation created
   - Edit animation property and verify canvas updates
3. Lint and type-check compliance

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Side panel width conflicts with existing sidebar | Medium | Use an overlay/floating panel approach with adjustable width, or register as a special high-priority sidebar panel |
| Performance with 200+ elements each with animations | Medium | Virtualize the Animation Map list; memoize discovery results aggressively |
| Bezier curve editor complexity | Low | Use an existing React bezier editor library or keep it simple with preset-only initially |
| Gizmo bidirectional sync could cause update loops | Medium | Gate updates with a `isGizmoDragging` flag; debounce editor → gizmo direction |
| Discovery hook recalculates on every store change | High | Use `useShallow` selectors; key memoization on `animations.length` + `selectedIds` hash |

---

## 8. Open Questions

1. **Panel placement**: Should this be a dedicated sidebar panel (replacing or alongside the existing right sidebar) or a floating/docked panel? The existing sidebar infrastructure uses a fixed-width layout. A floating panel gives more flexibility but is a new pattern.

2. **Coexistence with existing UIs**: Should the Animation Workspace Dialog and Animation Library Panel continue to exist alongside this new manager, or should this replace them?

3. **Mobile support**: Should the animation manager be available on mobile/touch devices? The current animation workspace modal is likely unusable on mobile anyway.

4. **Preset auto-generation**: Should the system auto-generate animated SVG thumbnails for Editor presets (which currently don't have `previewSvg`)? This adds visual richness but costs development time.
