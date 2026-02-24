### Animation / Gizmo Review Summary

| Feature           | Status       | Issue / Notes                                                                                                          |
| ----------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Z-Order Gizmo     | Remove       | Should be removed.                                                                                                     |
| Morphing Gizmo    | Issue        | Does not allow path editing. Each frame shows the same path.                                                           |
| Translate         | OK           | Works correctly.                                                                                                       |
| Transform Origin  | Issue        | Example SVG is incorrect and does not animate. Gizmo incorrectly appends text into the `value` attribute.              |
| Timeline Marker   | OK           | Works correctly.                                                                                                       |
| Text Reveal       | Issue        | Example SVG is incorrect and does not animate.                                                                         |
| Text Path         | Not Testable | Cannot select the text path element.                                                                                   |
| Stroke Width      | OK           | Works correctly.                                                                                                       |
| Stroke Draw       | OK           | Works correctly.                                                                                                       |
| Spring Physics    | Issue        | Example SVG is incorrect and does not animate.                                                                         |
| Spiral            | OK           | Works correctly.                                                                                                       |
| SKEY              | Issue        | Handlers (circles) visually overlap and obscure the numeric value (square with number).                                |
| Sequence          | OK           | Works correctly.                                                                                                       |
| Scroll Trigger    | Issue        | Opacity gizmo only allows modifying `From`, not `To`. Only first frame is displayed; frame list is not visible.        |
| Scene Transition  | OK           | Works correctly.                                                                                                       |
| Scale             | OK           | Works correctly.                                                                                                       |
| Rotate            | OK           | Works correctly.                                                                                                       |
| Radial Gradient   | Not Testable | Gradient cannot be selected.                                                                                           |
| Pattern Transform | Not Testable | Pattern cannot be selected.                                                                                            |
| Particle Emit     | Issue        | Opacity gizmo only allows modifying `From`, not `To`.                                                                  |
| Parent Inherit    | Issue        | No visible animation. Unclear expected behavior.                                                                       |
| Parallax          | OK           | Works correctly.                                                                                                       |
| Orbit             | Issue        | Motion path cannot be edited.                                                                                          |
| Noise             | Issue        | Gizmo does not appear when selecting the green rectangle.                                                              |
| Motion Path       | OK           | Works correctly.                                                                                                       |
| Morphing          | OK           | Works correctly.                                                                                                       |
| Mask Wipe         | Not Testable | Mask cannot be selected.                                                                                               |
| Mask Reveal       | Not Testable | Mask cannot be selected.                                                                                               |
| Loop Control      | OK           | Works correctly.                                                                                                       |
| Linear Gradient   | Not Testable | Gradient cannot be selected.                                                                                           |
| Letter Spacing    | Issue        | Only `To` value can be modified, not `From`.                                                                           |
| Jiggle            | OK           | Works correctly.                                                                                                       |
| Hover             | OK           | Works correctly.                                                                                                       |
| Group Transform   | OK           | Works correctly.                                                                                                       |
| Gradient Stops    | Not Testable | Gradient cannot be selected.                                                                                           |
| Font Variation    | Issue        | Incorrectly appends text to value: `"wght" 200, "wdth" 119.32`.                                                        |
| Focus State       | Issue        | Only allows modifying `From`, not `To`.                                                                                |
| Elastic           | Issue        | SVG example is incorrect; spline values are invalid.                                                                   |
| Drop Shadow       | Issue        | No gizmo displayed for animation parameters.                                                                           |
| Color             | Issue        | Color cannot be changed via gizmo.                                                                                     |
| Color Matrix      | Not Testable | Filter cannot be selected.                                                                                             |
| Clip Path         | Not Testable | Clip path cannot be selected.                                                                                          |
| Click Trigger     | Issue        | Circle animation gizmo (`r` parameter) tooltips incorrectly display: “Gradient Center” and “Gradient Radius”.          |
| Cascade Delay     | OK           | Works correctly.                                                                                                       |
| Camera Zoom       | Issue        | Animation is incorrect. Circle shifts from center when scaling. Requires compensating translate to maintain centering. |
| Camera Pan        | OK           | Works correctly.                                                                                                       |
| Bounce Gizmo      | OK           | Works correctly.                                                                                                       |
| Blur              | Not Testable | Filter cannot be selected.                                                                                             |
| Anchor Point      | Issue        | No visible animation. Gizmo only allows modifying `To`, not `From`. Expected behavior unclear.                         |

