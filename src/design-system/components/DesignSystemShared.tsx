import React from 'react';
import { Badge, Box, HStack, Text, useColorModeValue } from '@chakra-ui/react';

export const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const bg = useColorModeValue('gray.100', 'whiteAlpha.200');
    const color = useColorModeValue('gray.700', 'gray.200');
    return (
        <Badge bg={bg} color={color} borderRadius="full" px={3} py={1} fontWeight="semibold" textTransform="none">
            {children}
        </Badge>
    );
};

export const ColorSwatch: React.FC<{ color: string; label: string; subLabel?: string }> = ({ color, label, subLabel }) => {
    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
    return (
        <HStack spacing={3} p={2} border="1px solid" borderColor={borderColor} borderRadius="md">
            <Box w="40px" h="40px" borderRadius="md" bg={color} flexShrink={0} boxShadow="sm" border="1px solid" borderColor="blackAlpha.100" />
            <Box>
                <Text fontWeight="bold" fontSize="sm">{label}</Text>
                {subLabel && <Text fontSize="xs" color="gray.500" fontFamily="mono">{subLabel}</Text>}
            </Box>
        </HStack>
    );
};
