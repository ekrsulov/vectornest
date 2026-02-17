import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPreset, AnimationLibrarySlice } from './types';
import type { GroupElement, PathData } from '../../types';
import type { SVGAnimation } from '../animationSystem/types';
import type { ClippingPluginSlice, ClipDefinition } from '../clipping/slice';
import { getElementBounds, getGroupBounds, type ElementMap } from '../../canvas/geometry/CanvasGeometryService';
import paper from 'paper';
import { DEFAULT_PRESETS } from './presets';
import { makePresetId, isTextElement } from './helpers';
import { ensurePaperSetup } from '../../utils/pathOperations/paperSetup';

/**
 * Animation Library Slice
 * 
 * This file contains the state management and business logic for applying animation presets.
 * 
 * Refactored structure:
 * - presets.ts: All 24 animation preset definitions (~960 lines)
 * - helpers.ts: Utility functions (makePresetId, isTextElement)
 * - slice.ts (this file): State management and complex application logic (~400 lines)
 */
export const createAnimationLibrarySlice: StateCreator<CanvasStore, [], [], AnimationLibrarySlice> = (
  set,
  get
) => {
  // Preserve persisted state if it exists, otherwise use defaults
  const currentState = get();
  const persistedPresets = (currentState as unknown as AnimationLibrarySlice).animationPresets;

  return {
    animationPresets:
      Array.isArray(persistedPresets) && persistedPresets.length > 0
        ? persistedPresets
        : DEFAULT_PRESETS,

    addAnimationPreset: (preset) => {
      set((state) => {
        const newPreset: AnimationPreset = {
          id: makePresetId(),
          ...preset,
        };
        return {
          animationPresets: [...state.animationPresets, newPreset],
        };
      });
    },

    updateAnimationPreset: (id, updates) => {
      set((state) => ({
        animationPresets: state.animationPresets.map((preset: AnimationPreset) =>
          preset.id === id ? { ...preset, ...updates } : preset
        ),
      }));
    },

    removeAnimationPreset: (id) => {
      set((state) => ({
        animationPresets: state.animationPresets.filter((preset: AnimationPreset) => preset.id !== id),
      }));
    },

    applyPresetToSelection: (presetId) => {
      const store = get();
      const { selectedIds, elements, addAnimation, viewport } = store;

      const preset = (store as unknown as AnimationLibrarySlice).animationPresets.find(
        (p) => p.id === presetId
      );
      if (!preset) return;

      // Build element map for bounds calculation
      const elementMap: ElementMap = new Map(elements.map((el) => [el.id, el]));

      selectedIds.forEach((elementId) => {
        const element = elements.find((el) => el.id === elementId);
        if (!element) return;

        // Check if element type matches preset target type
        if (preset.targetType === 'text' && !isTextElement(element)) {
          return; // Skip non-text elements for text-only presets
        }

        // Get bounds for the element (needed for centered scale and rotate)
        let bounds;
        if (element.type === 'group') {
          bounds = getGroupBounds(element as GroupElement, elementMap, viewport);
        } else {
          bounds = getElementBounds(element, viewport, elementMap);
        }
        
        const cx = bounds ? Math.round((bounds.minX + bounds.maxX) / 2) : 0;
        const cy = bounds ? Math.round((bounds.minY + bounds.maxY) / 2) : 0;

        // Handle clipPath animations (e.g., Typewriter effect)
        if (preset.clipPathAnimation && bounds) {
          const clipConfig = preset.clipPathAnimation;
          const clipStore = store as unknown as ClippingPluginSlice;
          
          // Calculate element dimensions
          const elemWidth = Math.round(bounds.maxX - bounds.minX);
          const elemHeight = Math.round(bounds.maxY - bounds.minY);
          const elemX = Math.round(bounds.minX);
          const elemY = Math.round(bounds.minY);
          
          // Generate dynamic width values for typewriter effect
          let animationValues = clipConfig.animation.values;
          if (animationValues === 'DYNAMIC_WIDTH_STEPS') {
            // Go from 0 to full width (typewriter writing effect)
            animationValues = `0;${elemWidth}`;
          }
          
          // Create the clip definition
          const clipId = `clip-typewriter-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const newClip: ClipDefinition = {
            id: clipId,
            name: `Typewriter ${element.type === 'nativeText' ? 'Text' : 'Element'}`,
            pathData: {
              subPaths: [[{ type: 'M', position: { x: 0, y: 0 } }, { type: 'L', position: { x: elemWidth, y: 0 } }, { type: 'L', position: { x: elemWidth, y: elemHeight } }, { type: 'L', position: { x: 0, y: elemHeight } }, { type: 'Z' }]],
              strokeWidth: 0,
              strokeColor: 'none',
              strokeOpacity: 0,
              fillColor: 'black',
              fillOpacity: 1,
            },
            bounds: {
              minX: 0,
              minY: 0,
              width: elemWidth,
              height: elemHeight,
            },
            originX: 0,
            originY: 0,
            clipPathUnits: 'userSpaceOnUse',
            shouldScaleToElement: false,
            baseElementTag: 'rect',
            baseElementAttrs: {
              x: String(elemX),
              y: String(elemY - 10),
              // Start with full width so text is visible by default
              width: String(elemWidth),
              height: String(elemHeight + 20),
            },
          };
          
          // Add clip to store
          if (clipStore.clips !== undefined) {
            set((state) => ({
              clips: [...(state as unknown as ClippingPluginSlice).clips, newClip],
            }));
          }
          
          // Assign clip to element
          const { updateElement } = store;
          updateElement?.(elementId, {
            data: {
              ...(element.data as Record<string, unknown>),
              clipPathId: `${clipId}-${elementId}`,
              clipPathTemplateId: clipId,
            },
          });
          
          // Add the animation to the store
          // Note: For clipPath animations, targetElementId should be undefined
          // because the animation is a direct child of the rect element inside the clipPath
          addAnimation?.({
            type: 'animate',
            attributeName: 'width',
            dur: clipConfig.animation.dur,
            repeatCount: clipConfig.animation.repeatCount,
            fill: clipConfig.animation.fill,
            calcMode: clipConfig.animation.calcMode,
            values: animationValues,
            // Don't set targetElementId - the animation targets the rect inside the clipPath
            clipPathTargetId: clipId,
          });
          
          return; // Skip regular animations for clipPath presets
        }

        preset.animations.forEach((animData) => {
          // Handle centered scale animations
          if (preset.centeredScale && animData.type === 'animateTransform' && animData.transformType === 'scale' && animData.values && bounds) {
            // Parse scale values (format: "sx sy" or just "s" per keyframe, separated by ;)
            const scaleKeyframes = animData.values.split(';').map(v => {
              const parts = v.trim().split(/\s+/);
              // If only one value, use it for both x and y
              const sx = parseFloat(parts[0]);
              const sy = parts.length > 1 ? parseFloat(parts[1]) : sx;
              return { sx, sy };
            });
            
            // Generate translate values: tx = cx * (1 - sx), ty = cy * (1 - sy)
            const translateValues = scaleKeyframes.map(({ sx, sy }) => {
              const tx = Math.round(cx * (1 - sx));
              const ty = Math.round(cy * (1 - sy));
              return `${tx} ${ty}`;
            }).join('; ');

            // Generate scale values in "sx sy" format
            const scaleValuesFormatted = scaleKeyframes.map(({ sx, sy }) => `${sx} ${sy}`).join('; ');

            // Add translate animation first
            addAnimation?.({
              type: 'animateTransform',
              transformType: 'translate',
              attributeName: 'transform',
              dur: animData.dur,
              repeatCount: animData.repeatCount,
              calcMode: animData.calcMode,
              keyTimes: animData.keyTimes,
              keySplines: animData.keySplines,
              values: translateValues,
              additive: 'sum',
              fill: animData.fill,
              targetElementId: elementId,
            });

            // Add scale animation
            addAnimation?.({
              ...animData,
              values: scaleValuesFormatted,
              additive: 'sum',
              targetElementId: elementId,
            });
          }
          // Handle rotate animations - always center them
          else if (animData.type === 'animateTransform' && animData.transformType === 'rotate' && animData.values && bounds) {
            // Parse rotate values (format: "angle" or "angle cx cy" per keyframe, separated by ;)
            // We need to add center coordinates to each keyframe
            const rotateKeyframes = animData.values.split(';').map(v => {
              const parts = v.trim().split(/\s+/);
              // Extract just the angle (first value)
              const angle = parseFloat(parts[0]);
              return angle;
            });
            
            // Generate rotate values with center: "angle cx cy"
            const rotateValuesWithCenter = rotateKeyframes.map(angle => `${angle} ${cx} ${cy}`).join('; ');

            addAnimation?.({
              ...animData,
              values: rotateValuesWithCenter,
              targetElementId: elementId,
            });
          }
          // Handle path draw animation - needs path length calculation
          else if (animData.type === 'animate' && animData.attributeName === 'stroke-dashoffset' && animData.values === 'DYNAMIC_PATH_LENGTH') {
            if (element.type === 'path') {
              // Calculate path length using Paper.js
              const pathData = element.data as PathData;
              const pathD = pathData.subPaths.flat().map(cmd => {
                if (cmd.type === 'M' || cmd.type === 'L') return `${cmd.type} ${cmd.position.x} ${cmd.position.y}`;
                if (cmd.type === 'C') return `C ${cmd.controlPoint1.x} ${cmd.controlPoint1.y} ${cmd.controlPoint2.x} ${cmd.controlPoint2.y} ${cmd.position.x} ${cmd.position.y}`;
                if (cmd.type === 'Z') return 'Z';
                return '';
              }).join(' ');
              
              try {
                ensurePaperSetup();
                if (!paper.project) {
                  throw new Error('Paper.js project is not initialized');
                }

                const paperPath = new paper.Path(pathD);
                const pathLength = Math.max(1, Math.ceil(paperPath.length || 0));
                paperPath.remove();
                
                // Set stroke-dasharray and animate stroke-dashoffset from pathLength to 0
                // This makes the path fully visible in non-animated state
                const values = `${pathLength};0`;
                
                // Update element to have stroke-dasharray set and dashoffset at 0
                const { updateElement } = store;
                updateElement?.(elementId, {
                  data: {
                    ...(element.data as Record<string, unknown>),
                    strokeDasharray: String(pathLength),
                    strokeDashoffset: 0,
                  },
                });
                
                addAnimation?.({
                  ...animData,
                  values,
                  targetElementId: elementId,
                });
              } catch (error) {
                console.error('Error calculating path length:', error);
              }
            }
          }
          // Handle dynamic stroke width - contextual based on current width
          else if (animData.type === 'animate' && animData.attributeName === 'stroke-width' && animData.values === 'DYNAMIC_STROKE_WIDTH') {
            // Get current stroke width from element
            const currentWidth = element.type === 'path' ? ((element.data as PathData).strokeWidth ?? 1) : 1;
            
            // Calculate expanded width (3x current)
            const baseWidth = currentWidth;
            const expandedWidth = currentWidth * 3;
            
            const values = `${baseWidth};${expandedWidth};${baseWidth}`;
            
            addAnimation?.({
              ...animData,
              values,
              targetElementId: elementId,
            });
          }
          // Handle dynamic letter spacing - contextual based on current spacing
          else if (animData.type === 'animate' && animData.attributeName === 'letter-spacing' && animData.values === 'DYNAMIC_SPACING') {
            // Get current letter spacing from element
            const currentSpacing = element.type === 'nativeText' ? (element.data.letterSpacing ?? 0) : 0;
            
            // Calculate expanded spacing (add 8px to current)
            const baseSpacing = currentSpacing;
            const expandedSpacing = currentSpacing + 8;
            
            const values = `${baseSpacing}px;${expandedSpacing}px;${baseSpacing}px`;
            
            addAnimation?.({
              ...animData,
              values,
              targetElementId: elementId,
            });
          }
          // Handle dynamic font size - contextual based on current size
          else if (animData.type === 'animate' && animData.attributeName === 'font-size' && animData.values === 'DYNAMIC_SIZE_PULSE') {
            // Get current font size from element
            const currentSize = element.type === 'nativeText' ? (element.data.fontSize ?? 18) : 18;
            
            // Calculate expanded size (140% of current)
            const baseSize = currentSize;
            const expandedSize = Math.round(currentSize * 1.4);
            
            const values = `${baseSize};${expandedSize};${baseSize}`;
            
            addAnimation?.({
              ...animData,
              values,
              targetElementId: elementId,
            });
          }
          // Handle letter rotation animation - needs dynamic generation based on text length
          else if (animData.type === 'animate' && animData.attributeName === 'rotate' && animData.values === 'DYNAMIC_LETTER_ROTATE') {
            // Get text content to determine letter count
            const textContent = element.type === 'nativeText' ? (element.data.text || '') : '';
            const totalChars = textContent.length; // Count ALL characters including spaces
            
            if (totalChars > 0) {
              // Generate wave pattern for each character
              // Creates 5 keyframes: neutral -> wave up -> neutral -> wave down -> neutral
              const generateWaveFrame = (phase: number) => {
                const angles: number[] = [];
                let nonSpaceIndex = 0;
                const nonSpaceCount = textContent.replace(/\s/g, '').length;
                
                for (let i = 0; i < totalChars; i++) {
                  const char = textContent[i];
                  let angle = 0;
                  
                  // Only rotate non-space characters
                  if (!/\s/.test(char)) {
                    // Adjust progress range to 0.1-0.9 so all letters rotate (avoid sin(0) and sin(π) = 0)
                    const progress = 0.1 + (nonSpaceIndex / Math.max(1, nonSpaceCount - 1)) * 0.8;
                    
                    if (phase === 1) {
                      // Wave up: sine wave 0 to 180 degrees
                      angle = Math.round(Math.sin(progress * Math.PI) * 15); // Max 15 degrees
                    } else if (phase === 3) {
                      // Wave down: sine wave 180 to 360 degrees
                      angle = -Math.round(Math.sin(progress * Math.PI) * 15); // Max -15 degrees
                    }
                    // Phase 0, 2, 4 are neutral (0 degrees)
                    
                    nonSpaceIndex++;
                  }
                  // Spaces always get 0 rotation
                  
                  angles.push(angle);
                }
                return angles.join(' ');
              };
              
              const frame0 = generateWaveFrame(0); // All zeros
              const frame1 = generateWaveFrame(1); // Wave up
              const frame2 = generateWaveFrame(2); // All zeros
              const frame3 = generateWaveFrame(3); // Wave down
              const frame4 = generateWaveFrame(4); // All zeros
              
              const values = `${frame0}; ${frame1}; ${frame2}; ${frame3}; ${frame4}`;
              
              addAnimation?.({
                ...animData,
                values,
                targetElementId: elementId,
              });
            }
          }
          // For other animations, apply as-is
          else {
            addAnimation?.({
              ...animData,
              targetElementId: elementId,
            });
          }
        });
      });
    },

    clearAnimationsFromSelection: () => {
      const store = get();
      const { selectedIds, animations, removeAnimation } = store;

      const animationsToRemove = (animations ?? []).filter((anim: SVGAnimation) =>
        selectedIds.includes(anim.targetElementId)
      );

      animationsToRemove.forEach((anim: SVGAnimation) => {
        removeAnimation?.(anim.id);
      });
    },

    selectedFromSearch: null,
    selectFromSearch: (id: string | null) => set(() => ({ selectedFromSearch: id })),
  };
};
