import React, { useMemo, useState, useCallback } from 'react';
import { VStack, HStack, Text, IconButton, Box, Collapse, Menu, MenuButton, MenuList, MenuItem, Button, Badge } from '@chakra-ui/react';
import { Trash2, Move, RefreshCw, Eye, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { SVGAnimation } from '../../animationSystem/types';
import type { CanvasElement } from '../../../types';
import { useCanvasStore } from '../../../store/canvasStore';
import { PanelTextInput } from '../../../ui/PanelTextInput';

import { CustomSelect } from '../../../ui/CustomSelect';
import { SliderControl } from '../../../ui/SliderControl';
import { KeyframeEditor } from './KeyframeEditor';

interface AnimationCardProps {
    animation: SVGAnimation;
    onDelete: (id: string) => void;
    onUpdate: (id: string, updates: Partial<SVGAnimation>) => void;
    targetLabel?: React.ReactNode;
}

type FieldType = 'text' | 'select';

interface FieldConfig {
    key: keyof SVGAnimation;
    label: string;
    type: FieldType;
    placeholder?: string;
    options?: { value: string; label: string }[];
    defaultValue: string;
    hiddenValues?: string[];
}

const FIELD_CONFIGS: FieldConfig[] = [
    { key: 'begin', label: 'Begin', type: 'text', placeholder: '0s', defaultValue: '0.1s', hiddenValues: ['0s', '0'] },
    { key: 'end', label: 'End', type: 'text', placeholder: 'optional', defaultValue: '1s' },
    { key: 'from', label: 'From', type: 'text', defaultValue: '0' },
    { key: 'to', label: 'To', type: 'text', defaultValue: '1' },
    { key: 'values', label: 'Values', type: 'text', defaultValue: '' },
    { key: 'fill', label: 'Fill', type: 'select', defaultValue: 'remove', options: [{ value: 'freeze', label: 'Freeze' }, { value: 'remove', label: 'Remove' }], hiddenValues: ['freeze'] },
    { key: 'calcMode', label: 'Calc Mode', type: 'select', defaultValue: 'spline', options: [{ value: 'linear', label: 'Linear' }, { value: 'discrete', label: 'Discrete' }, { value: 'paced', label: 'Paced' }, { value: 'spline', label: 'Spline' }], hiddenValues: ['linear'] },
    { key: 'keyTimes', label: 'Key Times', type: 'text', defaultValue: '0; 1' },
    { key: 'keySplines', label: 'Key Splines', type: 'text', placeholder: 'x1 y1 x2 y2', defaultValue: '0.4 0 0.2 1' },
    { key: 'additive', label: 'Additive', type: 'select', defaultValue: 'sum', options: [{ value: 'replace', label: 'Replace' }, { value: 'sum', label: 'Sum' }], hiddenValues: ['replace'] },
    { key: 'accumulate', label: 'Accumulate', type: 'select', defaultValue: 'sum', options: [{ value: 'none', label: 'None' }, { value: 'sum', label: 'Sum' }], hiddenValues: ['none'] },
];

// ...remove import here
export const AnimationCard: React.FC<AnimationCardProps> = ({ animation, onDelete, onUpdate, targetLabel }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const elements = useCanvasStore(state => state.elements);

    const getIcon = () => {
        switch (animation.type) {
            case 'animateTransform':
                return <Move size={14} />;
            case 'animate':
                return <Eye size={14} />;
            default:
                return <RefreshCw size={14} />;
        }
    };

    const getLabel = useCallback(() => {
        if (animation.attributeName === 'transform' || animation.type === 'animateTransform') {
            const type = animation.transformType || 'Transform';
            return `${type.charAt(0).toUpperCase() + type.slice(1)}`;
        }
        if (animation.attributeName) return animation.attributeName;
        return animation.type;
    }, [animation.attributeName, animation.transformType, animation.type]);

    const handleChange = (field: keyof SVGAnimation, value: string | number) => {
        onUpdate(animation.id, { [field]: value });
    };

    const hasValue = (config: FieldConfig) => {
        const val = animation[config.key];
        if (val === undefined || val === '' || val === null) return false;
        if (config.hiddenValues?.includes(String(val))) return false;
        return true;
    };

    const dur = parseFloat(String(animation.dur || '0')) || 0;

    const isStandardType = animation.type === 'animate' || animation.type === 'animateTransform';

    // Core fields always shown: dur, repeatCount.
    // Dynamic fields: FIELD_CONFIGS.

    const visibleFields = FIELD_CONFIGS.filter(config => isStandardType && hasValue(config));
    const hiddenFields = FIELD_CONFIGS.filter(config => isStandardType && !hasValue(config));

    const summaryText = useMemo(() => {
        const parts: string[] = [];

        const short = (val: string, len = 32) => (val.length > len ? `${val.slice(0, len - 1)}…` : val);

        const label = getLabel();
        const firstPart = animation.type === 'animateTransform' ? (animation.transformType || 'transform') : (animation.attributeName || animation.type);

        // Only add the first part if it's significantly different from the badge label
        if (firstPart.toLowerCase() !== label.toLowerCase()) {
            parts.push(firstPart);
        }

        if (animation.begin) parts.push(`begin ${animation.begin}`);
        if (animation.end) parts.push(`end ${animation.end}`);
        if (animation.dur) parts.push(`dur ${animation.dur}`);
        if (animation.repeatCount !== undefined) parts.push(`rpt ${animation.repeatCount}`);

        if (animation.from || animation.to) {
            parts.push(`from ${animation.from ?? ''} → ${animation.to ?? ''}`.trim());
        }

        if (animation.values) parts.push(`vals ${short(String(animation.values))}`);
        if (animation.calcMode) parts.push(`calc ${animation.calcMode}`);
        if (animation.additive) parts.push(`add ${animation.additive}`);
        if (animation.accumulate) parts.push(`acc ${animation.accumulate}`);
        if (animation.rotate) parts.push(`rot ${animation.rotate}`);
        if (animation.mpath) parts.push(`mpath ${short(animation.mpath, 16)}`);
        if (animation.path) parts.push(`path ${short(animation.path)}`);

        return parts.join(' • ');
    }, [animation, getLabel]);

    return (
        <Box
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="md"
            bg="bg.panel"
            _hover={{ borderColor: 'border.hover' }}
        >
            <VStack spacing={0} align="stretch">
                <HStack p={2} justify="space-between" align="flex-start" cursor="pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <VStack spacing={1} align="flex-start" width="100%" overflow="hidden">
                        <HStack width="100%" justify="space-between" align="center">
                            <HStack spacing={3}>
                                <Box pt={0.5} color={isExpanded ? 'blue.500' : 'text.muted'}>
                                    {getIcon()}
                                </Box>
                                <Badge variant="subtle" colorScheme="blue" fontSize="2xs" px={1} borderRadius="sm" textTransform="none">
                                    {getLabel()}
                                </Badge>
                            </HStack>
                            <HStack spacing={1}>
                                <IconButton
                                    aria-label="Toggle details"
                                    icon={isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    size="xs"
                                    variant="ghost"
                                    isRound
                                    h="16px"
                                    minW="16px"
                                />
                                <IconButton
                                    aria-label="Delete animation"
                                    icon={<Trash2 size={12} />}
                                    size="xs"
                                    variant="ghost"
                                    isRound
                                    color="text.muted"
                                    _hover={{ color: 'red.500', bg: 'red.50' }}
                                    h="20px"
                                    minW="20px"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(animation.id);
                                    }}
                                />
                            </HStack>
                        </HStack>

                        {targetLabel && (
                            <HStack spacing={1} align="center" width="100%" overflow="hidden">
                                <Text fontSize="2xs" color="text.muted" flexShrink={0}>on</Text>
                                <Box transform="scale(0.9)" transformOrigin="left" width="100%" overflow="hidden" textOverflow="ellipsis">
                                    {targetLabel}
                                </Box>
                            </HStack>
                        )}

                        {!isExpanded && summaryText && (
                            <Text fontSize="xs" color="text.muted" noOfLines={2} pt={0.5} width="100%">
                                {summaryText}
                            </Text>
                        )}
                    </VStack>
                </HStack>

                <Collapse in={isExpanded} animateOpacity>
                    <VStack spacing={2} align="stretch" px={1} pt={0} pb={2}>
                        {/* Target attribute / transform */}
                        {(animation.type === 'animate' || animation.type === 'animateTransform' || animation.type === 'set') && (
                            <VStack spacing={0} align="stretch">
                                <Text fontSize="2xs" color="text.muted">Attribute</Text>
                                <PanelTextInput
                                    value={animation.attributeName || ''}
                                    onChange={(val) => handleChange('attributeName', val)}
                                    width="100%"
                                    placeholder="opacity, transform, fill, etc."
                                />
                            </VStack>
                        )}

                        {animation.type === 'animateTransform' && (
                            <VStack spacing={0} align="stretch">
                                <Text fontSize="2xs" color="text.muted">Transform type</Text>
                                <CustomSelect
                                    value={animation.transformType || 'translate'}
                                    onChange={(val) => handleChange('transformType', val)}
                                    options={[
                                        { value: 'translate', label: 'Translate' },
                                        { value: 'scale', label: 'Scale' },
                                        { value: 'rotate', label: 'Rotate' },
                                        { value: 'skewX', label: 'Skew X' },
                                        { value: 'skewY', label: 'Skew Y' },
                                    ]}
                                    size="sm"
                                />
                            </VStack>
                        )}

                        {/* Core Fields */}
                        <VStack spacing={0} align="stretch">
                            <Text fontSize="2xs" color="text.muted">Duration</Text>
                            <SliderControl
                                value={dur}
                                min={0.1}
                                max={10}
                                step={0.1}
                                onChange={(val) => handleChange('dur', `${val.toFixed(1)}s`)}
                                formatter={(v) => `${v}s`}
                                labelWidth="0"
                                valueWidth="50px"
                                inline
                                gap="4px"
                            />
                        </VStack>

                        <VStack spacing={0} align="stretch">
                            <Text fontSize="2xs" color="text.muted">Repeat Count</Text>
                            <PanelTextInput
                                value={String(animation.repeatCount || '1')}
                                onChange={(val) => handleChange('repeatCount', val === 'indefinite' ? 'indefinite' : (isNaN(Number(val)) ? val : Number(val)))}
                                width="100%"
                                rightElement={
                                    <IconButton
                                        aria-label="Repeat Indefinite"
                                        icon={<Box as="span" fontSize="12px" fontWeight="bold">∞</Box>}
                                        size="xs"
                                        variant="ghost"
                                        bg={animation.repeatCount === 'indefinite' ? 'gray.500' : 'transparent'}
                                        color={animation.repeatCount === 'indefinite' ? 'white' : 'text.muted'}
                                        _hover={{ bg: animation.repeatCount === 'indefinite' ? 'gray.600' : 'bg.subtle' }}
                                        onClick={() => handleChange('repeatCount', 'indefinite')}
                                        h="100%"
                                        minW="20px"
                                        w="100%"
                                        borderRadius={0}
                                    />
                                }
                            />
                        </VStack>

	                        {/* Dynamic Fields */}
	                        {/* Dynamic Fields */}
	                        {visibleFields.map(field => {
	                            // If calcMode is spline, we hide raw keyTimes/keySplines/values inputs and use the sophisticated editor
	                            if (animation.calcMode === 'spline' && (field.key === 'keyTimes' || field.key === 'keySplines' || field.key === 'values')) {
	                                return null;
	                            }

	                            return (
	                                <Box key={field.key} role="group">
	                                    <VStack spacing={0} align="stretch">
	                                        <HStack spacing={1} align="center" justify="space-between">
	                                            <Text fontSize="2xs" color="text.muted">
	                                                {field.label}
	                                            </Text>
	                                            <IconButton
	                                                aria-label="Remove property"
	                                                icon={<Trash2 size={10} />}
	                                                size="xs"
	                                                variant="ghost"
	                                                h="16px"
	                                                minW="16px"
	                                                color="red.400"
	                                                opacity={0}
	                                                visibility="hidden"
	                                                _groupHover={{ opacity: 1, visibility: 'visible' }}
	                                                transition="opacity 0.2s"
	                                                onClick={() => handleChange(field.key, '')}
	                                            />
	                                        </HStack>
	                                        {field.type === 'select' ? (
	                                            <CustomSelect
	                                                value={String(animation[field.key] || field.defaultValue)}
	                                                onChange={(val) => handleChange(field.key, val)}
	                                                options={field.options || []}
	                                                size="sm"
	                                            />
	                                        ) : (
	                                            <PanelTextInput
	                                                value={String(animation[field.key] || '')}
	                                                onChange={(val) => handleChange(field.key, val)}
	                                                width="100%"
	                                                placeholder={field.placeholder}
	                                            />
	                                        )}
	                                    </VStack>
	                                </Box>
	                            );
	                        })}

                        {/* Add Button */}
                        {hiddenFields.length > 0 && (
                            <Menu>
                                <MenuButton
                                    as={Button}
                                    size="xs"
                                    variant="ghost"
                                    leftIcon={<Plus size={12} />}
                                    color="text.muted"
                                    fontWeight="normal"
                                    justifyContent="flex-start"
                                    w="100%"
                                    h="24px"
                                >
                                    Add property...
                                </MenuButton>
                                <MenuList maxH="200px" overflowY="auto" zIndex={1500}>
                                    {hiddenFields.map(field => (
                                        <MenuItem
                                            key={field.key}
                                            fontSize="12px"
                                            onClick={() => handleChange(field.key, field.defaultValue)}
                                        >
                                            {field.label} ({field.key})
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </Menu>
                        )}

                        {/* AnimateMotion Specific Fields */}
                        {animation.type === 'animateMotion' && (
                            <Box borderTopWidth="1px" borderColor="border.subtle" pt={2} mt={1}>
                                <Text fontSize="xs" fontWeight="bold" mb={2} color="text.subtle">Motion Path</Text>
                                <VStack spacing={2}>
                                    <VStack spacing={0} align="stretch" width="100%">
                                        <Text fontSize="2xs" color="text.muted">Reference Path</Text>
                                        <CustomSelect
                                            value={animation.mpath || ''}
                                            onChange={(val) => handleChange('mpath', val)}
                                            options={[
                                                { value: '', label: 'None' },
                                                ...elements
                                                    .filter((el: CanvasElement) => el.type === 'path' || el.type === 'nativeShape')
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    .map((el: CanvasElement) => ({ value: el.id, label: (el.data as any).name || el.id }))
                                            ]}
                                            size="sm"
                                            placeholder="Select motion path..."
                                        />
                                    </VStack>

                                    <VStack spacing={0} align="stretch" width="100%">
                                        <Text fontSize="2xs" color="text.muted">Rotation</Text>
                                        <CustomSelect
                                            value={String(animation.rotate || 'auto')}
                                            onChange={(val) => handleChange('rotate', val)}
                                            options={[
                                                { value: 'auto', label: 'Auto' },
                                                { value: 'auto-reverse', label: 'Auto Reverse' },
                                                { value: '0', label: '0°' },
                                                { value: '90', label: '90°' },
                                                { value: '180', label: '180°' },
                                                { value: '270', label: '270°' }
                                            ]}
                                            size="sm"
                                        />
                                    </VStack>

                                    {!animation.mpath && (
                                        <VStack spacing={0} align="stretch" width="100%">
                                            <Text fontSize="2xs" color="text.muted">Path</Text>
                                            <PanelTextInput
                                                value={animation.path || ''}
                                                onChange={(val) => handleChange('path', val)}
                                                width="100%"
                                                placeholder="M 0 0 L 100 100..."
                                            />
                                        </VStack>
                                    )}

                                    <VStack spacing={0} align="stretch" width="100%">
                                        <Text fontSize="2xs" color="text.muted">Key Points</Text>
                                        <PanelTextInput
                                            value={animation.keyPoints || ''}
                                            onChange={(val) => handleChange('keyPoints', val)}
                                            width="100%"
                                            placeholder="0; 0.5; 1"
                                        />
                                    </VStack>
                                </VStack>
                            </Box>
                        )}

                        {/* Advanced Keyframe Editor for Spline mode */}
                        {animation.calcMode === 'spline' && (
                            <KeyframeEditor
                                animation={animation}
                                onUpdate={(updates) => onUpdate(animation.id, updates)}
                            />
                        )}

                    </VStack>
                </Collapse>
            </VStack>
        </Box>
    );
};
