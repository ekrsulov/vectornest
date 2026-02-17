import React, { useRef, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import type { KeyframeTrack } from '../utils/splineUtils';

interface TimelineTrackProps {
    track: KeyframeTrack;
    onUpdateKeyTime: (index: number, newTime: number) => void;
    selectedSegmentIndex: number | null;
    onSelectSegment: (index: number) => void;
    onAddKeyframe: (time: number) => void;
    onDeleteKeyframe: (index: number) => void;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
    track,
    onUpdateKeyTime,
    selectedSegmentIndex,
    onSelectSegment,
    onAddKeyframe,
    onDeleteKeyframe
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const lastTapRef = useRef<number>(0);

    const handleContainerPointerDown = (e: React.PointerEvent) => {
        // Double tap detection
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const t = (e.clientX - rect.left) / rect.width;
            const cleanT = Math.max(0, Math.min(1, t));
            onAddKeyframe(cleanT);
            lastTapRef.current = 0; // Reset
        } else {
            lastTapRef.current = now;
        }
    };

    const handlePointerDown = (e: React.PointerEvent, index: number) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        // Prevent dragging first and last keyframes (0 and 1)
        if (index > 0 && index < track.keyTimes.length - 1) {
            setDraggingIdx(index);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (draggingIdx === null || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        let newX = (e.clientX - rect.left) / rect.width;

        // Clamp to [0, 1]
        newX = Math.max(0, Math.min(1, newX));

        // Constrain between prev and next keyframes for order validity
        // "estrictamente crecientes"
        const prevT = track.keyTimes[draggingIdx - 1];
        const nextT = track.keyTimes[draggingIdx + 1];
        const epsilon = 0.01;

        newX = Math.max(prevT + epsilon, Math.min(nextT - epsilon, newX));

        onUpdateKeyTime(draggingIdx, newX);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDraggingIdx(null);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const segments = [];
    for (let i = 0; i < track.keyTimes.length - 1; i++) {
        const t0 = track.keyTimes[i];
        const t1 = track.keyTimes[i + 1];
        const widthPercent = (t1 - t0) * 100;
        const leftPercent = t0 * 100;
        const isSelected = i === selectedSegmentIndex;

        segments.push(
            <Box
                key={`seg-${i}`}
                position="absolute"
                left={`${leftPercent}%`}
                width={`${widthPercent}%`}
                height="100%"
                bg={isSelected ? 'blue.400' : 'gray.200'}
                opacity={0.5}
                borderRight="1px solid white"
                cursor="pointer"
                onClick={() => onSelectSegment(i)}
                _hover={{ bg: isSelected ? 'blue.500' : 'gray.300' }}
                title={`Segment ${i}: ${t0.toFixed(2)} - ${t1.toFixed(2)}`}
            />
        );
    }

    return (
        <Box
            ref={containerRef}
            w="100%"
            h="24px"
            bg="bg.subtle"
            borderRadius="sm"
            position="relative"
            mt={2}
            role="group"
            onPointerDown={handleContainerPointerDown}
            style={{ touchAction: 'none' }}
        >
            {/* Background line */}
            <Box position="absolute" top="50%" left={0} right={0} h="1px" bg="border.subtle" transform="translateY(-50%)" />

            {/* Segments */}
            <Box position="absolute" top={0} bottom={0} left={0} right={0}>
                {segments}
            </Box>

            {/* Nodes */}
            {track.keyTimes.map((t, i) => {
                const isDraggable = i > 0 && i < track.keyTimes.length - 1;
                const showLabel = draggingIdx === i || hoveredIdx === i;

                return (
                    <Box
                        key={`node-${i}`}
                        position="absolute"
                        left={`${t * 100}%`}
                        top="50%"
                        transform="translate(-50%, -50%)"
                        zIndex={showLabel ? 10 : 2}
                        onPointerEnter={() => setHoveredIdx(i)}
                        onPointerLeave={() => setHoveredIdx(null)}
                    >
                        {/* Value Label */}
                        <Text
                            position="absolute"
                            bottom="20px"
                            left="50%"
                            transform="translateX(-50%)"
                            fontSize="9px"
                            whiteSpace="nowrap"
                            color="text.primary"
                            pointerEvents="none"
                            opacity={showLabel ? 1 : 0}
                            transition="opacity 0.2s"
                            bg="bg.panel"
                            px={1}
                            borderRadius="xs"
                            boxShadow="xs"
                            border="1px solid"
                            borderColor="border.subtle"
                        >
                            {t.toFixed(2)}
                        </Text>

                        {/* Node Handle */}
                        <Box
                            w="10px"
                            h="10px"
                            borderRadius="full"
                            bg="white"
                            border="2px solid"
                            borderColor={isDraggable ? "blue.500" : "gray.400"}
                            cursor={isDraggable ? "ew-resize" : "default"}
                            onPointerDown={(e) => handlePointerDown(e, i)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (isDraggable) onDeleteKeyframe(i);
                            }}
                            title={isDraggable ? `Time: ${t.toFixed(2)} (Double-click to remove)` : `Time: ${t.toFixed(2)} (Fixed)`}
                            _hover={{ transform: 'scale(1.2)' }}
                        />
                    </Box>
                );
            })}
        </Box>
    );
};
