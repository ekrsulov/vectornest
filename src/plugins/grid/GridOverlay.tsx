import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import type { GridType, WarpParams } from './slice';

interface GridOverlayProps {
  grid: {
    enabled: boolean;
    type: GridType;
    spacing: number;
    showRulers: boolean;
    polarDivisions?: number;
    hexOrientation?: 'pointy' | 'flat';
    opacity?: number;
    color?: string;
    emphasizeEvery?: number;
    parametricStepY?: number;
    parametricWarp?: WarpParams;
  };
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
}

/**
 * Extract RGB values from a color string (hex or rgba)
 */
function extractRGB(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    // Hex color
    return {
      r: parseInt(color.slice(1, 3), 16),
      g: parseInt(color.slice(3, 5), 16),
      b: parseInt(color.slice(5, 7), 16),
    };
  } else if (color.startsWith('rgba(')) {
    // RGBA color
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
      };
    }
  }
  // Fallback to black
  return { r: 0, g: 0, b: 0 };
}

/**
 * Calculate optimal interval for grid emphasis based on spacing and zoom.
 */
function calculateMajorInterval(spacing: number, zoom: number): number {
  const baseSpacing = spacing;
  const minScreenSpacing = 50;
  const multipliers = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  
  for (const multiplier of multipliers) {
    const intervalSpacing = baseSpacing * multiplier;
    const screenSpacing = intervalSpacing * zoom;
    
    if (screenSpacing >= minScreenSpacing) {
      return intervalSpacing;
    }
  }
  
  return baseSpacing * multipliers[multipliers.length - 1];
}

/**
 * Render square/rectangular grid
 */
function renderSquareGrid(
  spacing: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  majorInterval: number,
  emphasizeEvery: number,
  opacity: number,
  color: string,
  zoom: number
): React.ReactElement {
  let minorPathData = '';
  let majorPathData = '';
  let emphasizedPathData = '';

  // Vertical lines
  const startX = Math.floor(left / spacing) * spacing;
  const endX = Math.ceil(right / spacing) * spacing;
  let xIndex = Math.floor(startX / spacing);

  for (let x = startX; x <= endX; x += spacing, xIndex++) {
    const isMajor = Math.abs(x % majorInterval) < spacing / 2;
    const isEmphasized = emphasizeEvery > 0 && xIndex % emphasizeEvery === 0;
    
    if (isEmphasized) {
      emphasizedPathData += `M ${x} ${top} L ${x} ${bottom} `;
    } else if (isMajor) {
      majorPathData += `M ${x} ${top} L ${x} ${bottom} `;
    } else {
      minorPathData += `M ${x} ${top} L ${x} ${bottom} `;
    }
  }

  // Horizontal lines
  const startY = Math.floor(top / spacing) * spacing;
  const endY = Math.ceil(bottom / spacing) * spacing;
  let yIndex = Math.floor(startY / spacing);

  for (let y = startY; y <= endY; y += spacing, yIndex++) {
    const isMajor = Math.abs(y % majorInterval) < spacing / 2;
    const isEmphasized = emphasizeEvery > 0 && yIndex % emphasizeEvery === 0;
    
    if (isEmphasized) {
      emphasizedPathData += `M ${left} ${y} L ${right} ${y} `;
    } else if (isMajor) {
      majorPathData += `M ${left} ${y} L ${right} ${y} `;
    } else {
      minorPathData += `M ${left} ${y} L ${right} ${y} `;
    }
  }

  const { r, g, b } = extractRGB(color);
  const minorColor = `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`;
  const majorColor = `rgba(${r}, ${g}, ${b}, ${opacity * 0.5})`;
  const emphasizedColor = `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`;

  return (
    <g>
      {minorPathData && (
        <path
          d={minorPathData}
          stroke={minorColor}
          strokeWidth={0.5 / zoom}
          pointerEvents="none"
          fill="none"
        />
      )}
      {majorPathData && (
        <path
          d={majorPathData}
          stroke={majorColor}
          strokeWidth={1 / zoom}
          pointerEvents="none"
          fill="none"
        />
      )}
      {emphasizedPathData && (
        <path
          d={emphasizedPathData}
          stroke={emphasizedColor}
          strokeWidth={1.5 / zoom}
          pointerEvents="none"
          fill="none"
        />
      )}
    </g>
  );
}

