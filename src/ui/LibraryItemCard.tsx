import React from 'react';
import type { ReactNode } from 'react';
import { Box, Text, HStack, useColorModeValue } from '@chakra-ui/react';

interface LibraryItemCardProps {
    name: string;
    // The visual content (preview)
    preview: ReactNode;
    // Optional details (e.g., dimensions, # of stops, etc.)
    details?: ReactNode;

    isSelected?: boolean;
    onClick?: () => void;
}

export const LibraryItemCard: React.FC<LibraryItemCardProps> = ({
    name,
    preview,
    details,
    isSelected = false,
    onClick,
}) => {
    const bg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const selectedBorderColor = useColorModeValue('blue.500', 'blue.400');
    const bgHover = useColorModeValue('gray.50', 'gray.700');
    const detailsColor = useColorModeValue('gray.500','gray.400');

    return (
        <Box
            onClick={onClick}
            cursor={onClick ? "pointer" : "default"}
            borderWidth="1px"
            borderColor={isSelected ? selectedBorderColor : borderColor}
            borderRadius="md"
            overflow="hidden"
            bg={bg}
            transition="all 0.2s"
            _hover={{
                borderColor: isSelected ? selectedBorderColor : 'gray.400',
                bg: bgHover,
                transform: onClick ? "translateY(-1px)" : "none",
                boxShadow: "sm"
            }}
            w="100%"
            p={0}
        >
            <HStack spacing={1} align="center">
                <Box
                    w="30px"
                    h="30px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    overflow="hidden"
                    bg={useColorModeValue('gray.50', 'whiteAlpha.50')}
                    borderRadius="sm"
                    flexShrink={0}
                >
                    {preview}
                </Box>

                <Box flex={1} minW={0}>
                    <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        noOfLines={1}
                        title={name}
                        mb={details ? 0 : 0}
                    >
                        {name}
                    </Text>
                    {details && (
                        <Text fontSize="xs" color={detailsColor} noOfLines={1}>
                            {details}
                        </Text>
                    )}
                </Box>
            </HStack>
        </Box>
    );
};
