# Animation Gizmos — Complete Reference

VectorNest provides **50 on-canvas gizmos** for visually manipulating SVG animations. Each gizmo is a visual overlay with draggable handles that appears when an animation matching its type is selected.

> **Keyframe terminology**: A *segment* is the interpolation between two consecutive keyframes. An animation with 2 keyframes has 1 segment; with 3 keyframes, 2 segments; etc.

---

## Table of Contents

1. [Transform Gizmos](#1-transform-gizmos-4)
2. [Vector Gizmos](#2-vector-gizmos-3)
3. [Style Gizmos](#3-style-gizmos-3)
4. [Clip & Mask Gizmos](#4-clip--mask-gizmos-3)
5. [Gradient & Pattern Gizmos](#5-gradient--pattern-gizmos-4)
6. [Filter Gizmos](#6-filter-gizmos-3)
7. [Hierarchy Gizmos](#7-hierarchy-gizmos-6)
8. [Interactive Gizmos](#8-interactive-gizmos-4)
9. [Typography Gizmos](#9-typography-gizmos-4)
10. [FX Gizmos](#10-fx-gizmos-10)
11. [Scene Gizmos](#11-scene-gizmos-6)
12. [Multi-Keyframe Behavior](#multi-keyframe-behavior)
13. [Test SVG Files](#test-svg-files)

---

## 1. Transform Gizmos (4)

### 1.1 `translate`

| Property | Details |
|---|---|
| **Shows when** | `animateTransform` with `type="translate"` |
| **Test file** | [test-translate.svg](test-translate.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `origin` | `move` | Drag to set the starting position (`from`) |
| `destination` | `move` | Drag to set the ending position (`to`) |
| `keyframe` | `move` | Drag to move the active keyframe (only visible with ≥3 keyframes) |

**Visual:** Dashed line with arrow from origin to destination. Ghost rectangle at destination. When ≥3 keyframes, numbered intermediate markers along the path.

**Multi-keyframe:** Uses `values="x1 y1; x2 y2; x3 y3"` format. The `origin` and `destination` handles edit the first and last keyframes respectively. For intermediate keyframes (3+), the `keyframe` handle appears and edits the active keyframe selected in the toolbar.

**2-keyframe edge case:** With exactly 2 keyframes via `values`, the `origin` and `destination` handles are shown (the `keyframe` handle is hidden). The keyframe selector in the toolbar is available to switch between keyframes. Dragging `origin` updates keyframe 1; dragging `destination` updates keyframe 2.

---

### 1.2 `rotate`

| Property | Details |
|---|---|
| **Shows when** | `animateTransform` with `type="rotate"` |
| **Test file** | [test-rotate.svg](test-rotate.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `pivot` | `move` | Drag to reposition the center of rotation |
| `arc` | circular | Drag along the arc to set rotation angle. Hold **Shift** for 15° snap |

**Visual:** Crosshair at pivot point, arc path showing the rotation sweep from `fromDegrees` to `toDegrees`.

**Multi-keyframe:** Uses `values="angle cx cy; angle2 cx cy; ..."`. The `arc` handle edits the active keyframe. The visual switches from an arc to a full circle when in multi-keyframe mode.

**2-keyframe edge case:** With 2 keyframes via `values`, the `arc` handle edits the active keyframe (selected in toolbar). The `fromAnimation` parser sets `activeKeyframeIndex` to the last keyframe. Both the visual display and the arc handle correctly reflect the selected keyframe's angle.

---

### 1.3 `scale`

| Property | Details |
|---|---|
| **Shows when** | `animateTransform` with `type="scale"` |
| **Test file** | [test-scale.svg](test-scale.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `corner-se` | `nwse-resize` | Drag to set scale factor. Hold **Shift** for uniform (proportional) scaling |

**Visual:** Ghost bounding box showing target size with corner handles at all four corners. Scale label shows current factor (e.g., `1.50x1.50`).

**Multi-keyframe:** Uses `values="sx sy; sx2 sy2; ..."`. The corner handle edits the active keyframe's scale. The label shows `kf N/total → sxXsy`.

**2-keyframe edge case:** With 2 keyframes via `values`, the corner handle edits the active keyframe. The ghost box and label reflect the selected keyframe's scale values. The keyframe selector in the toolbar allows switching between the two.

---

### 1.4 `skew`

| Property | Details |
|---|---|
| **Shows when** | `animateTransform` with `type="skewX"` or `type="skewY"` |
| **Test file** | [test-skew.svg](test-skew.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `skew-horizontal` | `ew-resize` | Drag left/right to set X-axis skew angle |
| `skew-vertical` | `ns-resize` | Drag up/down to set Y-axis skew angle |

**Visual:** Parallelogram showing skewed element bounds. Each handle shows the current angle (e.g., `30°X`, `15°Y`). Keyframe label above the active axis handle.

**Multi-keyframe:** Uses `values="angle; angle2; ..."`. Tracks `activeAxis` (`x` or `y`) to determine which handle is actively editing. The `skew-horizontal` handle appears for `skewX`, `skew-vertical` for `skewY`.

**2-keyframe edge case:** With 2 keyframes, both handles edit the active keyframe correctly. The visual parallelogram and angle labels reflect the selected keyframe's skew value.

---

## 2. Vector Gizmos (3)

### 2.1 `motion-path`

| Property | Details |
|---|---|
| **Shows when** | `animateMotion` element |
| **Test file** | [test-motion-path.svg](test-motion-path.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `path-start` | path | Drag to move the start of the motion path |
| `path-end` | path | Drag to move the end of the motion path |
| `anchor-N` | path | Drag to move anchor points along the path |
| `control-1-N` / `control-2-N` | tangent | Drag to adjust cubic bezier control points |

**Visual:** Dashed path overlay following the motion trajectory. Control point lines for cubic bezier segments. Direction arrow at the end.

**Multi-keyframe:** Not applicable — motion path uses a path string, not `values`-based keyframes.

**2-keyframe edge case:** N/A.

---

### 2.2 `morphing`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="d"` |
| **Test file** | [test-morphing.svg](test-morphing.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `morph-start` / `morph-end` | path | Drag to move shape anchor points |
| `morph-anchor-N` | path | Drag anchor points of the active keyframe |
| `morph-control-1-N` / `morph-control-2-N` | tangent | Drag control points for curves |

**Visual:** Active keyframe path rendered with tangent lines and point markers.

**Multi-keyframe:** Uses `values="pathA; pathB; pathC"`. Each value is a complete SVG path. The active keyframe path is shown with editable handles. The toolbar's keyframe selector switches between shape frames.

**2-keyframe edge case:** With 2 keyframes (two shapes), the `activeKeyframeIndex` is set to `0` by default. The toolbar keyframe selector allows switching between the two shape states. Editing handles modify the active keyframe's path.

---

### 2.3 `stroke-draw`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="stroke-dashoffset"` or `"stroke-dasharray"` |
| **Test file** | [test-stroke-draw.svg](test-stroke-draw.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `draw-start` | `ew-resize` | Drag to set where the drawing begins (0–1) |
| `draw-end` | `ew-resize` | Drag to set where the drawing ends (0–1) |

**Visual:** Progress track bar with a filled segment between start and end. Intermediate keyframe tick marks for 3+ keyframes.

**Multi-keyframe:** Uses `values` for multiple dashoffset stops.

**2-keyframe edge case:** Standard from/to behavior with start and end handles.

---

## 3. Style Gizmos (3)

### 3.1 `stroke-width`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="stroke-width"` |
| **Test file** | [test-stroke-width.svg](test-stroke-width.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `stroke-width-value` | `ns-resize` | Drag up/down to adjust stroke width for the active keyframe |

**Visual:** Vertical indicator line at the active keyframe position along the element bounds. Connecting dashed line to the element. The handle position is interpolated based on `activeKeyframeIndex / (numKeyframes - 1)`.

**Multi-keyframe:** Uses `values="w1; w2; w3"`. The handle edits the width of the active keyframe. For 2-keyframe animations without `values`, if `activeKeyframeIndex === 0`, edits `fromWidth`; otherwise edits `toWidth`.

**2-keyframe edge case:** The toolbar keyframe selector shows 2 keyframes. Index 0 corresponds to the `from` value, index 1 to the `to` value. The handle position slides between the left and right edges of the element bounds.

---

### 3.2 `color`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="fill"` or `"stroke"` |
| **Test file** | [test-color.svg](test-color.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `color-value` | `pointer` | Visual indicator only — drag is a no-op. Color is edited via the panel |

**Visual:** Gradient track bar below the element showing color interpolation from start to end. Active keyframe's color swatch is highlighted with a marker. Uses actual color values from keyframes for gradient stops.

**Multi-keyframe:** Uses `values="color1; color2; color3"`. Gradient track shows all colors. Active marker position indicates the selected keyframe.

**2-keyframe edge case:** Gradient shows from-color to to-color. Active keyframe index selects which swatch is highlighted. Color editing happens through the sidebar panel, not by dragging.

---

### 3.3 `opacity`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="opacity"`, `"fill-opacity"`, or `"stroke-opacity"` |
| **Test file** | [test-opacity.svg](test-opacity.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `opacity-value` | `ns-resize` | Drag up/down to adjust opacity (clamped 0–1) |

**Visual:** Track bar with active keyframe marker and percentage label (e.g., `75%`).

**Multi-keyframe:** Uses `values="o1; o2; o3"`. Handle edits the active keyframe's opacity.

**2-keyframe edge case:** Index 0 = `from` value, index 1 = `to` value. Toolbar selector switches between them.

---

## 4. Clip & Mask Gizmos (3)

### 4.1 `clip-path`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="clip-path"` |
| **Test file** | [test-clip-path.svg](test-clip-path.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `clip-inset-top` | `ns-resize` | Drag to set top inset |
| `clip-inset-right` | `ew-resize` | Drag to set right inset |
| `clip-inset-bottom` | `ns-resize` | Drag to set bottom inset |
| `clip-inset-left` | `ew-resize` | Drag to set left inset |

**Visual:** Dashed rectangle showing the clip inset region.

**Multi-keyframe / 2-keyframe:** Supports `values` attribute.

---

### 4.2 `mask-reveal`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="mask"` or `"mask-opacity"` |
| **Test file** | [test-mask-reveal.svg](test-mask-reveal.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `mask-opacity` | `ew-resize` | Drag to control mask opacity (0–1) |

**Visual:** Opacity progress bar.

---

### 4.3 `mask-wipe`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="mask-position"` |
| **Test file** | [test-mask-wipe.svg](test-mask-wipe.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `wipe-position` | `move` | Drag to set wipe position/direction |

**Visual:** Vertical line with arrow at wipe position.

---

## 5. Gradient & Pattern Gizmos (4)

### 5.1 `linear-gradient`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName` being `"x1"`, `"x2"`, `"y1"`, or `"y2"` |
| **Test file** | [test-linear-gradient.svg](test-linear-gradient.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `gradient-start` | `move` | Drag to move the gradient start point |
| `gradient-end` | `move` | Drag to move the gradient end point |

**Visual:** Gradient direction line from start to end.

---

### 5.2 `radial-gradient`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName` being `"cx"`, `"cy"`, `"r"`, or `"fr"` |
| **Test file** | [test-radial-gradient.svg](test-radial-gradient.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `center` | `move` | Drag to move the gradient center |
| `radius` | `ew-resize` | Drag to change the gradient radius |

**Visual:** Dashed circle with center dot.

---

### 5.3 `pattern-transform`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="patternTransform"` |
| **Test file** | [test-pattern-transform.svg](test-pattern-transform.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `pattern-scale` | `nwse-resize` | Drag to scale the pattern |
| `pattern-rotation` | crosshair | Drag to rotate the pattern |

**Visual:** Grid lines showing pattern tiling at current scale.

---

### 5.4 `gradient-stops`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="offset"` |
| **Test file** | [test-gradient-stops.svg](test-gradient-stops.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `stop-0` | `ew-resize` | Drag to position first gradient stop (0–1) |
| `stop-1` | `ew-resize` | Drag to position second gradient stop (0–1) |

**Visual:** Track bar with two draggable stop markers.

---

## 6. Filter Gizmos (3)

### 6.1 `blur`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="stdDeviation"` |
| **Test file** | [test-blur.svg](test-blur.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `blur-radius` | `ew-resize` | Drag to adjust blur radius |

**Visual:** Expanded dashed rectangle showing the blur extent with a radius label.

---

### 6.2 `drop-shadow`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName` being `"dx"`, `"dy"`, or `"flood-opacity"` |
| **Test file** | [test-drop-shadow.svg](test-drop-shadow.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `shadow-offset` | `move` | Drag to position the shadow offset |
| `shadow-blur` | `nesw-resize` | Drag to adjust shadow blur |

**Visual:** Shadow rectangle with offset line from element center.

---

### 6.3 `color-matrix`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="values"` on an `feColorMatrix` filter primitive |
| **Test file** | [test-color-matrix.svg](test-color-matrix.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `hue-rotation` | crosshair | Drag to rotate hue |
| `saturation` | `ns-resize` | Drag to adjust saturation |
| `brightness` | `ns-resize` | Drag to adjust brightness |

**Visual:** Hue wheel, saturation and brightness vertical tracks.

**Special:** Matches only when the target element contains `feColorMatrix` in its ID.

---

## 7. Hierarchy Gizmos (6)

### 7.1 `transform-origin`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="transform-origin"` |
| **Test file** | [test-transform-origin.svg](test-transform-origin.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `origin` | `move` | Drag to reposition the transform origin |

**Visual:** Crosshair with circle marker.

---

### 7.2 `z-order`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="z-index"` |
| **Test file** | [test-z-order.svg](test-z-order.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `z-index` | `ns-resize` | Drag up/down to change z-order |

**Visual:** Stacked layer rectangles with z-value label.

---

### 7.3 `parent-inherit`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="inherit-transform"` |
| **Test file** | [test-parent-inherit.svg](test-parent-inherit.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `inherit-scale` | `ns-resize` | Drag to set inherit factor (0–1) |

**Visual:** Parent connection arc.

---

### 7.4 `cascade-delay`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="cascade-delay"` |
| **Test file** | [test-cascade-delay.svg](test-cascade-delay.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `delay-offset` | `ew-resize` | Drag to set cascade delay offset |

**Visual:** Cascading offset bars.

---

### 7.5 `group-transform`

| Property | Details |
|---|---|
| **Shows when** | `animateTransform` where `targetElementId` starts with `group-` |
| **Test file** | [test-group-transform.svg](test-group-transform.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `group-rotate` | crosshair | Drag to rotate the group |
| `group-scale` | `nwse-resize` | Drag to scale the group |

**Visual:** Dashed group bounding box.

---

### 7.6 `anchor-point`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="anchor-point"` |
| **Test file** | [test-anchor-point.svg](test-anchor-point.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `anchor` | `move` | Drag to reposition the anchor point |

**Visual:** Circle with inner dot and crosshair below.

---

## 8. Interactive Gizmos (4)

> These gizmos match on the `begin` attribute rather than `attributeName`.

### 8.1 `hover-state`

| Property | Details |
|---|---|
| **Shows when** | `begin="mouseover"` or `begin="mouseenter"` |
| **Test file** | [test-hover-state.svg](test-hover-state.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `hover-scale` | `nwse-resize` | Drag to set the hover scale factor |

**Visual:** Dashed scaled bounding box.

---

### 8.2 `click-trigger`

| Property | Details |
|---|---|
| **Shows when** | `begin="click"` |
| **Test file** | [test-click-trigger.svg](test-click-trigger.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `click-response` | `ew-resize` | Drag to set click response duration |

**Visual:** Concentric circles with "click" label.

---

### 8.3 `scroll-trigger`

| Property | Details |
|---|---|
| **Shows when** | `begin` attribute contains `"scroll"` |
| **Test file** | [test-scroll-trigger.svg](test-scroll-trigger.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `scroll-start` | `ns-resize` | Drag to set scroll trigger start position |
| `scroll-end` | `ns-resize` | Drag to set scroll trigger end position |

**Visual:** Vertical scroll track.

---

### 8.4 `focus-state`

| Property | Details |
|---|---|
| **Shows when** | `begin="focus"` or `begin="focusin"` |
| **Test file** | [test-focus-state.svg](test-focus-state.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `focus-ring` | `ew-resize` | Drag to set focus ring size |

**Visual:** Double-border focus ring.

---

## 9. Typography Gizmos (4)

### 9.1 `text-path`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="startOffset"` |
| **Test file** | [test-text-path.svg](test-text-path.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `text-offset` | `ew-resize` | Drag to set text offset along path (0–1) |

**Visual:** Curved path with offset dot.

---

### 9.2 `letter-spacing`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="letter-spacing"` |
| **Test file** | [test-letter-spacing.svg](test-letter-spacing.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `spacing` | `ew-resize` | Drag to adjust letter spacing |

**Visual:** Letters A/B/C spreading apart.

---

### 9.3 `text-reveal`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="text-reveal"` |
| **Test file** | [test-text-reveal.svg](test-text-reveal.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `reveal-progress` | `ew-resize` | Drag to set reveal progress |
| `char-delay` | `ew-resize` | Drag to set per-character delay |

**Visual:** Character reveal bars (per-character progress indicators).

---

### 9.4 `font-variation`

| Property | Details |
|---|---|
| **Shows when** | `animate` with `attributeName="font-weight"` or `"font-variation-settings"` |
| **Test file** | [test-font-variation.svg](test-font-variation.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `font-weight` | `ns-resize` | Drag to set font weight (100–900, snaps to 100s) |
| `font-width` | `ns-resize` | Drag to set font width (50–200) |

**Visual:** Two vertical track bars side-by-side: Weight (W) in blue, Width (w) in purple.

**Multi-keyframe:** Uses `values` with `"wght" N, "wdth" M` format.

---

## 10. FX Gizmos (10)

### 10.1 `spring-physics`

| Property | Details |
|---|---|
| **Shows when** | Any animation with `easing` starting with `"spring"` |
| **Test file** | [test-spring-physics.svg](test-spring-physics.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `stiffness` | `ns-resize` | Drag to adjust spring stiffness |
| `damping` | `ns-resize` | Drag to adjust spring damping |

**Visual:** Spring coil with two vertical sliders.

**Special:** Matches on easing, not animation type — applies to any animation.

---

### 10.2 `particle-emit`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="particle-emit"` |
| **Test file** | [test-particle-emit.svg](test-particle-emit.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `emit-origin` | `move` | Drag to move the emission origin |
| `spread-angle` | `grab` | Drag to adjust the emission spread angle |

**Visual:** Emission cone with particle dots.

---

### 10.3 `wave-distortion`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="wave-distortion"` |
| **Test file** | [test-wave-distortion.svg](test-wave-distortion.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `amplitude` | `ns-resize` | Drag to set wave amplitude |
| `frequency` | `ew-resize` | Drag to set wave frequency |

**Visual:** Sine wave path with dashed baseline.

---

### 10.4 `noise`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="noise"` |
| **Test file** | [test-noise.svg](test-noise.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `noise-scale` | `ns-resize` | Drag to set noise scale (0.1–5) |
| `noise-intensity` | `ew-resize` | Drag to set noise intensity (1–50) |

**Visual:** Random dots with varying opacity in a dashed bounding rectangle.

---

### 10.5 `parallax`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="parallax"` |
| **Test file** | [test-parallax.svg](test-parallax.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `depth` | `ns-resize` | Drag to set parallax depth (0–1) |

**Visual:** Layered rectangles at different depths with percentage label.

---

### 10.6 `elastic`

| Property | Details |
|---|---|
| **Shows when** | Any animation with `easing` starting with `"elastic"` |
| **Test file** | [test-elastic.svg](test-elastic.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `elasticity` | `ew-resize` | Drag to set elasticity factor (0.1–1) |

**Visual:** Elastic curve with decaying oscillation and dashed baseline.

**Special:** Matches on easing — applies to any animation type.

---

### 10.7 `bounce`

| Property | Details |
|---|---|
| **Shows when** | Any animation with `easing` starting with `"bounce"` |
| **Test file** | [test-bounce.svg](test-bounce.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `bounciness` | `ns-resize` | Drag to set bounce factor (0.1–1) |

**Visual:** Bounce trajectory with decreasing arcs, circle at start, ground line.

**Special:** Matches on easing — applies to any animation type.

---

### 10.8 `jiggle`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="jiggle"` |
| **Test file** | [test-jiggle.svg](test-jiggle.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `jiggle-amount` | `ew-resize` | Drag to set jiggle amount (1–20) |

**Visual:** Multiple offset rectangles (ghost copies) with center filled rectangle.

---

### 10.9 `orbit`

| Property | Details |
|---|---|
| **Shows when** | `animateMotion` with arc commands (`A`) in the path |
| **Test file** | [test-orbit.svg](test-orbit.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `orbit-radius` | `ew-resize` | Drag to change orbit radius |
| `orbit-center` | `move` | Drag to move orbit center |

**Visual:** Dashed circular orbit path, center dot, filled handle at radius.

**Special:** Distinguished from generic motion-path by detecting arc commands.

---

### 10.10 `spiral`

| Property | Details |
|---|---|
| **Shows when** | `animateMotion` with `attributeName="spiral"` |
| **Test file** | [test-spiral.svg](test-spiral.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `spiral-turns` | `ew-resize` | Drag to set number of turns (1–10) |
| `spiral-expansion` | `ew-resize` | Drag to set spiral expansion (2–30) |

**Visual:** Spiral path computed trigonometrically, center dot.

---

## 11. Scene Gizmos (6)

### 11.1 `camera-pan`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="camera-pan"` |
| **Test file** | [test-camera-pan.svg](test-camera-pan.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `pan-start` | `move` | Drag to set pan start position |
| `pan-end` | `move` | Drag to set pan end position |

**Visual:** Dashed line with camera frame markers at start and end.

---

### 11.2 `camera-zoom`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="camera-zoom"` |
| **Test file** | [test-camera-zoom.svg](test-camera-zoom.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `zoom-level` | `nwse-resize` | Drag to set zoom level |
| `zoom-center` | `move` | Drag to set zoom center |

**Visual:** Zoom frame with crosshair and zoom level text.

---

### 11.3 `scene-transition`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="scene-transition"` |
| **Test file** | [test-scene-transition.svg](test-scene-transition.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `transition-progress` | `ew-resize` | Drag to set transition progress |

**Visual:** Two overlapping scene rectangles with progress bar.

---

### 11.4 `timeline-marker`

| Property | Details |
|---|---|
| **Shows when** | Custom animation with `attributeName="timeline-marker"` |
| **Test file** | [test-timeline-marker.svg](test-timeline-marker.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `marker-position` | `ew-resize` | Drag to set marker position (0–1) |

**Visual:** Timeline bar with flag marker, dashed vertical line, percentage label.

---

### 11.5 `loop-control`

| Property | Details |
|---|---|
| **Shows when** | Any animation with `repeatCount` defined |
| **Test file** | [test-loop-control.svg](test-loop-control.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `loop-start` | `ew-resize` | Drag to set loop region start (constrained < end − 0.1) |
| `loop-end` | `ew-resize` | Drag to set loop region end (constrained > start + 0.1) |

**Visual:** Full track bar, colored loop region, loop arrows (bezier curve with arrowhead), start/end circle handles.

**Special:** Cross-cutting — matches any animation that has `repeatCount`.

---

### 11.6 `sequence`

| Property | Details |
|---|---|
| **Shows when** | `type="set"` or `begin` attribute contains `"end"` |
| **Test file** | [test-sequence.svg](test-sequence.svg) |

**Handles:**

| Handle | Cursor | Action |
|---|---|---|
| `sequence-delay` | `ew-resize` | Drag to set delay before sequence step |
| `sequence-order` | `ns-resize` | Drag to set sequence order (1–10) |

**Visual:** Delay dashed line with "+Ns" label, numbered sequence blocks (3 shown, active highlighted), chain connector arrow.

**Special:** Enables chaining animations with `begin="<id>.end+<delay>s"`.

---

## Multi-Keyframe Behavior

### How it works

SVG animations support a `values` attribute that defines multiple keyframes separated by semicolons:

```xml
<!-- 2 keyframes (1 segment) — equivalent to from/to -->
<animateTransform type="translate" values="0 0; 100 50" dur="2s" />

<!-- 3 keyframes (2 segments) -->
<animateTransform type="translate" values="0 0; 50 -30; 100 50" dur="2s" />
```

When a gizmo detects `values`, it parses the keyframes into an array and tracks which keyframe is being edited via `activeKeyframeIndex`.

### Keyframe selector

The **GizmoToolbar** (top-left of canvas when a gizmo is active) shows a keyframe selector when the animation has **2 or more keyframes**. Clicking a keyframe number switches the active keyframe, and the gizmo handles + visual update to reflect that keyframe's values.

### The 2-keyframe edge case

An animation with `values="a; b"` has exactly 2 keyframes (equivalent to `from="a" to="b"`). Previous behavior hid the keyframe selector for this case, treating it as a simple from/to animation. This caused issues:

1. **No selector visible** → user couldn't choose which keyframe to edit
2. **Handles showed wrong values** → displayed `from`/`to` props instead of reading from the keyframes array
3. **Drags reverted** → `onDrag` updated scalar state but `onDragEnd` read from the stale keyframes array

**Current behavior:** The keyframe selector shows for 2+ keyframes. All gizmo handles correctly read from and write to the keyframes array. The `fromAnimation` parser sets `activeKeyframeIndex` to the last keyframe by default.

### Which gizmos support multi-keyframe

| Category | Gizmos with `values` support |
|---|---|
| **Transform** | translate, rotate, scale, skew |
| **Vector** | morphing, stroke-draw |
| **Style** | stroke-width, color, opacity |
| **Typography** | font-variation |

Other gizmos may use `values` but don't have the same keyframe editing pattern (e.g., motion-path uses a path attribute, interactive/scene gizmos use custom data).

---

## Test SVG Files

Each gizmo has a corresponding test SVG file in this directory. To test a gizmo:

1. Import the SVG file into VectorNest (File → Import SVG)
2. Select the animated element
3. Open the animation panel
4. Select the animation — the gizmo should appear on canvas
5. Interact with the handles as documented above

Files use standard SVG animation elements and are viewable in any browser.
