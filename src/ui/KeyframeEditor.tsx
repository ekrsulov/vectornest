/**
 * KeyframeEditor — Spline-mode keyframe editor.
 *
 * Combines a TimelineTrack for visual keyframe placement with
 * an EasingCurveEditor for per-segment bezier editing.
 * Includes an "Advanced" toggle for raw text input.
 */

import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, IconButton, Collapse } from '@chakra-ui/react';
import { Settings } from 'lucide-react';
import {
    parseAnimationData,
    serializeAnimationData,
} from './splineUtils';
import type { KeyframeTrack, CubicBezier } from './splineUtils';
import { EasingCurveEditor } from './EasingCurveEditor';
import { TimelineTrack } from './TimelineTrack';
import { PanelTextInput } from './PanelTextInput';
import type { SVGAnimation } from '../plugins/animationSystem/types';

interface KeyframeEditorProps {
    animation: SVGAnimation;
    onUpdate: (updates: Partial<SVGAnimation>) => void;
}

export const KeyframeEditor: React.FC<KeyframeEditorProps> = ({ animation, onUpdate }) => {
    // Local state for the track being edited
    const [track, setTrack] = useState<KeyframeTrack | null>(null);
    const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Initialize track from animation props
    useEffect(() => {
        const newTrack = parseAnimationData(
            animation.values || '',
            animation.keyTimes || '',
            animation.keySplines || ''
        );
        setTrack(newTrack);
    }, [animation.values, animation.keyTimes, animation.keySplines]);

    const handleUpdateKeyTime = (index: number, newTime: number) => {
        if (!track) return;
        const newKeyTimes = [...track.keyTimes];
        newKeyTimes[index] = newTime;

        const newTrack = { ...track, keyTimes: newKeyTimes };
        setTrack(newTrack);
        onUpdate(serializeAnimationData(newTrack));
    };

    const handleUpdateSpline = (newSpline: CubicBezier) => {
        if (!track || selectedSegmentIdx === null) return;
        const newKeySplines = [...track.keySplines];
        // Ensure array size
        while (newKeySplines.length <= selectedSegmentIdx) {
            newKeySplines.push([0.5, 0, 0.5, 1]);
        }
        newKeySplines[selectedSegmentIdx] = newSpline;

        const newTrack = { ...track, keySplines: newKeySplines };
        setTrack(newTrack);
        onUpdate(serializeAnimationData(newTrack));
    };

    const handleAddKeyframe = (t: number) => {
        if (!track) return;

        // Find insert index
        let index = 0;
        while (index < track.keyTimes.length && track.keyTimes[index] < t) {
            index++;
        }

        // Insert t
        const newKeyTimes = [...track.keyTimes];
        newKeyTimes.splice(index, 0, t);

        // Insert Value (Duplicate previous value for now)
        const prevValue = track.values[index - 1] || track.values[0] || '0';
        const newValues = [...track.values];
        newValues.splice(index, 0, prevValue);

        // Insert Spline
        const newKeySplines = [...track.keySplines];
        const prevSpline = newKeySplines[index - 1] || [0.5, 0, 0.5, 1];
        newKeySplines.splice(index - 1, 0, [...prevSpline] as CubicBezier);

        const newTrack = { values: newValues, keyTimes: newKeyTimes, keySplines: newKeySplines };
        setTrack(newTrack);
        onUpdate(serializeAnimationData(newTrack));
    };

    const handleDeleteKeyframe = (index: number) => {
        if (!track) return;
        // Cannot delete 0 or length-1
        if (index <= 0 || index >= track.keyTimes.length - 1) return;

        const newKeyTimes = [...track.keyTimes];
        newKeyTimes.splice(index, 1);

        const newValues = [...track.values];
        newValues.splice(index, 1);

        const newKeySplines = [...track.keySplines];
        newKeySplines.splice(index - 1, 1);

        const newTrack = { values: newValues, keyTimes: newKeyTimes, keySplines: newKeySplines };
        setTrack(newTrack);
        setSelectedSegmentIdx(null);
        onUpdate(serializeAnimationData(newTrack));
    };

    const activeSegmentSpline = (track && selectedSegmentIdx !== null)
        ? (track.keySplines[selectedSegmentIdx] || [0.5, 0, 0.5, 1])
        : null;

    if (!track) return null;

    return (
        <VStack spacing={2} align="stretch" w="100%" borderTop="1px solid" borderColor="border.subtle" pt={2} mt={2}>
            <HStack justify="space-between">
                <Text fontSize="xs" fontWeight="bold" color="text.muted">Keyframe Editor</Text>
                <IconButton
                    aria-label="Toggle Advanced"
                    icon={<Settings size={12} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    isActive={showAdvanced}
                    bg={showAdvanced ? 'bg.subtle' : 'transparent'}
                />
            </HStack>

            {/* Advanced Raw Inputs */}
            <Collapse in={showAdvanced} animateOpacity>
                <VStack spacing={2} pb={2} mb={2} borderBottom="1px dashed" borderColor="border.subtle" align="stretch" w="100%">
                    <VStack spacing={0} align="stretch">
                        <Text fontSize="2xs" color="text.muted">Values</Text>
                        <PanelTextInput
                            value={animation.values || ''}
                            onChange={(val) => onUpdate({ values: val })}
                            width="100%"
                        />
                    </VStack>
                    <VStack spacing={0} align="stretch">
                        <Text fontSize="2xs" color="text.muted">KeyTimes</Text>
                        <PanelTextInput
                            value={animation.keyTimes || ''}
                            onChange={(val) => onUpdate({ keyTimes: val })}
                            width="100%"
                        />
                    </VStack>
                    <VStack spacing={0} align="stretch">
                        <Text fontSize="2xs" color="text.muted">KeySplines</Text>
                        <PanelTextInput
                            value={animation.keySplines || ''}
                            onChange={(val) => onUpdate({ keySplines: val })}
                            width="100%"
                        />
                    </VStack>
                </VStack>
            </Collapse>

            <TimelineTrack
                track={track}
                onUpdateKeyTime={handleUpdateKeyTime}
                selectedSegmentIndex={selectedSegmentIdx}
                onSelectSegment={setSelectedSegmentIdx}
                onAddKeyframe={handleAddKeyframe}
                onDeleteKeyframe={handleDeleteKeyframe}
            />

            {/* Instruction */}
            {selectedSegmentIdx === null && (
                <Text fontSize="xs" color="text.muted" textAlign="center" py={2}>
                    Click a segment to edit easing
                </Text>
            )}

            {/* Easing Editor for Selected Segment */}
            <Collapse in={selectedSegmentIdx !== null} animateOpacity>
                {selectedSegmentIdx !== null && activeSegmentSpline && (
                    <Box mt={2}>
                        <Text fontSize="xs" mb={1}>
                            Segment {selectedSegmentIdx + 1} Easing
                        </Text>

                        <HStack spacing={2} mb={2}>
                            <VStack spacing={0} align="start" w="50%">
                                <Text fontSize="2xs" color="text.muted">Start Value</Text>
                                <PanelTextInput
                                    value={track.values[selectedSegmentIdx] || ''}
                                    onChange={(val) => {
                                        if (!track) return;
                                        const newValues = [...track.values];
                                        newValues[selectedSegmentIdx] = val;
                                        const newTrack = { ...track, values: newValues };
                                        setTrack(newTrack);
                                        onUpdate(serializeAnimationData(newTrack));
                                    }}
                                    width="100%"
                                />
                            </VStack>
                            <VStack spacing={0} align="start" w="50%">
                                <Text fontSize="2xs" color="text.muted">End Value</Text>
                                <PanelTextInput
                                    value={track.values[selectedSegmentIdx + 1] || ''}
                                    onChange={(val) => {
                                        if (!track) return;
                                        const newValues = [...track.values];
                                        newValues[selectedSegmentIdx + 1] = val;
                                        const newTrack = { ...track, values: newValues };
                                        setTrack(newTrack);
                                        onUpdate(serializeAnimationData(newTrack));
                                    }}
                                    width="100%"
                                />
                            </VStack>
                        </HStack>

                        <EasingCurveEditor
                            value={activeSegmentSpline}
                            onChange={handleUpdateSpline}
                            allowOvershoot={false}
                        />
                    </Box>
                )}
            </Collapse>
        </VStack>
    );
};
