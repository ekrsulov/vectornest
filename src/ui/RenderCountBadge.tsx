import React from 'react';

const RPS_LABEL_STYLE: React.CSSProperties = { fontSize: '8px', opacity: 0.9 };

interface RenderCountBadgeProps {
  count: number;
  rps?: number; // Renders per second
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Debug badge to display render count and renders per second
 * Semi-transparent badge positioned absolutely over content
 */
export const RenderCountBadge: React.FC<RenderCountBadgeProps> = ({ 
  count, 
  rps = 0,
  position = 'top-right' 
}) => {
  const positionStyles = {
    'top-left': { top: '4px', left: '4px' },
    'top-right': { top: '4px', right: '4px' },
    'bottom-left': { bottom: '4px', left: '4px' },
    'bottom-right': { bottom: '4px', right: '4px' },
  };

  // Color coding based on renders per second
  const getBackgroundColor = (rps: number) => {
    if (rps === 0) return 'rgba(100, 150, 255, 0.7)'; // Blue when idle
    if (rps < 5) return 'rgba(100, 200, 100, 0.7)'; // Green - good performance
    if (rps < 15) return 'rgba(255, 200, 100, 0.7)'; // Orange - moderate
    return 'rgba(255, 100, 100, 0.7)'; // Red - high render rate
  };

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        backgroundColor: getBackgroundColor(rps),
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '10px',
        zIndex: 9999,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1px',
      }}
      title={`Total renders: ${count}\nRenders per second: ${rps}`}
    >
      <div>R:{count}</div>
      {rps > 0 && <div style={RPS_LABEL_STYLE}>{rps}/s</div>}
    </div>
  );
};
