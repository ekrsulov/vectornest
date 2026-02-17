import React, { useRef, useState } from 'react';
import { Box, HStack, VStack, Text, Button, SimpleGrid } from '@chakra-ui/react';
import type { CubicBezier } from '../utils/splineUtils';

interface EasingEditorProps {
    value: CubicBezier;
    onChange: (newValue: CubicBezier) => void;
}

const PRESETS: { label: string, value: CubicBezier }[] = [
    { label: 'Linear', value: [0, 0, 1, 1] },
    { label: 'Ease', value: [0.25, 0.1, 0.25, 1] },
    { label: 'Ease In', value: [0.42, 0, 1, 1] },
    { label: 'Ease Out', value: [0, 0, 0.58, 1] },
    { label: 'Ease In Out', value: [0.42, 0, 0.58, 1] },
];

export const EasingEditor: React.FC<EasingEditorProps> = ({ value, onChange }) => {
    // value is [x1, y1, x2, y2]
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

    const size = 160;
    const padding = 20;
    const graphSize = size - (padding * 2);

    // Coord conversion
    // Graph: (0,0) bottom-left -> (1,1) top-right
    // SVG: (padding, size-padding) -> (size-padding, padding)

    const toScreen = (x: number, y: number) => ({
        x: padding + x * graphSize,
        y: (size - padding) - y * graphSize
    });

    const fromScreen = (sx: number, sy: number) => ({
        x: Math.max(0, Math.min(1, (sx - padding) / graphSize)),
        y: Math.max(0, Math.min(1, ((size - padding) - sy) / graphSize))
    });

    const p0 = toScreen(0, 0);
    const p3 = toScreen(1, 1);
    const p1 = toScreen(value[0], value[1]);
    const p2 = toScreen(value[2], value[3]);

    const handlePointerDown = (e: React.PointerEvent, point: 'p1' | 'p2') => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(point);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const pt = fromScreen(e.clientX - rect.left, e.clientY - rect.top);

        // Constrain X to 0-1, Y roughly 0-1 (SMIL allows y outside 0-1? usually yes for bounce)
        // User requested y1,y2 in [0,1]? "x1,x2,y1,y2 ∈ [0,1] (SMIL espera eso)" -> OK strictly 0-1.

        const newVal = [...value] as CubicBezier;
        if (dragging === 'p1') {
            newVal[0] = Number(pt.x.toFixed(2));
            newVal[1] = Number(pt.y.toFixed(2));
        } else {
            newVal[2] = Number(pt.x.toFixed(2));
            newVal[3] = Number(pt.y.toFixed(2));
        }
        onChange(newVal);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDragging(null);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <VStack spacing={2} align="stretch" bg="bg.panel" p={2} borderRadius="md" borderWidth="1px" borderColor="border.subtle">
            <Box
                w={`${size}px`}
                h={`${size}px`}
                position="relative"
                bg="bg.subtle"
                borderRadius="sm"
                margin="0 auto"
            >
                <svg
                    ref={svgRef}
                    width={size}
                    height={size}
                    style={{ overflow: 'visible', cursor: dragging ? 'grabbing' : 'default', touchAction: 'none' }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    {/* Grid/Axes */}
                    <rect x={padding} y={padding} width={graphSize} height={graphSize} fill="none" stroke="#E2E8F0" strokeDasharray="4 4" />

                    {/* P0 to P1 line */}
                    <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="gray" strokeWidth="1" />
                    {/* P3 to P2 line */}
                    <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke="gray" strokeWidth="1" />

                    {/* Curve */}
                    <path
                        d={`M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    />

                    {/* Handles */}
                    <circle
                        cx={p1.x} cy={p1.y} r={5}
                        fill="#3182CE"
                        cursor="grab"
                        onPointerDown={(e) => handlePointerDown(e, 'p1')}
                    />
                    <circle
                        cx={p2.x} cy={p2.y} r={5}
                        fill="#E53E3E"
                        cursor="grab"
                        onPointerDown={(e) => handlePointerDown(e, 'p2')}
                    />
                </svg>
            </Box>

            <SimpleGrid columns={3} spacing={1}>
                {PRESETS.map(p => (
                    <Button
                        key={p.label}
                        size="xs"
                        variant="outline"
                        onClick={() => onChange(p.value)}
                        fontSize="9px"
                        h="20px"
                    >
                        {p.label}
                    </Button>
                ))}
            </SimpleGrid>

            <HStack justify="space-between" fontSize="10px" color="text.muted">
                <Text>P1: {value[0]}, {value[1]}</Text>
                <Text>P2: {value[2]}, {value[3]}</Text>
            </HStack>
        </VStack>
    );
};
