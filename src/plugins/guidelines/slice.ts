import type { StateCreator } from 'zustand';
import type { PathData } from '../../types';
import { rangesOverlap, calculateElementBoundsMap, type ElementBoundsInfo } from '../../utils/guidelinesHelpers';
import { getCanvasClientRect } from '../../utils/domHelpers';
import { GUIDELINES_DISTANCE_SNAP_MULTIPLE } from '../../constants';
import {
  type GuidelinesState,
  type GuidelineMatch,
  type DistanceGuidelineMatch,
  type SizeMatch,
  type ManualGuide,
  type HoverMeasurement,
  type Bounds,
  DEFAULT_GUIDELINES_CONFIG,
} from './types';

export type { GuidelineMatch, DistanceGuidelineMatch, SizeMatch, ManualGuide, HoverMeasurement } from './types';

export interface GuidelinesPluginSlice {
  // State
  guidelines: GuidelinesState;

  // Actions - State updates
  updateGuidelinesState: (state: Partial<GuidelinesState>) => void;
  
  // Manual guides management
  addManualGuide: (type: 'horizontal' | 'vertical', position: number, frameId?: string | null) => string;
  removeManualGuide: (guideId: string) => void;
  updateManualGuide: (guideId: string, updates: Partial<ManualGuide>) => void;
  clearManualGuides: () => void;
  
  // Guideline finding
  findAlignmentGuidelines: (
    elementId: string,
    currentBounds: Bounds,
    excludeIds?: string[],
    precomputedBoundsMap?: Map<string, ElementBoundsInfo>
  ) => GuidelineMatch[];
  findDistanceGuidelines: (
    elementId: string,
    currentBounds: Bounds,
    alignmentMatches?: GuidelineMatch[],
    excludeIds?: string[],
    precomputedBoundsMap?: Map<string, ElementBoundsInfo>
  ) => DistanceGuidelineMatch[];
  findSizeMatches: (
    elementId: string,
    currentBounds: Bounds,
    excludeIds?: string[],
    precomputedBoundsMap?: Map<string, ElementBoundsInfo>
  ) => SizeMatch[];
  
  // Hover measurements
  calculateHoverMeasurements: (elementId: string) => HoverMeasurement[];
  setHoveredElement: (elementId: string | null) => void;
  setAltPressed: (pressed: boolean) => void;
  
  // Snapping
  checkStickySnap: (
    deltaX: number, 
    deltaY: number, 
    projectedBounds: Bounds,
    distanceMatchesOverride?: DistanceGuidelineMatch[],
    precomputedBoundsMap?: Map<string, ElementBoundsInfo>
  ) => { x: number; y: number; snapped: boolean };
  
  // Resize snapping
  snapResizeBounds: (
    elementId: string,
    newBounds: Bounds,
    originalBounds: Bounds,
    handle: string
  ) => { 
    snappedBounds: Bounds; 
    didSnap: boolean; 
    snapX: number | null; 
    snapY: number | null;
  };
  
  // Ruler interaction
  startDraggingGuide: (type: 'horizontal' | 'vertical', position: number) => void;
  updateDraggingGuide: (position: number) => void;
  finishDraggingGuide: () => void;
  cancelDraggingGuide: () => void;
  
  // Cleanup
  clearGuidelines: () => void;
}

// Generate unique ID for guides
let guideIdCounter = 0;
const generateGuideId = () => `guide-${Date.now()}-${guideIdCounter++}`;

const resolveCanvasViewportSize = (): { width: number; height: number } => {
  const rect = getCanvasClientRect();
  if (rect) {
    return { width: rect.width, height: rect.height };
  }
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: 0, height: 0 };
};

type ActiveArtboardState = {
  enabled?: boolean;
  showMargins?: boolean;
  marginSize?: number;
  exportBounds?: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  } | null;
};

type ArtboardGuidelineBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type ViewGuidelineReference = {
  sourceId: 'viewport' | 'artboard';
  centerX: number;
  centerY: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
};

const resolveArtboardGuidelineBounds = (
  artboard: ActiveArtboardState | undefined
): ArtboardGuidelineBounds | null => {
  if (!artboard?.enabled || !artboard.exportBounds) {
    return null;
  }

  const { minX, minY, width, height } = artboard.exportBounds;
  let resolvedMinX = minX;
  let resolvedMaxX = minX + width;
  let resolvedMinY = minY;
  let resolvedMaxY = minY + height;

  // When safe margins are enabled, guidelines should use those inset bounds.
  if (artboard.showMargins) {
    const maxAllowedMargin = Math.min(width, height) / 2 - 1;
    if (maxAllowedMargin > 0) {
      const requestedMargin = Math.max(artboard.marginSize ?? 0, 0);
      const safeMargin = Math.min(requestedMargin, maxAllowedMargin);
      if (safeMargin > 0) {
        resolvedMinX += safeMargin;
        resolvedMaxX -= safeMargin;
        resolvedMinY += safeMargin;
        resolvedMaxY -= safeMargin;
      }
    }
  }

  return {
    minX: resolvedMinX,
    maxX: resolvedMaxX,
    minY: resolvedMinY,
    maxY: resolvedMaxY,
  };
};

const resolveViewGuidelineReference = (
  viewport: { zoom: number; panX: number; panY: number },
  artboard: ActiveArtboardState | undefined
): ViewGuidelineReference => {
  const artboardBounds = resolveArtboardGuidelineBounds(artboard);
  if (artboardBounds) {
    return {
      sourceId: 'artboard',
      centerX: (artboardBounds.minX + artboardBounds.maxX) / 2,
      centerY: (artboardBounds.minY + artboardBounds.maxY) / 2,
      minX: artboardBounds.minX,
      maxX: artboardBounds.maxX,
      minY: artboardBounds.minY,
      maxY: artboardBounds.maxY,
    };
  }

  const canvasViewport = resolveCanvasViewportSize();
  return {
    sourceId: 'viewport',
    centerX: (canvasViewport.width / 2 - viewport.panX) / viewport.zoom,
    centerY: (canvasViewport.height / 2 - viewport.panY) / viewport.zoom,
  };
};

