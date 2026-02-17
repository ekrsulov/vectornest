import React, { useId, useMemo } from 'react';
import { useColorMode } from '@chakra-ui/react';

interface LassoOverlayProps {
  lassoPath: Array<{ x: number; y: number }>;
  lassoClosed: boolean;
  viewport: { zoom: number };
}

export const LassoOverlay: React.FC<LassoOverlayProps> = ({ lassoPath, lassoClosed, viewport }) => {
  const { colorMode } = useColorMode();
  const gradientId = useId();
  const glowFilterId = useId();
  const dashAnimationId = useId();

  // Calculate total path length for dash animation
  const pathLength = useMemo(() => {
    if (lassoPath.length < 2) return 0;
    let length = 0;
    for (let i = 1; i < lassoPath.length; i++) {
      const dx = lassoPath[i].x - lassoPath[i - 1].x;
      const dy = lassoPath[i].y - lassoPath[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }, [lassoPath]);

  if (lassoPath.length < 2) {
    return null;
  }

  // Convert points to SVG path
  const pathData = lassoPath.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${acc} L ${point.x} ${point.y}`;
  }, '');

  // Close the path only if lasso is closed
  const finalPath = lassoClosed ? `${pathData} Z` : pathData;

  // Dynamic colors based on theme
  const isDark = colorMode === 'dark';
  
  // Gradient colors - vibrant cyan/purple in dark mode, blue/indigo in light mode
  const gradientStart = isDark ? '#06b6d4' : '#3b82f6'; // cyan-500 / blue-500
  const gradientEnd = isDark ? '#a855f7' : '#6366f1';   // purple-500 / indigo-500
  
  // Glow color
  const glowColor = isDark ? 'rgba(6, 182, 212, 0.6)' : 'rgba(59, 130, 246, 0.4)';
  
  // Fill color when closed - subtle gradient fill
  const fillColor = lassoClosed 
    ? (isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(99, 102, 241, 0.06)') 
    : 'none';

  // Calculate stroke width that stays consistent on screen
  const baseStrokeWidth = 2 / viewport.zoom;
  const glowStrokeWidth = 6 / viewport.zoom;
  
  // Dash pattern for marching ants effect
  const dashLength = 8 / viewport.zoom;
  const gapLength = 4 / viewport.zoom;
  
  // Animation duration based on path length (faster for shorter paths)
  const animationDuration = Math.max(0.5, Math.min(3, pathLength / 500));

  return (
    <g className="lasso-overlay" style={{ pointerEvents: 'none' }}>
      {/* Definitions for gradient, filter, and animation */}
      <defs>
        {/* Animated gradient along the path */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradientStart}>
            <animate
              attributeName="stop-color"
              values={`${gradientStart};${gradientEnd};${gradientStart}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor={gradientEnd}>
            <animate
              attributeName="stop-color"
              values={`${gradientEnd};${gradientStart};${gradientEnd}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor={gradientStart}>
            <animate
              attributeName="stop-color"
              values={`${gradientStart};${gradientEnd};${gradientStart}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        {/* Glow filter */}
        <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={2 / viewport.zoom} result="blur" />
          <feComposite in="blur" in2="SourceGraphic" operator="over" />
        </filter>

        {/* Keyframes for dash animation */}
        <style>
          {`
            @keyframes ${dashAnimationId} {
              from { stroke-dashoffset: ${dashLength + gapLength}; }
              to { stroke-dashoffset: 0; }
            }
          `}
        </style>
      </defs>

      {/* Background glow layer */}
      <path
        d={finalPath}
        fill="none"
        stroke={glowColor}
        strokeWidth={glowStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowFilterId})`}
        opacity={0.7}
      />

      {/* Fill when closed */}
      {lassoClosed && (
        <path
          d={finalPath}
          fill={fillColor}
          stroke="none"
        />
      )}

      {/* Main animated stroke with gradient */}
      <path
        d={finalPath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={baseStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${dashLength} ${gapLength}`}
        style={{
          animation: `${dashAnimationId} ${animationDuration}s linear infinite`,
        }}
      />

      {/* Bright highlight on top */}
      <path
        d={finalPath}
        fill="none"
        stroke={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.6)'}
        strokeWidth={baseStrokeWidth * 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${dashLength * 0.3} ${gapLength + dashLength * 0.7}`}
        strokeDashoffset={dashLength * 0.15}
        style={{
          animation: `${dashAnimationId} ${animationDuration}s linear infinite`,
        }}
      />

      {/* Start point indicator */}
      {lassoPath.length > 0 && (
        <circle
          cx={lassoPath[0].x}
          cy={lassoPath[0].y}
          r={4 / viewport.zoom}
          fill={gradientStart}
          stroke={isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
          strokeWidth={1.5 / viewport.zoom}
        >
          <animate
            attributeName="r"
            values={`${4 / viewport.zoom};${5 / viewport.zoom};${4 / viewport.zoom}`}
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* End point indicator (when not closed) */}
      {!lassoClosed && lassoPath.length > 1 && (
        <circle
          cx={lassoPath[lassoPath.length - 1].x}
          cy={lassoPath[lassoPath.length - 1].y}
          r={3 / viewport.zoom}
          fill={gradientEnd}
          stroke={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.8)'}
          strokeWidth={1 / viewport.zoom}
        />
      )}
    </g>
  );
};
