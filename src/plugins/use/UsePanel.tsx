import React from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link2, Unlink, Copy } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { UseElement, UseElementData } from './types';
import type { UsePluginSlice } from './slice';
import ConditionalTooltip from '../../ui/ConditionalTooltip';

/**
 * Panel component for displaying use element properties
 */
export const UsePanel: React.FC = () => {
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const elements = useCanvasStore((state) => state.elements);
  const detachUseElement = useCanvasStore(
    (state) => (state as unknown as UsePluginSlice).detachUseElement
  );
  
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const hrefColor = useColorModeValue('blue.600', 'blue.300');
  
  // Get selected use elements
  const selectedUseElements = elements.filter(
    (el) => selectedIds.includes(el.id) && el.type === 'use'
  ) as UseElement[];
  
  if (selectedUseElements.length === 0) {
    return (
      <Box p={3}>
        <Text fontSize="sm" color="gray.500">
          No use elements selected
        </Text>
      </Box>
    );
  }
  
  const handleDetach = (elementId: string) => {
    detachUseElement?.(elementId);
  };
  
  const getReferenceTypeBadge = (type: UseElementData['referenceType']) => {
    switch (type) {
      case 'element':
        return <Badge colorScheme="green">Element</Badge>;
      case 'symbol':
        return <Badge colorScheme="purple">Symbol</Badge>;
      case 'external':
        return <Badge colorScheme="orange">External</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <VStack spacing={3} align="stretch" p={3}>
      <HStack spacing={2}>
        <Copy size={16} />
        <Text fontWeight="semibold" fontSize="sm">
          Use References ({selectedUseElements.length})
        </Text>
      </HStack>
      
      {selectedUseElements.map((element) => {
        const data = element.data;
        
        return (
          <Box
            key={element.id}
            p={3}
            borderWidth={1}
            borderColor={borderColor}
            borderRadius="md"
            bg={bgColor}
          >
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <Link2 size={14} />
                  <Text fontSize="xs" fontFamily="mono" color={hrefColor}>
                    #{data.href}
                  </Text>
                </HStack>
                {getReferenceTypeBadge(data.referenceType)}
              </HStack>
              
              <HStack fontSize="xs" color="gray.500" spacing={4}>
                <Text>
                  x: {data.x.toFixed(1)}, y: {data.y.toFixed(1)}
                </Text>
                {data.width !== undefined && data.height !== undefined && (
                  <Text>
                    {data.width.toFixed(0)}×{data.height.toFixed(0)}
                  </Text>
                )}
              </HStack>
              
              {data.styleOverrides && Object.keys(data.styleOverrides).length > 0 && (
                <Box fontSize="xs" color="gray.500">
                  <Text fontWeight="medium">Style Overrides:</Text>
                  <HStack wrap="wrap" spacing={2} mt={1}>
                    {data.styleOverrides.fillColor && (
                      <HStack spacing={1}>
                        <Box
                          w={3}
                          h={3}
                          borderRadius="sm"
                          bg={data.styleOverrides.fillColor}
                          borderWidth={1}
                          borderColor="gray.400"
                        />
                        <Text>fill</Text>
                      </HStack>
                    )}
                    {data.styleOverrides.strokeColor && (
                      <HStack spacing={1}>
                        <Box
                          w={3}
                          h={3}
                          borderRadius="sm"
                          bg={data.styleOverrides.strokeColor}
                          borderWidth={1}
                          borderColor="gray.400"
                        />
                        <Text>stroke</Text>
                      </HStack>
                    )}
                  </HStack>
                </Box>
              )}
              
              <HStack justify="flex-end" pt={1}>
                <ConditionalTooltip label="Detach (convert to independent element)">
                  <IconButton
                    aria-label="Detach use element"
                    icon={<Unlink size={14} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => handleDetach(element.id)}
                  />
                </ConditionalTooltip>
              </HStack>
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
};