/**
 * Render dot grid
 */
function renderDotGrid(
  spacing: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  opacity: number,
  color: string,
  zoom: number
): React.ReactElement {
  const startX = Math.floor(left / spacing) * spacing;
  const endX = Math.ceil(right / spacing) * spacing;
  const startY = Math.floor(top / spacing) * spacing;
  const endY = Math.ceil(bottom / spacing) * spacing;

  const { r, g, b } = extractRGB(color);
  const dotColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  
  // Calculate dot radius based on zoom - minimum 1.5px, maximum 3px on screen
  const dotRadius = Math.max(1.5 / zoom, Math.min(3 / zoom, 2 / zoom));
  
  // Generate a unique pattern ID to avoid conflicts
  const patternId = `dot-grid-pattern-${Math.random().toString(36).substr(2, 9)}`;
  
  // Use SVG pattern for optimal performance with repeated elements
  return (
    <g pointerEvents="none">
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={0}
            cy={0}
            r={dotRadius}
            fill={dotColor}
          />
        </pattern>
      </defs>
      <rect
        x={startX}
        y={startY}
        width={endX - startX}
        height={endY - startY}
        fill={`url(#${patternId})`}
      />
    </g>
  );
}

/**
 * Render isometric grid (60°/120°)
 */
function renderIsometricGrid(
  spacing: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  opacity: number,
  color: string,
  zoom: number
): React.ReactElement {
  let pathData = '';
  
  const cos30 = Math.cos(Math.PI / 6);
  const tan30 = Math.tan(Math.PI / 6);
  
  const { r, g, b } = extractRGB(color);
  const gridColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  const extension = Math.max(right - left, bottom - top) * 2;

  // Vertical lines at x = n * spacing
  const startX = Math.floor(left / spacing) * spacing;
  const endX = Math.ceil(right / spacing) * spacing;
  
  for (let x = startX; x <= endX; x += spacing) {
    pathData += `M ${x} ${top - extension} L ${x} ${bottom + extension} `;
  }

  // 60° lines (slope = tan(30°)): y - tan30*x = n*spacing60
  // where spacing60 = spacing / cos30 * tan30 = spacing * tan30 / cos30
  const step60 = spacing / cos30;
  const spacing60 = step60 * tan30;
  
  // Find visible range of lines
  const minConst60 = Math.min(
    top - tan30 * left,
    top - tan30 * right,
    bottom - tan30 * left,
    bottom - tan30 * right
  );
  const maxConst60 = Math.max(
    top - tan30 * left,
    top - tan30 * right,
    bottom - tan30 * left,
    bottom - tan30 * right
  );
  
  const startConst60 = Math.floor(minConst60 / spacing60) * spacing60;
  const endConst60 = Math.ceil(maxConst60 / spacing60) * spacing60;
  
  for (let c = startConst60; c <= endConst60; c += spacing60) {
    // Line: y = tan30 * x + c
    const x1 = left - extension;
    const y1 = tan30 * x1 + c;
    const x2 = right + extension;
    const y2 = tan30 * x2 + c;
    
    pathData += `M ${x1} ${y1} L ${x2} ${y2} `;
  }

  // 120° lines (slope = -tan(30°)): y + tan30*x = n*spacing60
  const minConst120 = Math.min(
    top + tan30 * left,
    top + tan30 * right,
    bottom + tan30 * left,
    bottom + tan30 * right
  );
  const maxConst120 = Math.max(
    top + tan30 * left,
    top + tan30 * right,
    bottom + tan30 * left,
    bottom + tan30 * right
  );
  
  const startConst120 = Math.floor(minConst120 / spacing60) * spacing60;
  const endConst120 = Math.ceil(maxConst120 / spacing60) * spacing60;
  
  for (let c = startConst120; c <= endConst120; c += spacing60) {
    // Line: y = -tan30 * x + c
    const x1 = left - extension;
    const y1 = -tan30 * x1 + c;
    const x2 = right + extension;
    const y2 = -tan30 * x2 + c;
    
    pathData += `M ${x1} ${y1} L ${x2} ${y2} `;
  }

  return (
    <path
      d={pathData}
      stroke={gridColor}
      strokeWidth={0.5 / zoom}
      pointerEvents="none"
      fill="none"
    />
  );
}

