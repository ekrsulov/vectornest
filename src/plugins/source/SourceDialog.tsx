import React, { useEffect, useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Textarea,
    Text,
    Flex,
    useToast,
    useColorModeValue,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { SourcePluginSlice } from './sourcePluginSlice';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelToggle } from '../../ui/PanelToggle';
import { ExportManager } from '../../utils/export/ExportManager';
import { ImportManager } from '../../utils/import/ImportManager';

export const SourceDialog: React.FC = () => {
    const toast = useToast();
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // Store selectors
    const isDialogOpen = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).source.isDialogOpen
    );
    const setSourceDialogOpen = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).setSourceDialogOpen
    );
    const setSourceSvgContent = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).setSourceSvgContent
    );
    const setSourceHasUnsavedChanges = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).setSourceHasUnsavedChanges
    );
    const hasUnsavedChanges = useCanvasStore(
        (state) => (state as unknown as SourcePluginSlice).source.hasUnsavedChanges
    );
    // Local state

    // Local state
    const [localSvgContent, setLocalSvgContent] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [isWordWrapEnabled, setIsWordWrapEnabled] = useState(false);

    // Export on open
    useEffect(() => {
        if (isDialogOpen) {
            const { content } = ExportManager.generateSvgContent();
            setLocalSvgContent(content);
            setSourceSvgContent(content);
            setSourceHasUnsavedChanges(false);
        }
    }, [isDialogOpen, setSourceSvgContent, setSourceHasUnsavedChanges]);

    const handleClose = () => {
        setSourceDialogOpen(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalSvgContent(newContent);
        setSourceSvgContent(newContent);
        setSourceHasUnsavedChanges(true);
    };

    const handleClear = () => {
        setLocalSvgContent('');
        setSourceSvgContent('');
        setSourceHasUnsavedChanges(true);
    };

    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(localSvgContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
            toast({
                title: 'SVG copied to clipboard',
                status: 'success',
                duration: 1200,
                isClosable: true,
                size: 'sm',
            });
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            toast({
                title: 'Failed to copy',
                status: 'error',
                duration: 2000,
                isClosable: true,
                size: 'sm',
            });
        }
    };

    const handleUpdateCanvas = async () => {
        if (!localSvgContent.trim()) {
            return;
        }

        setIsImporting(true);
        try {
            const blob = new Blob([localSvgContent], { type: 'image/svg+xml' });
            const file = new File([blob], 'source.svg', { type: 'image/svg+xml' });

            await ImportManager.importFiles([file], {
                appendMode: false // Source plugin usually replaces content or we might want to configure this? 
                // The original code called importSvgToCanvas which by default (I think) replaced or appended?
                // The original code used: importSvgToCanvas(file) which called useSvgImport().importSvgFiles([file])
                // checks useSvgImport default options... appendMode=false. So it clears selection/canvas logic there? 
                // Wait, useSvgImport: if (!appendMode) clearSelection(). Not clearElements().
                // But SourcePlugin seems to imply replacing the source? 
                // The previous implementation used `importSvgToCanvas` from slice.
                // Let's use ImportManager with appendMode: false to clear selection, but wait, does it clear elements?
                // No, useSvgImport only adds elements. It preserves existing unless user deletes them.
                // The Source Plugin seems to act as "Edit Source", which usually implies replacing the whole canvas or selected elements.
                // But the logic in `useSvgImport` just adds elements.
                // Let's stick to what useSvgImport did: appendMode: false (default) -> clears selection, adds elements.
            });

            toast({
                title: 'Canvas updated',
                status: 'success',
                duration: 2000,
                isClosable: true,
            });
            // Dialog is closed by the slice action on success
            setSourceDialogOpen(false); // Manually close as we are not using the slice action anymore for import logic
        } catch (_error) {
            toast({
                title: 'Failed to import SVG',
                description: 'Please check that the SVG is valid.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal
            isOpen={isDialogOpen}
            onClose={handleClose}
            size="xl"
            scrollBehavior="inside"
            closeOnOverlayClick={false}
        >
            <ModalOverlay />
            <ModalContent
                maxW={{ base: '95vw', md: '800px' }}
                maxH="90vh"
                bg={bgColor}
            >
                <ModalHeader borderBottom="1px" borderColor={borderColor} p={2} fontSize="sm">
                    SVG Source
                </ModalHeader>
                <ModalBody p={2}>
                    <Textarea
                        value={localSvgContent}
                        onChange={handleTextChange}
                        fontFamily="monospace"
                        fontSize="xs"
                        rows={15}
                        whiteSpace={isWordWrapEnabled ? 'pre-wrap' : 'pre'}
                        overflowX="auto"
                        resize="vertical"
                        autoFocus
                        borderRadius="0"
                        borderColor="gray.300"
                        bg="white"
                        _dark={{
                            borderColor: 'whiteAlpha.300',
                            bg: 'gray.800'
                        }}
                        _focus={{
                            borderColor: 'gray.600',
                            boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
                        }}
                        mb={2}
                    />
                    <Flex justifyContent="space-between" alignItems="center">
                        <PanelToggle
                            isChecked={isWordWrapEnabled}
                            onChange={(e) => setIsWordWrapEnabled(e.target.checked)}
                        >
                            Wrap Text
                        </PanelToggle>
                        <Text fontSize="xs" color="gray.500">
                            {localSvgContent.length} characters
                        </Text>
                    </Flex>
                </ModalBody>
                <ModalFooter borderTop="1px" borderColor={borderColor} gap={2} p={2}>
                    <PanelStyledButton onClick={handleClear} mr="auto" h="28px">
                        Clear
                    </PanelStyledButton>
                    <PanelStyledButton onClick={handleCopy} h="28px">
                        {copied ? 'Copied' : 'Copy'}
                    </PanelStyledButton>
                    <PanelStyledButton onClick={handleClose} h="28px">
                        Close
                    </PanelStyledButton>
                    <PanelStyledButton
                        onClick={handleUpdateCanvas}
                        isDisabled={!hasUnsavedChanges}
                        isLoading={isImporting}
                        loadingText="Importing"
                        h="28px"
                        bg="gray.800"
                        color="white"
                        borderColor="gray.800"
                        _hover={{ bg: 'gray.700' }}
                        _dark={{
                            bg: 'gray.100',
                            color: 'gray.900',
                            borderColor: 'gray.100',
                            _hover: { bg: 'gray.200' }
                        }}
                    >
                        Update Canvas
                    </PanelStyledButton>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
