import React, { useRef } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { Copy, PenSquare, Trash2 } from 'lucide-react';
import { SectionHeader } from '../../ui/SectionHeader';
import { FloatingContextMenu } from '../../ui/FloatingContextMenu';
import type { FloatingContextMenuAction } from '../../types/plugins';

export const OverlayTab: React.FC = () => {
    // Fake ref for the static display
    const anchorRef = useRef<HTMLDivElement>(null);

    const menuActions: FloatingContextMenuAction[] = [
        { id: '1', label: 'Copy', icon: Copy, onClick: () => { } },
        { id: '2', label: 'Paste', icon: PenSquare, onClick: () => { } },
        { id: '3', label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => { } },
    ];

    return (
        <VStack align="stretch" spacing={8}>
            <SectionHeader title="Floating Context Menu" />
            <Box position="relative" h="200px" border="1px dashed" borderColor="gray.300" borderRadius="md" bg="gray.50" ref={anchorRef}>
                <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
                    <FloatingContextMenu
                        actions={menuActions}
                        isOpen={true}
                    />
                </Box>
                <Text position="absolute" bottom={2} width="100%" textAlign="center" fontSize="xs" color="gray.500">
                    (Static demonstration of the context menu component)
                </Text>
            </Box>
        </VStack>
    );
};