/**
 * Render triangular grid
 */
function renderTriangularGrid(
  spacing: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  opacity: number,
  color: string,
  zoom: number
): React.ReactElement {
  let pathData = '';
  
  const height = spacing * Math.sqrt(3) / 2;
  const tan60 = Math.sqrt(3); // tan(60°) = sqrt(3)
  const { r, g, b } = extractRGB(color);
  const gridColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  const extension = Math.max(right - left, bottom - top) * 2;

  // Horizontal lines at y = n * height
  const startY = Math.floor(top / height) * height;
  const endY = Math.ceil(bottom / height) * height;
  
  for (let y = startY; y <= endY; y += height) {
    pathData += `M ${left - extension} ${y} L ${right + extension} ${y} `;
  }

  // 60° lines (slope = tan(60°) = sqrt(3))
  // Lines where: y - tan60*x = n*spacing (constant along each line)
  const spacing60 = spacing * tan60;
  
  const minConst60 = Math.min(
    top - tan60 * left,
    top - tan60 * right,
    bottom - tan60 * left,
    bottom - tan60 * right
  );
  const maxConst60 = Math.max(
    top - tan60 * left,
    top - tan60 * right,
    bottom - tan60 * left,
    bottom - tan60 * right
  );
  
  const startConst60 = Math.floor(minConst60 / spacing60) * spacing60;
  const endConst60 = Math.ceil(maxConst60 / spacing60) * spacing60;
  
  for (let c = startConst60; c <= endConst60; c += spacing60) {
    // Line: y = tan60 * x + c
    const x1 = left - extension;
    const y1 = tan60 * x1 + c;
    const x2 = right + extension;
    const y2 = tan60 * x2 + c;
    
    pathData += `M ${x1} ${y1} L ${x2} ${y2} `;
  }

  // 120° lines (slope = -tan(60°) = -sqrt(3))
  // Lines where: y + tan60*x = n*spacing (constant along each line)
  const minConst120 = Math.min(
    top + tan60 * left,
    top + tan60 * right,
    bottom + tan60 * left,
    bottom + tan60 * right
  );
  const maxConst120 = Math.max(
    top + tan60 * left,
    top + tan60 * right,
    bottom + tan60 * left,
    bottom + tan60 * right
  );
  
  const startConst120 = Math.floor(minConst120 / spacing60) * spacing60;
  const endConst120 = Math.ceil(maxConst120 / spacing60) * spacing60;
  
  for (let c = startConst120; c <= endConst120; c += spacing60) {
    // Line: y = -tan60 * x + c
    const x1 = left - extension;
    const y1 = -tan60 * x1 + c;
    const x2 = right + extension;
    const y2 = -tan60 * x2 + c;
    
    pathData += `M ${x1} ${y1} L ${x2} ${y2} `;
  }

  return (
    <path
      d={pathData}
      stroke={gridColor}
      strokeWidth={0.5 / zoom}
      pointerEvents="none"
      fill="none"
    />
  );
}

/**
 * Render polar grid
 */
function renderPolarGrid(
  spacing: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  divisions: number,
  opacity: number,
  color: string,
  zoom: number
): React.ReactElement {
  const { r, g, b } = extractRGB(color);
  const gridColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  const elements: React.ReactElement[] = [];

  // Use origin (0, 0) as center for polar grid
  const centerX = 0;
  const centerY = 0;
  
  // Calculate maximum radius needed to cover the viewport
  const maxRadius = Math.sqrt(
    Math.max(
      Math.pow(right - centerX, 2) + Math.pow(bottom - centerY, 2),
      Math.pow(right - centerX, 2) + Math.pow(top - centerY, 2),
      Math.pow(left - centerX, 2) + Math.pow(bottom - centerY, 2),
      Math.pow(left - centerX, 2) + Math.pow(top - centerY, 2)
    )
  );

  // Concentric circles
  let index = 0;
  for (let radius = spacing; radius <= maxRadius; radius += spacing) {
    elements.push(
      <circle
        key={`circle-${index++}`}
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="none"
        stroke={gridColor}
        strokeWidth={0.5 / zoom}
        pointerEvents="none"
      />
    );
  }

  // Radial lines
  const angleStep = (Math.PI * 2) / divisions;
  let pathData = '';
  
  for (let i = 0; i < divisions; i++) {
    const angle = i * angleStep;
    const x2 = centerX + maxRadius * Math.cos(angle);
    const y2 = centerY + maxRadius * Math.sin(angle);
    pathData += `M ${centerX} ${centerY} L ${x2} ${y2} `;
  }

  elements.push(
    <path
      key="radial-lines"
      d={pathData}
      stroke={gridColor}
      strokeWidth={0.5 / zoom}
      pointerEvents="none"
      fill="none"
    />
  );

  return <g>{elements}</g>;
}

