/**
 * Filter Effect Editor - CRUD operations for filter primitives
 */

import React, { useState, useCallback } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { FilterDefinition, FilterPrimitive } from './types';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { CustomSelect } from '../../ui/CustomSelect';

interface FilterEffectEditorProps {
  filter: FilterDefinition;
  onUpdate: (filterId: string, updates: Partial<FilterDefinition>) => void;
}

const PRIMITIVE_TYPES = [
  'feGaussianBlur',
  'feColorMatrix',
  'feComponentTransfer',
  'feOffset',
  'feBlend',
  'feComposite',
  'feMorphology',
  'feConvolveMatrix',
  'feTurbulence',
  'feDisplacementMap',
  'feDiffuseLighting',
  'feSpecularLighting',
  'feMerge',
  'feFlood',
  'feImage',
  'feTile',
];

const getDefaultPrimitive = (type: string): FilterPrimitive => {
  switch (type) {
    case 'feGaussianBlur':
      return { type, stdDeviation: 2 };
    case 'feColorMatrix':
      return { type, matrixType: 'saturate', values: '1' };
    case 'feOffset':
      return { type, dx: 0, dy: 0 };
    case 'feBlend':
      return { type, mode: 'normal', in: 'SourceGraphic', in2: 'BackgroundImage' };
    case 'feComposite':
      return { type, operator: 'over', in: 'SourceGraphic', in2: 'BackgroundImage' };
    case 'feMorphology':
      return { type, operator: 'erode', radius: 1 };
    case 'feTurbulence':
      return { type, baseFrequency: '0.05', numOctaves: 2 };
    case 'feFlood':
      return { type, floodColor: '#000000', floodOpacity: 1 };
    case 'feMerge':
      return { type, feMergeNodes: [] };
    default:
      return { type };
  }
};

