import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { AddPointPluginSlice } from './slice';

export const AddPointFeedbackOverlay: React.FC = () => {
    // Get canvas background color based on theme - MUST be called before early return
    const canvasBgColor = useColorModeValue('#f9fafb', '#111827'); // gray.50 and gray.900
    
    // Get state from store
    const addPointMode = useCanvasStore(state => 
        (state as unknown as AddPointPluginSlice).addPointMode
    );
    const zoom = useCanvasStore(state => state.viewport.zoom);
    
    const isActive = addPointMode?.isActive ?? false;
    const hoverPosition = addPointMode?.hoverPosition ?? null;

    if (!isActive || !hoverPosition) {
        return null;
    }

    // Calculate the size of the feedback circle based on zoom
    // We want it to maintain a consistent screen size
    const baseRadius = 6;
    const strokeWidth = 2 / zoom;
    const radius = baseRadius / zoom;

    return (
        <g>
            {/* Outer circle - canvas background color for contrast */}
            <circle
                cx={hoverPosition.x}
                cy={hoverPosition.y}
                r={radius + strokeWidth}
                fill="none"
                stroke={canvasBgColor}
                strokeWidth={strokeWidth * 1.5}
                style={{ pointerEvents: 'none' }}
            />

            {/* Inner circle - primary color */}
            <circle
                cx={hoverPosition.x}
                cy={hoverPosition.y}
                r={radius}
                fill="#3182ce"
                fillOpacity="0.5"
                stroke="#3182ce"
                strokeWidth={strokeWidth}
                style={{ pointerEvents: 'none' }}
            />

            {/* Center dot for precision */}
            <circle
                cx={hoverPosition.x}
                cy={hoverPosition.y}
                r={radius / 3}
                fill="#3182ce"
                style={{ pointerEvents: 'none' }}
            />
        </g>
    );
};