/**
 * Render diagonal grid (45°)
 */
function renderDiagonalGrid(
  spacing: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  opacity: number,
  color: string,
  zoom: number
): React.ReactElement {
  let pathData = '';
  
  const { r, g, b } = extractRGB(color);
  const gridColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  const extension = Math.max(right - left, bottom - top) * 2;

  // 45° lines pass through points where y - x = n*spacing (for integer n)
  // Find which lines are visible in the viewport
  const minDiff = Math.min(top - right, bottom - left, top - left, bottom - right);
  const maxDiff = Math.max(top - right, bottom - left, top - left, bottom - right);
  
  const startDiff = Math.floor(minDiff / spacing) * spacing;
  const endDiff = Math.ceil(maxDiff / spacing) * spacing;
  
  // Draw 45° lines (slope = 1, constant: y - x)
  for (let diff = startDiff; diff <= endDiff; diff += spacing) {
    // Line equation: y = x + diff
    // Find a point on this line to start from
    const x1 = left - extension;
    const y1 = x1 + diff;
    const x2 = right + extension;
    const y2 = x2 + diff;
    
    pathData += `M ${x1} ${y1} L ${x2} ${y2} `;
  }

  // 135° lines pass through points where y + x = n*spacing (for integer n)
  const minSum = Math.min(top + left, top + right, bottom + left, bottom + right);
  const maxSum = Math.max(top + left, top + right, bottom + left, bottom + right);
  
  const startSum = Math.floor(minSum / spacing) * spacing;
  const endSum = Math.ceil(maxSum / spacing) * spacing;

  // Draw 135° lines (slope = -1, constant: y + x)
  for (let sum = startSum; sum <= endSum; sum += spacing) {
    // Line equation: y = -x + sum
    const x1 = left - extension;
    const y1 = -x1 + sum;
    const x2 = right + extension;
    const y2 = -x2 + sum;
    
    pathData += `M ${x1} ${y1} L ${x2} ${y2} `;
  }

  return (
    <path
      d={pathData}
      stroke={gridColor}
      strokeWidth={0.5 / zoom}
      pointerEvents="none"
      fill="none"
    />
  );
}

/**
 * Render parametric lattice (warped grid)
 */