export const FilterEffectEditor: React.FC<FilterEffectEditorProps> = ({ filter, onUpdate }) => {
  const [expandedIndex, setExpandedIndex] = useState<number[]>([]);

  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const itemBg = useColorModeValue('white', 'gray.700');
  const itemHover = useColorModeValue('gray.100', 'gray.600');
  const panelBg = useColorModeValue('gray.50', 'gray.800');
  const titleColor = useColorModeValue('gray.700', 'white');
  const labelColor = useColorModeValue('gray.600', 'gray.300');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const handleAddEffect = useCallback(() => {
    const newPrimitive = getDefaultPrimitive('feGaussianBlur');
    onUpdate(filter.id, {
      primitives: [...filter.primitives, newPrimitive],
    });
  }, [filter, onUpdate]);

  const handleRemoveEffect = useCallback((index: number) => {
    const newPrimitives = filter.primitives.filter((_, i) => i !== index);
    onUpdate(filter.id, {
      primitives: newPrimitives,
    });
  }, [filter, onUpdate]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newPrimitives = [...filter.primitives];
    [newPrimitives[index - 1], newPrimitives[index]] = [newPrimitives[index], newPrimitives[index - 1]];
    onUpdate(filter.id, {
      primitives: newPrimitives,
    });
  }, [filter, onUpdate]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === filter.primitives.length - 1) return;
    const newPrimitives = [...filter.primitives];
    [newPrimitives[index], newPrimitives[index + 1]] = [newPrimitives[index + 1], newPrimitives[index]];
    onUpdate(filter.id, {
      primitives: newPrimitives,
    });
  }, [filter, onUpdate]);

  const handlePrimitiveChange = useCallback((index: number, updates: Partial<FilterPrimitive>) => {
    const newPrimitives = [...filter.primitives];
    newPrimitives[index] = { ...newPrimitives[index], ...updates };
    onUpdate(filter.id, {
      primitives: newPrimitives,
    });
  }, [filter, onUpdate]);

  const handleNameChange = useCallback((newName: string) => {
    onUpdate(filter.id, { name: newName });
  }, [filter.id, onUpdate]);

  const renderPrimitiveFields = (primitive: FilterPrimitive, index: number) => {
    const commonFields = Object.entries(primitive)
      .filter(([key]) => key !== 'type' && key !== 'feMergeNodes' && key !== 'lightSource');

    return (
      <VStack spacing={2} align="stretch">
        {commonFields.map(([key, value]) => (
          <HStack key={key} spacing={2}>
            <Text fontSize="xs" minWidth="80px" color={labelColor}>
              {key}:
            </Text>
            <PanelTextInput
              value={String(value)}
              onChange={(newValue) => handlePrimitiveChange(index, { [key]: newValue })}
              placeholder={key}
              width="100px"
            />
          </HStack>
        ))}
        {commonFields.length === 0 && (
          <Text fontSize="xs" color={mutedColor} textAlign="center">
            No editable properties
          </Text>
        )}
      </VStack>
    );
  };

  return (
    <VStack spacing={3} align="stretch">
      {/* Filter Name */}
      <HStack spacing={1}>
        <Text fontSize="xs" fontWeight="medium" minWidth="40px">
          Name:
        </Text>
        <Box pr={0.5}>
          <PanelTextInput
            value={filter.name}
            onChange={handleNameChange}
            placeholder="Filter name"
            width="180px"
          />
        </Box>
      </HStack>

      {/* Effects List */}
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="normal" color={titleColor}>
          Effects ({filter.primitives.length})
        </Text>
        <PanelStyledButton
          size="xs"
          onClick={handleAddEffect}
          leftIcon={<Plus size={12} />}
        >
          Add Effect
        </PanelStyledButton>
      </HStack>

      {filter.primitives.length === 0 ? (
        <Text fontSize="xs" color={mutedColor} textAlign="center" py={2}>
          No effects. Add one to get started.
        </Text>
      ) : (
        <Accordion allowMultiple index={expandedIndex} onChange={(idx) => setExpandedIndex(idx as number[])}>
          {filter.primitives.map((primitive, index) => (
            <AccordionItem key={index} border="1px solid" borderColor={borderColor} borderRadius="md" mb={2} bg={itemBg}>
              <HStack spacing={2} px={2} py={2}>
                <AccordionButton flex={1} _hover={{ bg: itemHover }} _expanded={{ bg: panelBg }}>
                  <Box flex="1" textAlign="left">
                    <Text fontSize="xs" fontWeight="medium" color={titleColor}>
                      {index + 1}. {primitive.type}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <HStack spacing={1}>
                  <IconButton
                    aria-label="Move up"
                    icon={<ChevronUp size={14} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => handleMoveUp(index)}
                    isDisabled={index === 0}
                  />
                  <IconButton
                    aria-label="Move down"
                    icon={<ChevronDown size={14} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => handleMoveDown(index)}
                    isDisabled={index === filter.primitives.length - 1}
                  />
                  <IconButton
                    aria-label="Remove effect"
                    icon={<Trash2 size={14} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleRemoveEffect(index)}
                  />
                </HStack>
              </HStack>
              <AccordionPanel pb={3} color={titleColor} bg={panelBg} borderTop="1px solid" borderTopColor={borderColor} borderRadius="0 0 6px 6px">
                <VStack spacing={2} align="stretch">
                  {/* Primitive Type Selector */}
                  <VStack spacing={0.5} align="stretch">
                    <Text fontSize="xs" color={labelColor}>
                      Type:
                    </Text>
                    <Box display="flex" w="full">
                      <CustomSelect
                        value={primitive.type}
                        onChange={(newType) => {
                          const newPrimitive = getDefaultPrimitive(newType);
                          handlePrimitiveChange(index, newPrimitive);
                        }}
                        options={PRIMITIVE_TYPES.map((type) => ({ value: type, label: type }))}
                        size="sm"
                        flex="1"
                      />
                    </Box>
                  </VStack>

                  {/* Dynamic Fields */}
                  {renderPrimitiveFields(primitive, index)}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </VStack>
  );
};
