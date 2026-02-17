import React from 'react';
import { Box } from '@chakra-ui/react';

interface SplineVisualizerProps {
    keySplines: string;
}

export const SplineVisualizer: React.FC<SplineVisualizerProps> = ({ keySplines }) => {
    if (!keySplines) return null;

    const splines = keySplines.split(';').map(s => s.trim()).filter(s => s);
    if (splines.length === 0) return null;

    // Use the first spline for visualization if multiple exist, 
    // or arguably we could overlay them. For simplicity in a small card,
    // let's visualize the first valid segment, as often complex animations
    // just repeat similar easing or it gets too messy to show 10 curves.
    // Or better: Show them all sequentially? No, that requires keyTimes context.
    // Let's just overlay the unique curves found? 
    // "muestra grafico con los valores".
    // Let's assume simplest useful case: The active easing function.

    // We'll normalize to a 100x40 box (preserving aspect ratio roughly or just filling).
    const W = 100;
    const H = 40;

    // SVG Coord system: (0,0) is Top-Left. 
    // Graph Origin (0,0) is Bottom-Left => SVG (0, H).
    // Graph End (1,1) is Top-Right => SVG (W, 0).

    const paths = splines.map((splineStr, idx) => {
        const parts = splineStr.split(/\s+/).map(parseFloat);
        if (parts.length !== 4 || parts.some(isNaN)) return null;

        const [x1, y1, x2, y2] = parts;

        const p0x = 0;
        const p0y = H;

        const p3x = W;
        const p3y = 0;

        const p1x = x1 * W;
        const p1y = H - (y1 * H);

        const p2x = x2 * W;
        const p2y = H - (y2 * H);

        const d = `M ${p0x} ${p0y} C ${p1x} ${p1y} ${p2x} ${p2y} ${p3x} ${p3y}`;

        return (
            <path
                key={idx}
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity={0.8}
            />
        );
    });

    return (
        <Box
            w="100%"
            h="40px"
            bg="bg.subtle"
            borderRadius="sm"
            overflow="hidden"
            borderWidth="1px"
            borderColor="border.subtle"
            color="accent"
            title={`Spline: ${keySplines}`}
        >
            <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                {/* Grid lines / Axis for reference */}
                <line x1="0" y1={H} x2={W} y2={0} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                {paths}
            </svg>
        </Box>
    );
};
