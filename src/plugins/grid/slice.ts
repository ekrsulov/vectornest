import type { StateCreator } from 'zustand';

export type GridType = 
  | 'square'           // Classic orthogonal grid
  | 'dots'            // Dot grid
  | 'isometric'       // 60°/120° isometric grid
  | 'triangular'      // Triangular/equilateral grid
  | 'polar'           // Polar with radial lines and concentric circles
  | 'diagonal'        // 45° diagonal overlay
  | 'parametric'      // Parametric lattice (warped grid)

export type WarpKind = 'sine2d' | 'perlin2d' | 'radial';

export interface WarpParams {
  kind: WarpKind;
  ampX: number;       // amplitude X (px)
  ampY: number;       // amplitude Y (px)
  freqX: number;      // cycles per tile width
  freqY: number;      // cycles per tile height
  phaseX?: number;    // radians
  phaseY?: number;    // radians
  seed?: number;      // for noise
  // Radial specific
  centerX?: number;
  centerY?: number;
  swirlTurns?: number;
}

export interface GridPluginSlice {
  // State
  grid: {
    enabled: boolean;
    snapEnabled: boolean;
    type: GridType;
    spacing: number; // pixels (main spacing/cell size)
    showRulers: boolean; // show coordinate labels
    // Specific settings for different grid types
    polarDivisions?: number; // For polar grid: number of radial divisions
    opacity?: number; // Grid opacity (0-1)
    color?: string; // Grid color
    emphasizeEvery?: number; // Emphasize every Nth line (0 = disabled)
    // Parametric lattice settings
    parametricStepY?: number; // Y spacing (if different from spacing/stepX)
    parametricWarp?: WarpParams; // warp field parameters
  };

  // Actions
  updateGridState: (state: Partial<GridPluginSlice['grid']>) => void;
  snapToGrid: (x: number, y: number) => { x: number; y: number };
}

