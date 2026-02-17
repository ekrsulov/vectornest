import React, { useState, useRef, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    VStack,
    HStack,
    Text,
    Input,
    Badge,
    useColorModeValue,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import type { PluginSelectorSlice } from './slice';

// Singleton pattern: track if an instance is already mounted
let isMounted = false;

export const PluginSelectorDialog: React.FC = () => {
    // Each instance tracks whether it's the "active" one
    const [isActiveInstance, setIsActiveInstance] = useState(false);
    
    useEffect(() => {
        // If no instance is mounted yet, claim this slot
        if (!isMounted) {
            isMounted = true;
            setIsActiveInstance(true);
        }
        
        return () => {
            // Only release if this was the active instance
            if (isActiveInstance) {
                isMounted = false;
            }
        };
    }, [isActiveInstance]);
    
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const [searchTerm, setSearchTerm] = useState('');
    const dummyRef = useRef<HTMLDivElement>(null);

    const isDialogOpen = useCanvasStore(
        (state) => (state as unknown as PluginSelectorSlice).pluginSelector.isDialogOpen
    );
    const setDialogOpen = useCanvasStore(
        (state) => (state as unknown as PluginSelectorSlice).setPluginSelectorDialogOpen
    );
    const enabledPlugins = useCanvasStore(
        (state) => (state as unknown as PluginSelectorSlice).pluginSelector.enabledPlugins
    );
    const setPluginEnabled = useCanvasStore(
        (state) => (state as unknown as PluginSelectorSlice).setPluginEnabled
    );

    // Don't render if not the active instance or dialog is closed
    if (!isActiveInstance || !isDialogOpen) {
        return null;
    }

    const handleClose = () => {
        setDialogOpen(false);
    };

    const allPlugins = pluginManager.getAll().sort((a, b) =>
        a.metadata.label.localeCompare(b.metadata.label)
    );

    // Filter plugins based on search term
    const filteredPlugins = allPlugins.filter(plugin =>
        plugin.metadata.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Critical plugins that cannot be disabled
    const criticalPluginIds = ['pluginSelector', 'select', 'pan', 'file', 'settings', 'library', 'animation-system', 'svgStructure'];

    // Non-critical plugins
    const nonCriticalPlugins = filteredPlugins.filter(p => !criticalPluginIds.includes(p.id));

    const isPluginEnabled = (id: string) => {
        // If list is empty, treat as all enabled (migration/init)
        if (enabledPlugins.length === 0) return true;
        return enabledPlugins.includes(id);
    };

    // Check if all non-critical plugins are enabled
    const allNonCriticalEnabled = nonCriticalPlugins.every(p => isPluginEnabled(p.id));

    const handleToggle = (id: string, isEnabled: boolean) => {
        setPluginEnabled(id, isEnabled);
    };

    const handleToggleAll = (enable: boolean) => {
        nonCriticalPlugins.forEach(plugin => {
            setPluginEnabled(plugin.id, enable);
        });
    };

    return (
        <Modal
            isOpen={true}
            onClose={handleClose}
            size="md"
            initialFocusRef={dummyRef}
        >
            <ModalOverlay />
            <ModalContent bg={bgColor} maxH="70vh" display="flex" flexDirection="column">
                <ModalHeader borderBottom="1px" borderColor={borderColor} px={3} py={2} flexShrink={0}>
                    {/* Hidden dummy div for initial focus to prevent keyboard on mobile */}
                    <div ref={dummyRef} tabIndex={-1} style={{ position: 'absolute', opacity: 0 }} />
                    <HStack justify="space-between" align="center">
                        <Text>Select Plugins</Text>
                        <Badge colorScheme="gray" variant="subtle">
                            {enabledPlugins.length}
                        </Badge>
                    </HStack>
                </ModalHeader>
                <ModalBody
                    px={3}
                    py={2}
                    flex="1"
                    overflowY="auto"
                    onTouchMove={(e) => {
                        // Stop propagation to prevent canvas touch handlers from blocking scroll
                        e.stopPropagation();
                    }}
                >
                    <VStack spacing={4} align="stretch" pb={4}>
                        {/* Search Bar */}
                        <Input
                            placeholder="Search plugins..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            size="sm"
                            h="20px"
                            borderRadius="0"
                            tabIndex={0}
                            _focus={{
                                borderColor: 'gray.600',
                                boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
                            }}
                        />

                        {/* Enable/Disable All - Only show when not filtering */}
                        {searchTerm === '' && (
                            <HStack
                                justify="space-between"
                                pb={2}
                                borderBottom="1px"
                                borderColor={borderColor}
                            >
                                <Text
                                    fontWeight="bold"
                                    cursor="pointer"
                                    onClick={() => handleToggleAll(!allNonCriticalEnabled)}
                                >
                                    Enable/Disable All
                                </Text>
                                <PanelSwitch
                                    isChecked={allNonCriticalEnabled}
                                    onChange={(e) => handleToggleAll(e.target.checked)}
                                />
                            </HStack>
                        )}

                        {filteredPlugins.map((plugin, index) => {
                            const isCritical = criticalPluginIds.includes(plugin.id);

                            return (
                                <HStack key={plugin.id} justify="space-between">
                                    <Text
                                        fontWeight="medium"
                                        cursor={isCritical ? 'default' : 'pointer'}
                                        onClick={() => {
                                            if (!isCritical) {
                                                handleToggle(plugin.id, !isPluginEnabled(plugin.id));
                                            }
                                        }}
                                    >
                                        {index + 1}. {plugin.metadata.label}
                                        {isCritical && ' (Critical)'}
                                    </Text>
                                    <PanelSwitch
                                        isChecked={isPluginEnabled(plugin.id)}
                                        onChange={(e) => handleToggle(plugin.id, e.target.checked)}
                                        isDisabled={isCritical}
                                    />
                                </HStack>
                            );
                        })}
                    </VStack>
                </ModalBody>
                <ModalFooter borderTop="1px" borderColor={borderColor} px={3} py={2}>
                    <PanelStyledButton onClick={handleClose}>Close</PanelStyledButton>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