function renderParametricGrid(
  stepX: number,
  stepY: number,
  left: number,
  right: number,
  top: number,
  bottom: number,
  warp: WarpParams,
  opacity: number,
  color: string,
  zoom: number
): React.ReactElement {
  const { r, g, b } = extractRGB(color);
  const gridColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  
  // Helper: calculate displacement
  const calculateDisplacement = (x: number, y: number): { dx: number; dy: number } => {
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
        
        const swirlTurns = warp.swirlTurns ?? 0;
        const maxR = 500;
        const swirlAngle = angle + 2 * Math.PI * swirlTurns * (r / maxR);
        
        const windowFactor = 0.5 * (1 - Math.cos(Math.PI * Math.min(r / maxR, 1)));
        const mag = windowFactor * warp.ampX;
        
        return {
          dx: mag * Math.cos(swirlAngle),
          dy: mag * Math.sin(swirlAngle)
        };
      }
      
      case 'perlin2d': {
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

  let pathData = '';
  const maxSegmentLength = 10; // adaptive sampling
  
  // Vertical lines
  const startCol = Math.floor(left / stepX) - 1;
  const endCol = Math.ceil(right / stepX) + 1;
  
  for (let col = startCol; col <= endCol; col++) {
    const baseX = col * stepX;
    const points: string[] = [];
    
    // Sample along the vertical line
    for (let y = top - 100; y <= bottom + 100; y += maxSegmentLength) {
      const d = calculateDisplacement(baseX, y);
      const px = baseX + d.dx;
      const py = y + d.dy;
      points.push(`${px},${py}`);
    }
    
    if (points.length > 0) {
      pathData += `M ${points.join(' L ')} `;
    }
  }
  
  // Horizontal lines
  const startRow = Math.floor(top / stepY) - 1;
  const endRow = Math.ceil(bottom / stepY) + 1;
  
  for (let row = startRow; row <= endRow; row++) {
    const baseY = row * stepY;
    const points: string[] = [];
    
    // Sample along the horizontal line
    for (let x = left - 100; x <= right + 100; x += maxSegmentLength) {
      const d = calculateDisplacement(x, baseY);
      const px = x + d.dx;
      const py = baseY + d.dy;
      points.push(`${px},${py}`);
    }
    
    if (points.length > 0) {
      pathData += `M ${points.join(' L ')} `;
    }
  }

  return (
    <path
      d={pathData}
      stroke={gridColor}
      strokeWidth={0.5 / zoom}
      pointerEvents="none"
      fill="none"
    />
  );
}

export const GridOverlay: React.FC<GridOverlayProps> = React.memo(({
  grid,
  viewport,
  canvasSize,
}) => {
  const defaultGridColor = useColorModeValue('#000000', 'rgba(255, 255, 255, 0.7)');

  if (!grid.enabled) {
    return null;
  }

  const spacing = grid.spacing;
  const opacity = grid.opacity ?? 0.3;
  const color = grid.color === '#000000' ? defaultGridColor : (grid.color ?? defaultGridColor);
  const emphasizeEvery = grid.emphasizeEvery ?? 0;

  // ViewBox coordinates
  const padding = 1000;
  const viewBoxLeft = -viewport.panX / viewport.zoom;
  const viewBoxTop = -viewport.panY / viewport.zoom;
  const viewBoxRight = viewBoxLeft + canvasSize.width / viewport.zoom;
  const viewBoxBottom = viewBoxTop + canvasSize.height / viewport.zoom;
  
  const left = viewBoxLeft - padding;
  const right = viewBoxRight + padding;
  const top = viewBoxTop - padding;
  const bottom = viewBoxBottom + padding;

  // Calculate optimal interval for major grid lines
  const majorInterval = calculateMajorInterval(spacing, viewport.zoom);

  // Render grid based on type
  let gridElement: React.ReactElement | null = null;

  switch (grid.type) {
    case 'square':
      gridElement = renderSquareGrid(spacing, left, right, top, bottom, majorInterval, emphasizeEvery, opacity, color, viewport.zoom);
      break;
    
    case 'dots':
      gridElement = renderDotGrid(spacing, left, right, top, bottom, opacity, color, viewport.zoom);
      break;
    
    case 'isometric':
      gridElement = renderIsometricGrid(spacing, left, right, top, bottom, opacity, color, viewport.zoom);
      break;
    
    case 'triangular':
      gridElement = renderTriangularGrid(spacing, left, right, top, bottom, opacity, color, viewport.zoom);
      break;
    
    case 'polar':
      gridElement = renderPolarGrid(spacing, left, right, top, bottom, grid.polarDivisions ?? 12, opacity, color, viewport.zoom);
      break;
    
    case 'diagonal':
      gridElement = renderDiagonalGrid(spacing, left, right, top, bottom, opacity, color, viewport.zoom);
      break;
    
    case 'parametric':
      if (grid.parametricWarp) {
        const stepY = grid.parametricStepY ?? spacing;
        gridElement = renderParametricGrid(
          spacing, 
          stepY, 
          left, 
          right, 
          top, 
          bottom, 
          grid.parametricWarp, 
          opacity, 
          color, 
          viewport.zoom
        );
      }
      break;
  }

  return (
    <g>
      {gridElement}
    </g>
  );
});
