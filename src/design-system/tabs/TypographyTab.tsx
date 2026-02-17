import React from 'react';
import { Box, Divider, Heading, Text, VStack } from '@chakra-ui/react';
import { SectionHeader } from '../../ui/SectionHeader';

export const TypographyTab: React.FC = () => {
    return (
        <VStack align="stretch" spacing={8}>
            <SectionHeader title="Typography" />
            <VStack align="start" spacing={4}>
                <Box>
                    <Heading size="2xl">Heading 2xl</Heading>
                    <Text color="gray.500" fontSize="sm">Used for major page titles</Text>
                </Box>
                <Box>
                    <Heading size="xl">Heading xl</Heading>
                    <Text color="gray.500" fontSize="sm">Used for section titles</Text>
                </Box>
                <Box>
                    <Heading size="lg">Heading lg</Heading>
                    <Text color="gray.500" fontSize="sm">Used for card titles</Text>
                </Box>
                <Box>
                    <Heading size="md">Heading md</Heading>
                    <Text color="gray.500" fontSize="sm">Used for subsection titles</Text>
                </Box>
                <Box>
                    <Heading size="sm">Heading sm</Heading>
                    <Text color="gray.500" fontSize="sm">Used for small headers</Text>
                </Box>
                <Box>
                    <Heading size="xs">Heading xs</Heading>
                    <Text color="gray.500" fontSize="sm">Used for labels and captions</Text>
                </Box>

                <Divider my={4} />

                <Box>
                    <Text fontSize="xl">Text xl - The quick brown fox jumps over the lazy dog</Text>
                </Box>
                <Box>
                    <Text fontSize="lg">Text lg - The quick brown fox jumps over the lazy dog</Text>
                </Box>
                <Box>
                    <Text fontSize="md">Text md - The quick brown fox jumps over the lazy dog</Text>
                </Box>
                <Box>
                    <Text fontSize="sm">Text sm - The quick brown fox jumps over the lazy dog</Text>
                </Box>
                <Box>
                    <Text fontSize="xs">Text xs - The quick brown fox jumps over the lazy dog</Text>
                </Box>
            </VStack>
        </VStack>
    );
};