export const createGuidelinesPluginSlice: StateCreator<GuidelinesPluginSlice, [], [], GuidelinesPluginSlice> = (set, get) => {
  return {
    // Initial state
    guidelines: {
      ...DEFAULT_GUIDELINES_CONFIG,
      manualGuides: [],
      currentMatches: [],
      currentDistanceMatches: [],
      currentSizeMatches: [],
      hoverMeasurements: [],
      isAltPressed: false,
      hoveredElementId: null,
      stickyState: {
        isSticky: false,
        stickyOffset: { x: 0, y: 0 },
        lastStickyTime: 0,
      },
      isDraggingGuide: false,
      draggingGuideType: null,
      draggingGuidePosition: null,
    },

    // Actions
    updateGuidelinesState: (state) => {
      set((current) => ({
        guidelines: { ...current.guidelines, ...state },
      }));
    },

    // Manual guides management
    addManualGuide: (type, position, frameId = null) => {
      const id = generateGuideId();
      const state = get();
      const newGuide: ManualGuide = {
        id,
        type,
        position,
        color: state.guidelines.manualGuideColor,
        locked: false,
        frameId,
      };
      
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: [...current.guidelines.manualGuides, newGuide],
        },
      }));
      
      return id;
    },

    removeManualGuide: (guideId) => {
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: current.guidelines.manualGuides.filter(g => g.id !== guideId),
        },
      }));
    },

    updateManualGuide: (guideId, updates) => {
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: current.guidelines.manualGuides.map(g =>
            g.id === guideId ? { ...g, ...updates } : g
          ),
        },
      }));
    },

    clearManualGuides: () => {
      set((current) => ({
        guidelines: {
          ...current.guidelines,
          manualGuides: [],
        },
      }));
    },

    // Find alignment guidelines (edges and centers)
    findAlignmentGuidelines: (elementId, currentBounds, excludeIds, precomputedBoundsMap) => {
      const state = get();
      
      if (!state.guidelines.enabled) {
        return [];
      }

      const matches: GuidelineMatch[] = [];
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number };
        isElementHidden: (id: string) => boolean;
        artboard?: ActiveArtboardState;
      };
      
      const { elements, viewport, isElementHidden } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const threshold = state.guidelines.snapThreshold / viewport.zoom;

      const currentCenterX = (currentBounds.minX + currentBounds.maxX) / 2;
      const currentCenterY = (currentBounds.minY + currentBounds.maxY) / 2;

      // Priority: center > edges, manual guides have same priority as element centers
      const potentialMatches: Array<{ 
        match: GuidelineMatch; 
        priority: number; // 1 = center/manual, 2 = edge
      }> = [];

      // Check manual guides first (if enabled)
      if (state.guidelines.snapToManualGuides && state.guidelines.manualGuidesEnabled) {
        state.guidelines.manualGuides.forEach(guide => {
          if (guide.locked) return;
          
          if (guide.type === 'vertical') {
            // Check left edge
            if (state.guidelines.snapToPath && Math.abs(currentBounds.minX - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'left', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            // Check right edge
            if (state.guidelines.snapToPath && Math.abs(currentBounds.maxX - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'right', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            // Check center
            if (state.guidelines.snapToCenters && Math.abs(currentCenterX - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'centerX', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
          } else {
            // Horizontal guide
            if (state.guidelines.snapToPath && Math.abs(currentBounds.minY - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'top', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            if (state.guidelines.snapToPath && Math.abs(currentBounds.maxY - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'bottom', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
            if (state.guidelines.snapToCenters && Math.abs(currentCenterY - guide.position) < threshold) {
              potentialMatches.push({
                match: { type: 'centerY', position: guide.position, elementIds: [], isManualGuide: true, guideId: guide.id },
                priority: 1
              });
            }
          }
        });
      }

      // Use active artboard as the "view" reference when available.
      // Fallback to viewport center when no active artboard exists.
      if (state.guidelines.snapToViewportCenter) {
        const viewReference = resolveViewGuidelineReference(viewport, fullState.artboard);

        if (Math.abs(currentCenterX - viewReference.centerX) < threshold) {
          potentialMatches.push({
            match: { type: 'centerX', position: viewReference.centerX, elementIds: [viewReference.sourceId] },
            priority: 1
          });
        }

        if (Math.abs(currentCenterY - viewReference.centerY) < threshold) {
          potentialMatches.push({
            match: { type: 'centerY', position: viewReference.centerY, elementIds: [viewReference.sourceId] },
            priority: 1
          });
        }

        // Add artboard edge guidelines (safe margins when enabled).
        if (
          viewReference.sourceId === 'artboard' &&
          viewReference.minX !== undefined &&
          viewReference.maxX !== undefined &&
          viewReference.minY !== undefined &&
          viewReference.maxY !== undefined
        ) {
          if (Math.abs(currentBounds.minX - viewReference.minX) < threshold) {
            potentialMatches.push({
              match: { type: 'left', position: viewReference.minX, elementIds: ['artboard'] },
              priority: 2
            });
          }
          if (Math.abs(currentBounds.minX - viewReference.maxX) < threshold) {
            potentialMatches.push({
              match: { type: 'left', position: viewReference.maxX, elementIds: ['artboard'] },
              priority: 2
            });
          }
          if (Math.abs(currentBounds.maxX - viewReference.maxX) < threshold) {
            potentialMatches.push({
              match: { type: 'right', position: viewReference.maxX, elementIds: ['artboard'] },
              priority: 2
            });
          }
          if (Math.abs(currentBounds.maxX - viewReference.minX) < threshold) {
            potentialMatches.push({
              match: { type: 'right', position: viewReference.minX, elementIds: ['artboard'] },
              priority: 2
            });
          }
          if (Math.abs(currentBounds.minY - viewReference.minY) < threshold) {
            potentialMatches.push({
              match: { type: 'top', position: viewReference.minY, elementIds: ['artboard'] },
              priority: 2
            });
          }
          if (Math.abs(currentBounds.minY - viewReference.maxY) < threshold) {
            potentialMatches.push({
              match: { type: 'top', position: viewReference.maxY, elementIds: ['artboard'] },
              priority: 2
            });
          }
          if (Math.abs(currentBounds.maxY - viewReference.maxY) < threshold) {
            potentialMatches.push({
              match: { type: 'bottom', position: viewReference.maxY, elementIds: ['artboard'] },
              priority: 2
            });
          }
          if (Math.abs(currentBounds.maxY - viewReference.minY) < threshold) {
            potentialMatches.push({
              match: { type: 'bottom', position: viewReference.minY, elementIds: ['artboard'] },
              priority: 2
            });
          }
        }
      }

      // Use centralized bounds calculation with caching
      // Combine elementId with any additional excludeIds (for multi-selection)
      const allExcludeIds = excludeIds ? [elementId, ...excludeIds] : [elementId];
      const boundsMap = precomputedBoundsMap ?? calculateElementBoundsMap(
        elements,
        allExcludeIds,
        viewport.zoom,
        { includeStroke: true, isElementHidden }
      );

      // Check against all other elements using cached bounds
      boundsMap.forEach((boundsInfo) => {
        const { id: refElementId, bounds, centerX, centerY } = boundsInfo;

        // === HORIZONTAL ALIGNMENTS ===
        
        // Center X alignment (highest priority)
        if (state.guidelines.snapToCenters && Math.abs(currentCenterX - centerX) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'centerX' && !m.match.isManualGuide && Math.abs(m.match.position - centerX) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'centerX', position: centerX, elementIds: [refElementId] },
              priority: 1
            });
          }
        }
        
        if (state.guidelines.snapToPath) {
          // Left edge alignment (edge-to-edge)
          if (Math.abs(currentBounds.minX - bounds.minX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'left' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minX) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'left', position: bounds.minX, elementIds: [refElementId] },
                priority: 2
              });
            }
          }

          // Left edge entering/exiting from right
          if (Math.abs(currentBounds.minX - bounds.maxX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'left' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxX) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'left', position: bounds.maxX, elementIds: [refElementId] },
                priority: 2
              });
            }
          }

          // Right edge alignment
          if (Math.abs(currentBounds.maxX - bounds.maxX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'right' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxX) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'right', position: bounds.maxX, elementIds: [refElementId] },
                priority: 2
              });
            }
          }

          // Right edge entering/exiting from left
          if (Math.abs(currentBounds.maxX - bounds.minX) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'right' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minX) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'right', position: bounds.minX, elementIds: [refElementId] },
                priority: 2
              });
            }
          }
        }

        // === VERTICAL ALIGNMENTS ===
        
        // Center Y alignment (highest priority)
        if (state.guidelines.snapToCenters && Math.abs(currentCenterY - centerY) < threshold) {
          const existing = potentialMatches.find(
            m => m.match.type === 'centerY' && !m.match.isManualGuide && Math.abs(m.match.position - centerY) < threshold
          );
          if (existing) {
            existing.match.elementIds.push(refElementId);
          } else {
            potentialMatches.push({
              match: { type: 'centerY', position: centerY, elementIds: [refElementId] },
              priority: 1
            });
          }
        }

        if (state.guidelines.snapToPath) {
          // Top edge alignment
          if (Math.abs(currentBounds.minY - bounds.minY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'top' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minY) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'top', position: bounds.minY, elementIds: [refElementId] },
                priority: 2
              });
            }
          }

          // Top edge entering/exiting from bottom
          if (Math.abs(currentBounds.minY - bounds.maxY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'top' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxY) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'top', position: bounds.maxY, elementIds: [refElementId] },
                priority: 2
              });
            }
          }

          // Bottom edge alignment
          if (Math.abs(currentBounds.maxY - bounds.maxY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'bottom' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.maxY) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'bottom', position: bounds.maxY, elementIds: [refElementId] },
                priority: 2
              });
            }
          }

          // Bottom edge entering/exiting from top
          if (Math.abs(currentBounds.maxY - bounds.minY) < threshold) {
            const existing = potentialMatches.find(
              m => m.match.type === 'bottom' && !m.match.isManualGuide && Math.abs(m.match.position - bounds.minY) < threshold
            );
            if (existing) {
              existing.match.elementIds.push(refElementId);
            } else {
              potentialMatches.push({
                match: { type: 'bottom', position: bounds.minY, elementIds: [refElementId] },
                priority: 2
              });
            }
          }
        }
      });

      // Prioritization logic
      const horizontalMatches = potentialMatches.filter(
        m => m.match.type === 'left' || m.match.type === 'right' || m.match.type === 'centerX'
      );
      const verticalMatches = potentialMatches.filter(
        m => m.match.type === 'top' || m.match.type === 'bottom' || m.match.type === 'centerY'
      );

      // Get the highest priority horizontal match
      if (horizontalMatches.length > 0) {
        horizontalMatches.sort((a, b) => a.priority - b.priority);
        matches.push(horizontalMatches[0].match);
      }

      // Get the highest priority vertical match
      if (verticalMatches.length > 0) {
        verticalMatches.sort((a, b) => a.priority - b.priority);
        matches.push(verticalMatches[0].match);
      }

      return matches;
    },

    // Find distance guidelines
    findDistanceGuidelines: (elementId, currentBounds, alignmentMatches = [], excludeIds, precomputedBoundsMap) => {
      const state = get();
      
      if (!state.guidelines.enabled || !state.guidelines.distanceEnabled) {
        return [];
      }

      const matches: DistanceGuidelineMatch[] = [];
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number };
        isElementHidden: (id: string) => boolean;
        artboard?: ActiveArtboardState;
      };
      const { elements, viewport, isElementHidden } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const threshold = state.guidelines.snapThreshold / viewport.zoom;

      // Combine elementId with any additional excludeIds (for multi-selection)
      const allExcludeIds = excludeIds ? [elementId, ...excludeIds] : [elementId];
      const boundsMap = precomputedBoundsMap ?? calculateElementBoundsMap(
        elements,
        allExcludeIds,
        viewport.zoom,
        { includeStroke: true, isElementHidden }
      );

      // Special case: when an alignment guideline involves exactly 2 elements
      alignmentMatches.forEach(match => {
        if (match.elementIds.length === 1 && !match.isManualGuide) {
          const referenceElementId = match.elementIds[0];
          const refBoundsInfo = boundsMap.get(referenceElementId);
          
          if (refBoundsInfo) {
            const refBounds = refBoundsInfo.bounds;
            const isVerticalAlignment = match.type === 'centerX' || match.type === 'left' || match.type === 'right';
            const isHorizontalAlignment = match.type === 'centerY' || match.type === 'top' || match.type === 'bottom';

            if (isVerticalAlignment) {
              const verticalGap = Math.min(
                Math.abs(currentBounds.minY - refBounds.maxY),
                Math.abs(refBounds.minY - currentBounds.maxY)
              );
              
              const distance = Math.round(verticalGap);
              if (distance > 0) {
                if (currentBounds.minY > refBounds.maxY) {
                  matches.push({
                    axis: 'vertical',
                    distance,
                    referenceStart: refBounds.maxY,
                    referenceEnd: currentBounds.minY,
                    referenceElementIds: [referenceElementId, elementId],
                    currentStart: refBounds.maxY,
                    currentEnd: currentBounds.minY,
                    currentElementId: elementId,
                  });
                } else {
                  matches.push({
                    axis: 'vertical',
                    distance,
                    referenceStart: currentBounds.maxY,
                    referenceEnd: refBounds.minY,
                    referenceElementIds: [elementId, referenceElementId],
                    currentStart: currentBounds.maxY,
                    currentEnd: refBounds.minY,
                    currentElementId: elementId,
                  });
                }
              }
            } else if (isHorizontalAlignment) {
              const horizontalGap = Math.min(
                Math.abs(currentBounds.minX - refBounds.maxX),
                Math.abs(refBounds.minX - currentBounds.maxX)
              );
              
              const distance = Math.round(horizontalGap);
              if (distance > 0) {
                if (currentBounds.minX > refBounds.maxX) {
                  matches.push({
                    axis: 'horizontal',
                    distance,
                    referenceStart: refBounds.maxX,
                    referenceEnd: currentBounds.minX,
                    referenceElementIds: [referenceElementId, elementId],
                    currentStart: refBounds.maxX,
                    currentEnd: currentBounds.minX,
                    currentElementId: elementId,
                  });
                } else {
                  matches.push({
                    axis: 'horizontal',
                    distance,
                    referenceStart: currentBounds.maxX,
                    referenceEnd: refBounds.minX,
                    referenceElementIds: [elementId, referenceElementId],
                    currentStart: currentBounds.maxX,
                    currentEnd: refBounds.minX,
                    currentElementId: elementId,
                  });
                }
              }
            }
          }
        }
      });

      if (matches.length > 0 && boundsMap.size < 2) {
        return matches;
      }

      if (boundsMap.size < 2) {
        return [];
      }

      // Convert boundsMap to simple format
      const elementBounds = new Map<string, Bounds>();
      boundsMap.forEach((info, id) => {
        elementBounds.set(id, info.bounds);
      });

      // === HORIZONTAL DISTANCES ===
      const horizontalBandElements = Array.from(elementBounds.entries()).filter(
        ([, bounds]) => rangesOverlap(currentBounds.minY, currentBounds.maxY, bounds.minY, bounds.maxY)
      );

      const horizontalDistances = new Map<number, Array<{ start: number; end: number; ids: [string, string] }>>();
      const sortedByX = horizontalBandElements.sort((a, b) => a[1].minX - b[1].minX);
      
      for (let i = 0; i < sortedByX.length - 1; i++) {
        const [id1, bounds1] = sortedByX[i];
        const [id2, bounds2] = sortedByX[i + 1];
        const distance = Math.round(bounds2.minX - bounds1.maxX);
        
        if (distance > 0) {
          if (!horizontalDistances.has(distance)) {
            horizontalDistances.set(distance, []);
          }
          horizontalDistances.get(distance)!.push({
            start: bounds1.maxX,
            end: bounds2.minX,
            ids: [id1, id2]
          });
        }
      }

      for (const [, otherBounds] of sortedByX) {
        const currentDistance = currentBounds.minX - otherBounds.maxX;
        if (currentDistance > 0) {
          const minDistance = Math.max(1, Math.ceil(currentDistance - threshold));
          const maxDistance = Math.floor(currentDistance + threshold);
          for (let distance = minDistance; distance <= maxDistance; distance++) {
            const pairs = horizontalDistances.get(distance);
            if (!pairs) continue;
            pairs.forEach(pair => {
              matches.push({
                axis: 'horizontal',
                distance,
                referenceStart: pair.start,
                referenceEnd: pair.end,
                referenceElementIds: pair.ids,
                currentStart: otherBounds.maxX,
                currentEnd: currentBounds.minX,
                currentElementId: elementId,
              });
            });
          }
        }

        const currentDistance2 = otherBounds.minX - currentBounds.maxX;
        if (currentDistance2 > 0) {
          const minDistance = Math.max(1, Math.ceil(currentDistance2 - threshold));
          const maxDistance = Math.floor(currentDistance2 + threshold);
          for (let distance = minDistance; distance <= maxDistance; distance++) {
            const pairs = horizontalDistances.get(distance);
            if (!pairs) continue;
            pairs.forEach(pair => {
              matches.push({
                axis: 'horizontal',
                distance,
                referenceStart: pair.start,
                referenceEnd: pair.end,
                referenceElementIds: pair.ids,
                currentStart: currentBounds.maxX,
                currentEnd: otherBounds.minX,
                currentElementId: elementId,
              });
            });
          }
        }
      }

      // === VERTICAL DISTANCES ===
      const verticalBandElements = Array.from(elementBounds.entries()).filter(
        ([, bounds]) => rangesOverlap(currentBounds.minX, currentBounds.maxX, bounds.minX, bounds.maxX)
      );

      const verticalDistances = new Map<number, Array<{ start: number; end: number; ids: [string, string] }>>();
      const sortedByY = verticalBandElements.sort((a, b) => a[1].minY - b[1].minY);
      
      for (let i = 0; i < sortedByY.length - 1; i++) {
        const [id1, bounds1] = sortedByY[i];
        const [id2, bounds2] = sortedByY[i + 1];
        const distance = Math.round(bounds2.minY - bounds1.maxY);
        
        if (distance > 0) {
          if (!verticalDistances.has(distance)) {
            verticalDistances.set(distance, []);
          }
          verticalDistances.get(distance)!.push({
            start: bounds1.maxY,
            end: bounds2.minY,
            ids: [id1, id2]
          });
        }
      }

      for (const [, otherBounds] of sortedByY) {
        const currentDistance = currentBounds.minY - otherBounds.maxY;
        if (currentDistance > 0) {
          const minDistance = Math.max(1, Math.ceil(currentDistance - threshold));
          const maxDistance = Math.floor(currentDistance + threshold);
          for (let distance = minDistance; distance <= maxDistance; distance++) {
            const pairs = verticalDistances.get(distance);
            if (!pairs) continue;
            pairs.forEach(pair => {
              matches.push({
                axis: 'vertical',
                distance,
                referenceStart: pair.start,
                referenceEnd: pair.end,
                referenceElementIds: pair.ids,
                currentStart: otherBounds.maxY,
                currentEnd: currentBounds.minY,
                currentElementId: elementId,
              });
            });
          }
        }

        const currentDistance2 = otherBounds.minY - currentBounds.maxY;
        if (currentDistance2 > 0) {
          const minDistance = Math.max(1, Math.ceil(currentDistance2 - threshold));
          const maxDistance = Math.floor(currentDistance2 + threshold);
          for (let distance = minDistance; distance <= maxDistance; distance++) {
            const pairs = verticalDistances.get(distance);
            if (!pairs) continue;
            pairs.forEach(pair => {
              matches.push({
                axis: 'vertical',
                distance,
                referenceStart: pair.start,
                referenceEnd: pair.end,
                referenceElementIds: pair.ids,
                currentStart: currentBounds.maxY,
                currentEnd: otherBounds.minY,
                currentElementId: elementId,
              });
            });
          }
        }
      }

      return matches;
    },

    // Find size matches
    findSizeMatches: (elementId, currentBounds, excludeIds, precomputedBoundsMap) => {
      const state = get();
      
      if (!state.guidelines.enabled || !state.guidelines.sizeMatchingEnabled) {
        return [];
      }

      const matches: SizeMatch[] = [];
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number };
        isElementHidden: (id: string) => boolean;
      };
      const { elements, viewport, isElementHidden } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const threshold = state.guidelines.snapThreshold / viewport.zoom;
      const currentWidth = currentBounds.maxX - currentBounds.minX;
      const currentHeight = currentBounds.maxY - currentBounds.minY;

      // Combine elementId with any additional excludeIds (for multi-selection)
      const allExcludeIds = excludeIds ? [elementId, ...excludeIds] : [elementId];
      const boundsMap = precomputedBoundsMap ?? calculateElementBoundsMap(
        elements,
        allExcludeIds,
        viewport.zoom,
        { includeStroke: true, isElementHidden }
      );

      const widthMatches: string[] = [];
      const heightMatches: string[] = [];

      boundsMap.forEach((boundsInfo) => {
        const refWidth = boundsInfo.bounds.maxX - boundsInfo.bounds.minX;
        const refHeight = boundsInfo.bounds.maxY - boundsInfo.bounds.minY;

        if (Math.abs(currentWidth - refWidth) < threshold) {
          widthMatches.push(boundsInfo.id);
        }

        if (Math.abs(currentHeight - refHeight) < threshold) {
          heightMatches.push(boundsInfo.id);
        }
      });

      if (widthMatches.length > 0) {
        matches.push({
          type: 'width',
          value: currentWidth,
          matchingElementIds: widthMatches,
          currentElementId: elementId,
        });
      }

      if (heightMatches.length > 0) {
        matches.push({
          type: 'height',
          value: currentHeight,
          matchingElementIds: heightMatches,
          currentElementId: elementId,
        });
      }

      return matches;
    },



    // Calculate hover measurements
    calculateHoverMeasurements: (elementId) => {
      const state = get();
      
      if (!state.guidelines.enabled || !state.guidelines.isAltPressed) {
        return [];
      }

      const measurements: HoverMeasurement[] = [];
      const fullState = get() as unknown as { 
        elements: Array<{ id: string; type: string; data: PathData }>; 
        viewport: { zoom: number; panX: number; panY: number };
        isElementHidden: (id: string) => boolean;
        artboard?: ActiveArtboardState;
      };
      const { elements, viewport, isElementHidden } = fullState;
      
      if (!elements || !viewport) {
        return [];
      }

      const boundsMap = calculateElementBoundsMap(
        elements,
        [],
        viewport.zoom,
        { includeStroke: true, isElementHidden }
      );

      const currentBoundsInfo = boundsMap.get(elementId);
      if (!currentBoundsInfo) {
        return [];
      }

      const currentBounds = currentBoundsInfo.bounds;

      // Measure to other elements
      boundsMap.forEach((otherBoundsInfo, otherId) => {
        if (otherId === elementId) return;

        const otherBounds = otherBoundsInfo.bounds;

        // Check if in horizontal band
        if (rangesOverlap(currentBounds.minY, currentBounds.maxY, otherBounds.minY, otherBounds.maxY)) {
          const overlapMinY = Math.max(currentBounds.minY, otherBounds.minY);
          const overlapMaxY = Math.min(currentBounds.maxY, otherBounds.maxY);
          const perpendicularY = (overlapMinY + overlapMaxY) / 2;

          // Distance to the right
          if (otherBounds.minX > currentBounds.maxX) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'horizontal',
              distance: Math.round(otherBounds.minX - currentBounds.maxX),
              start: currentBounds.maxX,
              end: otherBounds.minX,
              perpendicularPosition: perpendicularY,
            });
          }
          // Distance to the left
          else if (currentBounds.minX > otherBounds.maxX) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'horizontal',
              distance: Math.round(currentBounds.minX - otherBounds.maxX),
              start: otherBounds.maxX,
              end: currentBounds.minX,
              perpendicularPosition: perpendicularY,
            });
          }
        }

        // Check if in vertical band
        if (rangesOverlap(currentBounds.minX, currentBounds.maxX, otherBounds.minX, otherBounds.maxX)) {
          const overlapMinX = Math.max(currentBounds.minX, otherBounds.minX);
          const overlapMaxX = Math.min(currentBounds.maxX, otherBounds.maxX);
          const perpendicularX = (overlapMinX + overlapMaxX) / 2;

          // Distance below
          if (otherBounds.minY > currentBounds.maxY) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'vertical',
              distance: Math.round(otherBounds.minY - currentBounds.maxY),
              start: currentBounds.maxY,
              end: otherBounds.minY,
              perpendicularPosition: perpendicularX,
            });
          }
          // Distance above
          else if (currentBounds.minY > otherBounds.maxY) {
            measurements.push({
              elementId,
              targetId: otherId,
              axis: 'vertical',
              distance: Math.round(currentBounds.minY - otherBounds.maxY),
              start: otherBounds.maxY,
              end: currentBounds.minY,
              perpendicularPosition: perpendicularX,
            });
          }
        }
      });

      // Check for nested elements (current inside other)
      boundsMap.forEach((otherBoundsInfo, otherId) => {
        if (otherId === elementId) return;

        const otherBounds = otherBoundsInfo.bounds;

        // Check if current is completely inside other
        if (currentBounds.minX > otherBounds.minX && currentBounds.maxX < otherBounds.maxX &&
            currentBounds.minY > otherBounds.minY && currentBounds.maxY < otherBounds.maxY) {
          // Calculate center of current element for perpendicular positions
          const centerX = (currentBounds.minX + currentBounds.maxX) / 2;
          const centerY = (currentBounds.minY + currentBounds.maxY) / 2;

          // Distance from left edge of current to left edge of other
          measurements.push({
            elementId,
            targetId: otherId,
            axis: 'horizontal',
            distance: Math.round(currentBounds.minX - otherBounds.minX),
            start: otherBounds.minX,
            end: currentBounds.minX,
            perpendicularPosition: centerY,
          });

          // Distance from right edge of current to right edge of other
          measurements.push({
            elementId,
            targetId: otherId,
            axis: 'horizontal',
            distance: Math.round(otherBounds.maxX - currentBounds.maxX),
            start: currentBounds.maxX,
            end: otherBounds.maxX,
            perpendicularPosition: centerY,
          });

          // Distance from top edge of current to top edge of other
          measurements.push({
            elementId,
            targetId: otherId,
            axis: 'vertical',
            distance: Math.round(currentBounds.minY - otherBounds.minY),
            start: otherBounds.minY,
            end: currentBounds.minY,
            perpendicularPosition: centerX,
          });

          // Distance from bottom edge of current to bottom edge of other
          measurements.push({
            elementId,
            targetId: otherId,
            axis: 'vertical',
            distance: Math.round(otherBounds.maxY - currentBounds.maxY),
            start: currentBounds.maxY,
            end: otherBounds.maxY,
            perpendicularPosition: centerX,
          });
        }
      });

      // Measure to manual guides
      if (state.guidelines.manualGuidesEnabled) {
        state.guidelines.manualGuides.forEach(guide => {
          if (guide.type === 'vertical') {
            const perpendicularY = (currentBounds.minY + currentBounds.maxY) / 2;
            
            if (guide.position > currentBounds.maxX) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'horizontal',
                distance: Math.round(guide.position - currentBounds.maxX),
                start: currentBounds.maxX,
                end: guide.position,
                perpendicularPosition: perpendicularY,
              });
            } else if (guide.position < currentBounds.minX) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'horizontal',
                distance: Math.round(currentBounds.minX - guide.position),
                start: guide.position,
                end: currentBounds.minX,
                perpendicularPosition: perpendicularY,
              });
            }
          } else {
            const perpendicularX = (currentBounds.minX + currentBounds.maxX) / 2;
            
            if (guide.position > currentBounds.maxY) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'vertical',
                distance: Math.round(guide.position - currentBounds.maxY),
                start: currentBounds.maxY,
                end: guide.position,
                perpendicularPosition: perpendicularX,
              });
            } else if (guide.position < currentBounds.minY) {
              measurements.push({
                elementId,
                targetId: 'guide',
                guideId: guide.id,
                axis: 'vertical',
                distance: Math.round(currentBounds.minY - guide.position),
                start: guide.position,
                end: currentBounds.minY,
                perpendicularPosition: perpendicularX,
              });
            }
          }
        });
      }

      // Measure to artboard bounds (or safe margins if enabled).
      const artboardGuidelineBounds = resolveArtboardGuidelineBounds(fullState.artboard);
      if (artboardGuidelineBounds) {
        const centerX = (currentBounds.minX + currentBounds.maxX) / 2;
        const centerY = (currentBounds.minY + currentBounds.maxY) / 2;

        const pushHorizontalMeasurement = (start: number, end: number) => {
          measurements.push({
            elementId,
            targetId: 'artboard',
            axis: 'horizontal',
            distance: Math.round(Math.abs(end - start)),
            start,
            end,
            perpendicularPosition: centerY,
          });
        };

        const pushVerticalMeasurement = (start: number, end: number) => {
          measurements.push({
            elementId,
            targetId: 'artboard',
            axis: 'vertical',
            distance: Math.round(Math.abs(end - start)),
            start,
            end,
            perpendicularPosition: centerX,
          });
        };

        // Left reference edge
        if (artboardGuidelineBounds.minX > currentBounds.maxX) {
          pushHorizontalMeasurement(currentBounds.maxX, artboardGuidelineBounds.minX);
        } else if (currentBounds.minX > artboardGuidelineBounds.minX) {
          pushHorizontalMeasurement(artboardGuidelineBounds.minX, currentBounds.minX);
        }

        // Right reference edge
        if (artboardGuidelineBounds.maxX < currentBounds.minX) {
          pushHorizontalMeasurement(artboardGuidelineBounds.maxX, currentBounds.minX);
        } else if (artboardGuidelineBounds.maxX > currentBounds.maxX) {
          pushHorizontalMeasurement(currentBounds.maxX, artboardGuidelineBounds.maxX);
        }

        // Top reference edge
        if (artboardGuidelineBounds.minY > currentBounds.maxY) {
          pushVerticalMeasurement(currentBounds.maxY, artboardGuidelineBounds.minY);
        } else if (currentBounds.minY > artboardGuidelineBounds.minY) {
          pushVerticalMeasurement(artboardGuidelineBounds.minY, currentBounds.minY);
        }

        // Bottom reference edge
        if (artboardGuidelineBounds.maxY < currentBounds.minY) {
          pushVerticalMeasurement(artboardGuidelineBounds.maxY, currentBounds.minY);
        } else if (artboardGuidelineBounds.maxY > currentBounds.maxY) {
          pushVerticalMeasurement(currentBounds.maxY, artboardGuidelineBounds.maxY);
        }
      }

      return measurements;
    },

    setHoveredElement: (elementId) => {
      const state = get();
      
      if (elementId && state.guidelines.isAltPressed) {
        const measurements = state.calculateHoverMeasurements(elementId);
        set((current) => ({
          guidelines: {
            ...current.guidelines,
            hoveredElementId: elementId,
            hoverMeasurements: measurements,
          },
        }));
      } else {
        set((current) => ({
          guidelines: {
            ...current.guidelines,
            hoveredElementId: elementId,
            hoverMeasurements: [],
          },
        }));
      }
    },

    setAltPressed: (pressed) => {
      set((current) => {
        const newState = {
          guidelines: {
            ...current.guidelines,
            isAltPressed: pressed,
          },
        };
        
        // Recalculate measurements if we have a hovered element
        if (pressed && current.guidelines.hoveredElementId) {
          const measurements = get().calculateHoverMeasurements(current.guidelines.hoveredElementId);
          newState.guidelines.hoverMeasurements = measurements;
        } else {
          newState.guidelines.hoverMeasurements = [];
        }
        
        return newState;
      });
    },

    // Check if movement should snap to guidelines
    checkStickySnap: (deltaX, deltaY, projectedBounds, distanceMatchesOverride, precomputedBoundsMap) => {
      const state = get();
      const { guidelines } = state;
      const fullState = get() as unknown as { viewport: { zoom: number; panX: number; panY: number } };
      const { viewport } = fullState;

      if (!guidelines.enabled || !viewport) {
        return { x: deltaX, y: deltaY, snapped: false };
      }

      // Use override distance matches if provided, otherwise use state
      const distanceMatches = distanceMatchesOverride ?? guidelines.currentDistanceMatches;

      const snapThreshold = guidelines.snapThreshold / viewport.zoom;
      const stickyThreshold = snapThreshold * 2;
      
      type SnapCandidate = {
        offset: number;
        absDiff: number;
        virtualMatch?: DistanceGuidelineMatch;
      };

      const EPSILON = 1e-9;
      const selectBestCandidate = (
        currentCandidate: SnapCandidate | null,
        nextCandidate: SnapCandidate
      ): SnapCandidate => {
        if (!currentCandidate) return nextCandidate;
        if (nextCandidate.absDiff < currentCandidate.absDiff - EPSILON) return nextCandidate;
        if (Math.abs(nextCandidate.absDiff - currentCandidate.absDiff) <= EPSILON &&
            Math.abs(nextCandidate.offset) < Math.abs(currentCandidate.offset) - EPSILON) {
          return nextCandidate;
        }
        return currentCandidate;
      };

      const getNearestMultipleCandidate = (gap: number): { nearestMultiple: number; diff: number; absDiff: number } | null => {
        if (GUIDELINES_DISTANCE_SNAP_MULTIPLE <= 0) return null;
        const nearestMultiple = Math.round(gap / GUIDELINES_DISTANCE_SNAP_MULTIPLE) * GUIDELINES_DISTANCE_SNAP_MULTIPLE;
        if (nearestMultiple <= 0) return null;
        const diff = nearestMultiple - gap;
        const absDiff = Math.abs(diff);
        if (absDiff >= snapThreshold) return null;
        return { nearestMultiple, diff, absDiff };
      };

      let bestSnapX: SnapCandidate | null = null;
      let bestSnapY: SnapCandidate | null = null;

      // Check alignment guidelines for snap.
      guidelines.currentMatches.forEach((match: GuidelineMatch) => {
        if (match.type === 'left') {
          const diff = match.position - projectedBounds.minX;
          const absDiff = Math.abs(diff);
          if (absDiff < snapThreshold) {
            bestSnapX = selectBestCandidate(bestSnapX, { offset: diff, absDiff });
          }
        } else if (match.type === 'right') {
          const diff = match.position - projectedBounds.maxX;
          const absDiff = Math.abs(diff);
          if (absDiff < snapThreshold) {
            bestSnapX = selectBestCandidate(bestSnapX, { offset: diff, absDiff });
          }
        } else if (match.type === 'centerX') {
          const currentCenterX = (projectedBounds.minX + projectedBounds.maxX) / 2;
          const diff = match.position - currentCenterX;
          const absDiff = Math.abs(diff);
          if (absDiff < snapThreshold) {
            bestSnapX = selectBestCandidate(bestSnapX, { offset: diff, absDiff });
          }
        } else if (match.type === 'top') {
          const diff = match.position - projectedBounds.minY;
          const absDiff = Math.abs(diff);
          if (absDiff < snapThreshold) {
            bestSnapY = selectBestCandidate(bestSnapY, { offset: diff, absDiff });
          }
        } else if (match.type === 'bottom') {
          const diff = match.position - projectedBounds.maxY;
          const absDiff = Math.abs(diff);
          if (absDiff < snapThreshold) {
            bestSnapY = selectBestCandidate(bestSnapY, { offset: diff, absDiff });
          }
        } else if (match.type === 'centerY') {
          const currentCenterY = (projectedBounds.minY + projectedBounds.maxY) / 2;
          const diff = match.position - currentCenterY;
          const absDiff = Math.abs(diff);
          if (absDiff < snapThreshold) {
            bestSnapY = selectBestCandidate(bestSnapY, { offset: diff, absDiff });
          }
        }
      });

      // Check distance guidelines for snap (matching existing distances between elements).
      // Skip two-element matches because those are handled by the virtual snap logic.
      distanceMatches.forEach((match: DistanceGuidelineMatch) => {
        const isTwoElementCase =
          match.referenceStart === match.currentStart &&
          match.referenceEnd === match.currentEnd;
        if (isTwoElementCase) return;

        const currentGap = match.currentEnd - match.currentStart;
        const diff = match.distance - currentGap;
        const absDiff = Math.abs(diff);
        if (absDiff >= snapThreshold) return;

        if (match.axis === 'horizontal') {
          bestSnapX = selectBestCandidate(bestSnapX, { offset: diff, absDiff });
        } else if (match.axis === 'vertical') {
          bestSnapY = selectBestCandidate(bestSnapY, { offset: diff, absDiff });
        }
      });

      // Virtual distance snap to multiples (when distance guidelines are enabled)
      // This handles both:
      // 1. Two-element case: snap the direct distance between elements to multiples
      // 2. Multi-element case: snap when no exact distance match exists
      // Also collect virtual distance matches for visual feedback
      const virtualDistanceMatches: DistanceGuidelineMatch[] = [];
      const allowVirtualSnapX = bestSnapX === null;
      const allowVirtualSnapY = bestSnapY === null;

      if (guidelines.distanceEnabled && GUIDELINES_DISTANCE_SNAP_MULTIPLE > 0) {
        if (allowVirtualSnapX || allowVirtualSnapY) {
          distanceMatches.forEach((match: DistanceGuidelineMatch) => {
            const currentGap = match.currentEnd - match.currentStart;
            const candidate = getNearestMultipleCandidate(currentGap);
            if (!candidate) return;

            const virtualMatch: DistanceGuidelineMatch = {
              ...match,
              distance: candidate.nearestMultiple,
              currentEnd: match.currentStart + candidate.nearestMultiple,
            };

            if (match.axis === 'horizontal' && allowVirtualSnapX) {
              bestSnapX = selectBestCandidate(bestSnapX, {
                offset: candidate.diff,
                absDiff: candidate.absDiff,
                virtualMatch,
              });
            } else if (match.axis === 'vertical' && allowVirtualSnapY) {
              bestSnapY = selectBestCandidate(bestSnapY, {
                offset: candidate.diff,
                absDiff: candidate.absDiff,
                virtualMatch,
              });
            }
          });
        }

        // If no suitable virtual distance came from existing matches, check nearby elements directly.
        if ((allowVirtualSnapX && !bestSnapX) || (allowVirtualSnapY && !bestSnapY)) {
          const storeState = get() as unknown as {
            elements: Array<{ id: string; type: string; data: PathData }>;
            selectedIds: string[];
            isElementHidden: (id: string) => boolean;
          };
          const { elements, selectedIds, isElementHidden } = storeState;

          if (elements && selectedIds) {
            const excludeSet = new Set(selectedIds);
            const currentElementId = selectedIds[0] || 'current';

            const boundsMap = precomputedBoundsMap ?? calculateElementBoundsMap(
              elements,
              Array.from(excludeSet),
              viewport.zoom,
              { includeStroke: true, isElementHidden }
            );

            boundsMap.forEach((boundsInfo) => {
              const { id: refElementId, bounds } = boundsInfo;

              if (allowVirtualSnapX && bounds.maxX < projectedBounds.minX) {
                const gap = projectedBounds.minX - bounds.maxX;
                const candidate = getNearestMultipleCandidate(gap);
                if (candidate) {
                  bestSnapX = selectBestCandidate(bestSnapX, {
                    offset: candidate.diff,
                    absDiff: candidate.absDiff,
                    virtualMatch: {
                      axis: 'horizontal',
                      distance: candidate.nearestMultiple,
                      referenceStart: bounds.maxX,
                      referenceEnd: bounds.maxX + candidate.nearestMultiple,
                      referenceElementIds: [refElementId, currentElementId],
                      currentStart: bounds.maxX,
                      currentEnd: bounds.maxX + candidate.nearestMultiple,
                      currentElementId,
                    },
                  });
                }
              }

              if (allowVirtualSnapX && bounds.minX > projectedBounds.maxX) {
                const gap = bounds.minX - projectedBounds.maxX;
                const candidate = getNearestMultipleCandidate(gap);
                if (candidate) {
                  bestSnapX = selectBestCandidate(bestSnapX, {
                    offset: -candidate.diff,
                    absDiff: candidate.absDiff,
                    virtualMatch: {
                      axis: 'horizontal',
                      distance: candidate.nearestMultiple,
                      referenceStart: bounds.minX - candidate.nearestMultiple,
                      referenceEnd: bounds.minX,
                      referenceElementIds: [currentElementId, refElementId],
                      currentStart: bounds.minX - candidate.nearestMultiple,
                      currentEnd: bounds.minX,
                      currentElementId,
                    },
                  });
                }
              }

              if (allowVirtualSnapY && bounds.maxY < projectedBounds.minY) {
                const gap = projectedBounds.minY - bounds.maxY;
                const candidate = getNearestMultipleCandidate(gap);
                if (candidate) {
                  bestSnapY = selectBestCandidate(bestSnapY, {
                    offset: candidate.diff,
                    absDiff: candidate.absDiff,
                    virtualMatch: {
                      axis: 'vertical',
                      distance: candidate.nearestMultiple,
                      referenceStart: bounds.maxY,
                      referenceEnd: bounds.maxY + candidate.nearestMultiple,
                      referenceElementIds: [refElementId, currentElementId],
                      currentStart: bounds.maxY,
                      currentEnd: bounds.maxY + candidate.nearestMultiple,
                      currentElementId,
                    },
                  });
                }
              }

              if (allowVirtualSnapY && bounds.minY > projectedBounds.maxY) {
                const gap = bounds.minY - projectedBounds.maxY;
                const candidate = getNearestMultipleCandidate(gap);
                if (candidate) {
                  bestSnapY = selectBestCandidate(bestSnapY, {
                    offset: -candidate.diff,
                    absDiff: candidate.absDiff,
                    virtualMatch: {
                      axis: 'vertical',
                      distance: candidate.nearestMultiple,
                      referenceStart: bounds.minY - candidate.nearestMultiple,
                      referenceEnd: bounds.minY,
                      referenceElementIds: [currentElementId, refElementId],
                      currentStart: bounds.minY - candidate.nearestMultiple,
                      currentEnd: bounds.minY,
                      currentElementId,
                    },
                  });
                }
              }
            });
          }
        }

        // bestSnapX/Y may have been mutated inside forEach callbacks above;
        // re-read them with explicit type to avoid TS narrowing from the enclosing guard
        const mutatedSnapX = bestSnapX as SnapCandidate | null;
        const mutatedSnapY = bestSnapY as SnapCandidate | null;

        if (mutatedSnapX?.virtualMatch) {
          virtualDistanceMatches.push(mutatedSnapX.virtualMatch);
        }
        if (mutatedSnapY?.virtualMatch) {
          virtualDistanceMatches.push(mutatedSnapY.virtualMatch);
        }

        // Update state with virtual distance matches if we found any.
        if (virtualDistanceMatches.length > 0) {
          set(current => ({
            guidelines: {
              ...current.guidelines,
              currentDistanceMatches: virtualDistanceMatches,
            },
          }));
        }
      }

      let snapOffsetX = (bestSnapX as SnapCandidate | null)?.offset ?? 0;
      let snapOffsetY = (bestSnapY as SnapCandidate | null)?.offset ?? 0;
      let hasSnapX = Boolean(bestSnapX);
      let hasSnapY = Boolean(bestSnapY);

      // Handle sticky state
      const currentSticky = guidelines.stickyState;
      let newStickyOffsetX = currentSticky.stickyOffset.x;
      let newStickyOffsetY = currentSticky.stickyOffset.y;
      let isSticky = currentSticky.isSticky;

      if (hasSnapX || hasSnapY) {
        if (!isSticky) {
          newStickyOffsetX = 0;
          newStickyOffsetY = 0;
          isSticky = true;
        }
        
        if (hasSnapX) {
          const intendedMovement = deltaX;
          const actualMovement = deltaX + snapOffsetX;
          newStickyOffsetX += (intendedMovement - actualMovement);
        }
        
        if (hasSnapY) {
          const intendedMovement = deltaY;
          const actualMovement = deltaY + snapOffsetY;
          newStickyOffsetY += (intendedMovement - actualMovement);
        }

        if (Math.abs(newStickyOffsetX) > stickyThreshold) {
          hasSnapX = false;
          snapOffsetX = 0;
          newStickyOffsetX = 0;
        }
        
        if (Math.abs(newStickyOffsetY) > stickyThreshold) {
          hasSnapY = false;
          snapOffsetY = 0;
          newStickyOffsetY = 0;
        }
        
        if (!hasSnapX && !hasSnapY) {
          isSticky = false;
        }

        set(current => ({
          guidelines: {
            ...current.guidelines,
            stickyState: {
              isSticky,
              stickyOffset: { x: newStickyOffsetX, y: newStickyOffsetY },
              lastStickyTime: Date.now(),
            },
          },
        }));
      } else if (isSticky) {
        set(current => ({
          guidelines: {
            ...current.guidelines,
            stickyState: {
              isSticky: false,
              stickyOffset: { x: 0, y: 0 },
              lastStickyTime: 0,
            },
          },
        }));
      }

      return {
        x: hasSnapX ? deltaX + snapOffsetX : deltaX,
        y: hasSnapY ? deltaY + snapOffsetY : deltaY,
        snapped: hasSnapX || hasSnapY,
      };
    },



    // Snap resize bounds to guidelines
    snapResizeBounds: (elementId, newBounds, _originalBounds, handle) => {
      const state = get();
      const { guidelines } = state;
      const fullState = get() as unknown as { 
        elements: { id: string; type: string; data: unknown }[];
        viewport: { zoom: number; panX: number; panY: number };
        isElementHidden: (id: string) => boolean;
      };

      if (!guidelines.enabled) {
        return { 
          snappedBounds: newBounds, 
          didSnap: false, 
          snapX: null, 
          snapY: null 
        };
      }

      const { elements, viewport, isElementHidden } = fullState;
      if (!elements || !viewport) {
        return { 
          snappedBounds: newBounds, 
          didSnap: false, 
          snapX: null, 
          snapY: null 
        };
      }

      const snapThreshold = guidelines.snapThreshold / viewport.zoom;
      
      // Calculate element bounds map excluding current element
      const elementBoundsMap = calculateElementBoundsMap(elements, [elementId], viewport.zoom, { includeStroke: true, isElementHidden });
      
      const snappedBounds = { ...newBounds };
      let didSnap = false;
      let snapX: number | null = null;
      let snapY: number | null = null;
      
      // Collect snap targets from other elements and manual guides
      const horizontalTargets: number[] = [];
      const verticalTargets: number[] = [];
      
      // Add targets from other elements
      elementBoundsMap.forEach((boundsInfo, id) => {
        if (id === elementId) return;
        const b = boundsInfo.bounds;
        horizontalTargets.push(b.minX, b.maxX, (b.minX + b.maxX) / 2);
        verticalTargets.push(b.minY, b.maxY, (b.minY + b.maxY) / 2);
      });
      
      // Add targets from manual guides
      guidelines.manualGuides.forEach((guide: ManualGuide) => {
        if (!guide.locked) {
          if (guide.type === 'vertical') {
            horizontalTargets.push(guide.position);
          } else {
            verticalTargets.push(guide.position);
          }
        }
      });
      
      // Determine which edges to snap based on handle
      const handleLower = handle.toLowerCase();
      const snapLeft = handleLower.includes('l') || handleLower.includes('left');
      const snapRight = handleLower.includes('r') || handleLower.includes('right') || handleLower.includes('br') || handleLower.includes('tr');
      const snapTop = handleLower.includes('t') || handleLower.includes('top');
      const snapBottom = handleLower.includes('b') || handleLower.includes('bottom');
      
      // Check horizontal snapping (X axis)
      if (snapLeft) {
        for (const target of horizontalTargets) {
          const diff = target - newBounds.minX;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.minX = target;
            snapX = target;
            didSnap = true;
            break;
          }
        }
      } else if (snapRight) {
        for (const target of horizontalTargets) {
          const diff = target - newBounds.maxX;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.maxX = target;
            snapX = target;
            didSnap = true;
            break;
          }
        }
      }
      
      // Check vertical snapping (Y axis)
      if (snapTop) {
        for (const target of verticalTargets) {
          const diff = target - newBounds.minY;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.minY = target;
            snapY = target;
            didSnap = true;
            break;
          }
        }
      } else if (snapBottom) {
        for (const target of verticalTargets) {
          const diff = target - newBounds.maxY;
          if (Math.abs(diff) < snapThreshold) {
            snappedBounds.maxY = target;
            snapY = target;
            didSnap = true;
            break;
          }
        }
      }
      
      // For corner handles, check center snapping too
      if (handleLower.includes('corner')) {
        const newCenterX = (snappedBounds.minX + snappedBounds.maxX) / 2;
        const newCenterY = (snappedBounds.minY + snappedBounds.maxY) / 2;
        const newWidth = snappedBounds.maxX - snappedBounds.minX;
        const newHeight = snappedBounds.maxY - snappedBounds.minY;
        
        // Check center X alignment
        for (const target of horizontalTargets) {
          const diff = target - newCenterX;
          if (Math.abs(diff) < snapThreshold && !snapX) {
            // Adjust both edges to maintain width while centering
            snappedBounds.minX = target - newWidth / 2;
            snappedBounds.maxX = target + newWidth / 2;
            snapX = target;
            didSnap = true;
            break;
          }
        }
        
        // Check center Y alignment
        for (const target of verticalTargets) {
          const diff = target - newCenterY;
          if (Math.abs(diff) < snapThreshold && !snapY) {
            // Adjust both edges to maintain height while centering
            snappedBounds.minY = target - newHeight / 2;
            snappedBounds.maxY = target + newHeight / 2;
            snapY = target;
            didSnap = true;
            break;
          }
        }
      }
      
      // Update guidelines state with snap info if we snapped
      if (didSnap) {
        const matches = state.findAlignmentGuidelines(elementId, snappedBounds);
        set(current => ({
          guidelines: {
            ...current.guidelines,
            currentMatches: matches,
          },
        }));
      }
      
      return { snappedBounds, didSnap, snapX, snapY };
    },

    // Ruler interaction
    startDraggingGuide: (type, position) => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          isDraggingGuide: true,
          draggingGuideType: type,
          draggingGuidePosition: position,
        },
      }));
    },

    updateDraggingGuide: (position) => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          draggingGuidePosition: position,
        },
      }));
    },

    finishDraggingGuide: () => {
      const state = get();
      const { guidelines } = state;
      
      if (guidelines.isDraggingGuide && guidelines.draggingGuideType && guidelines.draggingGuidePosition !== null) {
        state.addManualGuide(guidelines.draggingGuideType, guidelines.draggingGuidePosition);
      }
      
      set(current => ({
        guidelines: {
          ...current.guidelines,
          isDraggingGuide: false,
          draggingGuideType: null,
          draggingGuidePosition: null,
        },
      }));
    },

    cancelDraggingGuide: () => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          isDraggingGuide: false,
          draggingGuideType: null,
          draggingGuidePosition: null,
        },
      }));
    },

    // Clear all guidelines
    clearGuidelines: () => {
      set(current => ({
        guidelines: {
          ...current.guidelines,
          currentMatches: [],
          currentDistanceMatches: [],
          currentSizeMatches: [],
          stickyState: {
            isSticky: false,
            stickyOffset: { x: 0, y: 0 },
            lastStickyTime: 0,
          },
        },
      }));
    },
  };
};