export const createGridPluginSlice: StateCreator<GridPluginSlice, [], [], GridPluginSlice> = (set, get) => {
  // Helper function: Calculate displacement field D(x,y)
  const calculateDisplacement = (x: number, y: number, warp: WarpParams): { dx: number; dy: number } => {
    switch (warp.kind) {
      case 'sine2d': {
        const phaseX = warp.phaseX ?? 0;
        const phaseY = warp.phaseY ?? 0;
        const dx = warp.ampX * Math.sin(2 * Math.PI * warp.freqX * x / 1024 + phaseX) * 
                   Math.cos(2 * Math.PI * warp.freqY * y / 1024 + phaseY);
        const dy = warp.ampY * Math.cos(2 * Math.PI * warp.freqX * x / 1024 + phaseX) * 
                   Math.sin(2 * Math.PI * warp.freqY * y / 1024 + phaseY);
        return { dx, dy };
      }
      
      case 'radial': {
        const cx = warp.centerX ?? 0;
        const cy = warp.centerY ?? 0;
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Apply swirl if specified
        const swirlTurns = warp.swirlTurns ?? 0;
        const maxR = 500; // approximate max radius for normalization
        const swirlAngle = angle + 2 * Math.PI * swirlTurns * (r / maxR);
        
        // Radial displacement with Hann window
        const windowFactor = 0.5 * (1 - Math.cos(Math.PI * Math.min(r / maxR, 1)));
        const mag = windowFactor * warp.ampX; // use ampX as magnitude
        
        return {
          dx: mag * Math.cos(swirlAngle),
          dy: mag * Math.sin(swirlAngle)
        };
      }
      
      case 'perlin2d': {
        // Simplified Perlin-like noise (in production, use proper periodic Perlin)
        // For now, use a combination of sines to simulate noise
        const seed = warp.seed ?? 0;
        const s1 = Math.sin(x * 0.01 + seed) * Math.cos(y * 0.01 + seed);
        const s2 = Math.sin(x * 0.02 + seed * 1.3) * Math.cos(y * 0.015 + seed * 1.7);
        const s3 = Math.sin(x * 0.007 + seed * 2.1) * Math.cos(y * 0.009 + seed * 2.3);
        
        const noiseX = (s1 + 0.5 * s2 + 0.25 * s3) / 1.75;
        const noiseY = (s2 + 0.5 * s3 + 0.25 * s1) / 1.75;
        
        return {
          dx: warp.ampX * noiseX * warp.freqX / 3,
          dy: warp.ampY * noiseY * warp.freqY / 3
        };
      }
      
      default:
        return { dx: 0, dy: 0 };
    }
  };

  // Helper function: Inverse warp using fixed-point iteration
  const inverseWarp = (qx: number, qy: number, warp: WarpParams, iterations = 4): { x: number; y: number } => {
    let ux = qx;
    let uy = qy;
    
    for (let i = 0; i < iterations; i++) {
      const d = calculateDisplacement(ux, uy, warp);
      ux = qx - d.dx;
      uy = qy - d.dy;
    }
    
    return { x: ux, y: uy };
  };

  return {
    // Initial state
    grid: {
      enabled: false,
      snapEnabled: false,
      type: 'square',
      spacing: 20,
      showRulers: false,
      polarDivisions: 12,
      hexOrientation: 'pointy',
      opacity: 0.3,
      color: '#000000',
      emphasizeEvery: 0,
      parametricStepY: 20,
      parametricWarp: {
        kind: 'sine2d',
        ampX: 18,
        ampY: 18,
        freqX: 3,
        freqY: 2,
        phaseX: 0,
        phaseY: 1.047,
        seed: 0,
      },
    },

    // Actions
    updateGridState: (state) => {
      set((current) => ({
        grid: { ...current.grid, ...state },
      }));
    },

    snapToGrid: (x, y) => {
      const grid = get().grid;
      if (!grid.snapEnabled) {
        return { x, y };
      }

      const spacing = grid.spacing;

      switch (grid.type) {
        case 'square':
        case 'dots': {
          const snappedX = Math.round(x / spacing) * spacing;
          const snappedY = Math.round(y / spacing) * spacing;
          return { x: snappedX, y: snappedY };
        }

        case 'isometric': {
          // Isometric grid: 3 sets of parallel lines
          // 1. Vertical lines at x = n * spacing
          // 2. Lines at 60° from vertical (30° from horizontal) passing through (n*step60, 0)
          // 3. Lines at 120° from vertical (-30° from horizontal) passing through (n*step60, 0)
          
          const cos30 = Math.cos(Math.PI / 6); // sqrt(3)/2 ≈ 0.866
          const tan30 = Math.tan(Math.PI / 6); // 1/sqrt(3) ≈ 0.577
          
          const step60 = spacing / cos30; // ≈ 23.09 for spacing=20
          
          // 60° lines (slope = tan(30°)): pass through (n*step60, 0)
          // Equation: y = tan30 * (x - n*step60) => y = tan30*x - n*step60*tan30
          // Rearranging: y - tan30*x = -n*step60*tan30
          // So: (y - tan30*x) is constant for each line, spaced by step60*tan30
          
          const spacing60 = step60 * tan30; // vertical spacing between 60° lines
          const const60 = y - tan30 * x;
          const nearest60 = Math.round(const60 / spacing60) * spacing60;
          
          // 120° lines (slope = -tan(30°)): pass through (n*step60, 0)
          // Equation: y = -tan30 * (x - n*step60) => y = -tan30*x + n*step60*tan30
          // Rearranging: y + tan30*x = n*step60*tan30
          // So: (y + tan30*x) is constant for each line, spaced by step60*tan30
          
          const const120 = y + tan30 * x;
          const nearest120 = Math.round(const120 / spacing60) * spacing60;
          
          // Vertical lines
          const nearestVertical = Math.round(x / spacing) * spacing;
          
          // Find three possible intersections:
          // 1. Intersection of nearest 60° and 120° lines
          const x_diag = (nearest120 - nearest60) / (2 * tan30);
          const y_diag = tan30 * x_diag + nearest60;
          
          // 2. Intersection of nearest vertical and 60° line
          const y_vert60 = tan30 * nearestVertical + nearest60;
          
          // 3. Intersection of nearest vertical and 120° line
          const y_vert120 = -tan30 * nearestVertical + nearest120;
          
          // Find which intersection is closest
          const dist_diag = Math.hypot(x - x_diag, y - y_diag);
          const dist_vert60 = Math.hypot(x - nearestVertical, y - y_vert60);
          const dist_vert120 = Math.hypot(x - nearestVertical, y - y_vert120);
          
          if (dist_vert60 < dist_diag && dist_vert60 < dist_vert120) {
            return { x: nearestVertical, y: y_vert60 };
          } else if (dist_vert120 < dist_diag) {
            return { x: nearestVertical, y: y_vert120 };
          } else {
            return { x: x_diag, y: y_diag };
          }
        }

        case 'triangular': {
          // Triangular grid with horizontal lines and 60°/120° diagonals
          const height = spacing * Math.sqrt(3) / 2;
          const tan60 = Math.sqrt(3);
          const spacing60 = spacing * tan60;
          
          // Horizontal lines at y = n * height
          const nearestY = Math.round(y / height) * height;
          
          // 60° lines: y - tan60*x = n*spacing60
          const const60 = y - tan60 * x;
          const nearest60 = Math.round(const60 / spacing60) * spacing60;
          
          // 120° lines: y + tan60*x = n*spacing60
          const const120 = y + tan60 * x;
          const nearest120 = Math.round(const120 / spacing60) * spacing60;
          
          // Find three possible intersections:
          // 1. Intersection of nearest 60° and 120° lines
          const x_diag = (nearest120 - nearest60) / (2 * tan60);
          const y_diag = tan60 * x_diag + nearest60;
          
          // 2. Intersection of nearest horizontal and 60° line
          const x_horiz60 = (nearestY - nearest60) / tan60;
          const y_horiz60 = nearestY;
          
          // 3. Intersection of nearest horizontal and 120° line
          const x_horiz120 = -(nearestY - nearest120) / tan60;
          const y_horiz120 = nearestY;
          
          // Find which intersection is closest
          const dist_diag = Math.hypot(x - x_diag, y - y_diag);
          const dist_horiz60 = Math.hypot(x - x_horiz60, y - y_horiz60);
          const dist_horiz120 = Math.hypot(x - x_horiz120, y - y_horiz120);
          
          if (dist_horiz60 < dist_diag && dist_horiz60 < dist_horiz120) {
            return { x: x_horiz60, y: y_horiz60 };
          } else if (dist_horiz120 < dist_diag) {
            return { x: x_horiz120, y: y_horiz120 };
          } else {
            return { x: x_diag, y: y_diag };
          }
        }

        case 'polar': {
          // Polar grid: snap to radial lines and circular rings
          const divisions = grid.polarDivisions || 12;
          const angleStep = (Math.PI * 2) / divisions;
          
          const dx = x;
          const dy = y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          
          // Snap distance to spacing intervals
          const snappedDistance = Math.round(distance / spacing) * spacing;
          
          // Snap angle to divisions
          const snappedAngle = Math.round(angle / angleStep) * angleStep;
          
          return {
            x: Math.cos(snappedAngle) * snappedDistance,
            y: Math.sin(snappedAngle) * snappedDistance
          };
        }

        case 'diagonal': {
          // 45° diagonal grid - lines at 45° and 135°
          // In the rendering, lines start from (offset, 0) where offset is a multiple of spacing
          // 45° lines pass through points (n*spacing, 0) with slope 1: y = x - n*spacing
          // 135° lines pass through points (m*spacing, 0) with slope -1: y = -x + m*spacing
          
          // Intersections occur where:
          // y = x - n*spacing and y = -x + m*spacing
          // Solving: x - n*spacing = -x + m*spacing
          // 2x = (m + n)*spacing
          // x = (m + n)*spacing/2
          // y = (m - n)*spacing/2
          
          // So intersections are at ((m+n)*spacing/2, (m-n)*spacing/2) where m,n are integers
          // This means intersections are on a grid with spacing/2 in diagonal directions
          
          // For snapping, we need to find which intersection is closest
          // Using the fact that y-x = -n*spacing and y+x = m*spacing at intersections
          
          const diff = y - x; // Constant along 45° lines
          const sum = y + x;   // Constant along 135° lines
          
          // Round to nearest line (lines are spaced 'spacing' apart)
          const nearestDiff = Math.round(diff / spacing) * spacing;
          const nearestSum = Math.round(sum / spacing) * spacing;
          
          // Calculate intersection point
          // y - x = nearestDiff  =>  y = x + nearestDiff
          // y + x = nearestSum   =>  y = -x + nearestSum
          // Adding: 2y = nearestDiff + nearestSum
          const snappedY = (nearestDiff + nearestSum) / 2;
          const snappedX = (nearestSum - nearestDiff) / 2;
          
          return { x: snappedX, y: snappedY };
        }

        case 'parametric': {
          // Parametric lattice with warp field
          const stepX = spacing;
          const stepY = grid.parametricStepY ?? spacing;
          const warp = grid.parametricWarp;
          
          if (!warp) {
            // Fallback to simple orthogonal if no warp defined
            return {
              x: Math.round(x / stepX) * stepX,
              y: Math.round(y / stepY) * stepY
            };
          }
          
          // Inverse warp to find base coordinates
          const u = inverseWarp(x, y, warp);
          
          // Snap in base grid
          const ux = Math.round(u.x / stepX) * stepX;
          const uy = Math.round(u.y / stepY) * stepY;
          
          // Re-apply warp to snapped base point
          const d = calculateDisplacement(ux, uy, warp);
          
          return {
            x: ux + d.dx,
            y: uy + d.dy
          };
        }

        default:
          return { x, y };
      }
    },
  };
};
