import React, { useState } from 'react';
import { Box, HStack, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import {
    MousePointer,
    Move,
    PenTool,
    Circle,
    Square,
    Type,
    Settings,
    Wrench,
    ZoomIn,
    ZoomOut,
    Maximize2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionHeader } from '../../ui/SectionHeader';
import { FloatingToolbarShell } from '../../ui/FloatingToolbarShell';
import { ToolGroupAction } from '../../ui/ToolGroupAction';
import { FloatingContextMenuButton } from '../../ui/FloatingContextMenuButton';

export const ActionBarTab: React.FC = () => {
    const [activeTool, setActiveTool] = useState('select');
    const [lastUsedBasic, setLastUsedBasic] = useState('select');
    const [lastUsedCreation, setLastUsedCreation] = useState('pen');
    const [lastUsedAdvanced, setLastUsedAdvanced] = useState('settings');

    const basicTools = [
        { id: 'select', label: 'Select', icon: MousePointer },
        { id: 'move', label: 'Move', icon: Move },
    ];

    const creationTools = [
        { id: 'pen', label: 'Pen', icon: PenTool },
        { id: 'rect', label: 'Rectangle', icon: Square },
        { id: 'circle', label: 'Circle', icon: Circle },
        { id: 'text', label: 'Text', icon: Type },
    ];

    const advancedTools = [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'wrench', label: 'Tools', icon: Wrench },
    ];

    const getActiveToolState = (
        tools: typeof basicTools,
        currentId: string,
        defaultIcon: LucideIcon | React.ComponentType<{ size?: number }>
    ) => {
        const tool = tools.find(t => t.id === currentId);
        return tool ? { isActive: true, icon: tool.icon } : { isActive: false, icon: defaultIcon };
    };

    // Helper to determine if a group is active
    const isGroupActive = (tools: typeof basicTools) => tools.some(t => t.id === activeTool);

    const basicState = isGroupActive(basicTools) ? getActiveToolState(basicTools, activeTool, MousePointer) : { isActive: false, icon: MousePointer };
    const creationState = isGroupActive(creationTools) ? getActiveToolState(creationTools, activeTool, PenTool) : { isActive: false, icon: PenTool };
    const advancedState = isGroupActive(advancedTools) ? getActiveToolState(advancedTools, activeTool, Settings) : { isActive: false, icon: Settings };

    return (
        <VStack align="stretch" spacing={8}>
            <SectionHeader title="Action Bar" />

            <Box position="relative" h="150px" bg={useColorModeValue('gray.100', 'gray.800')} borderRadius="md" overflow="hidden" border="1px dashed" borderColor="gray.300">
                <Box position="absolute" bottom={4} left="50%" transform="translateX(-50%)" width="full" display="flex" justifyContent="center">
                    {/* 
                        We need to override position via sx for the demo to work inside this container. 
                        FloatingToolbarShell uses fixed positioning by default and position prop is omitted from its types.
                    */}
                    <Box position="relative">
                        <FloatingToolbarShell
                            toolbarPosition="bottom"
                            sx={{ position: 'relative', transform: 'none', left: 'auto', right: 'auto' }}
                        >
                            <HStack spacing={0}>
                                <ToolGroupAction
                                    label="Basic Tools"
                                    icon={basicState.icon}
                                    isActive={basicState.isActive}
                                    tools={basicTools}
                                    currentToolId={activeTool}
                                    onToolSelect={(id) => { setActiveTool(id); setLastUsedBasic(id); }}
                                    toolGroup="basic"
                                    defaultToolId={lastUsedBasic}
                                />
                                <ToolGroupAction
                                    label="Creation Tools"
                                    icon={creationState.icon}
                                    isActive={creationState.isActive}
                                    tools={creationTools}
                                    currentToolId={activeTool}
                                    onToolSelect={(id) => { setActiveTool(id); setLastUsedCreation(id); }}
                                    toolGroup="creation"
                                    defaultToolId={lastUsedCreation}
                                />
                                <ToolGroupAction
                                    label="Advanced Tools"
                                    icon={advancedState.icon}
                                    isActive={advancedState.isActive}
                                    tools={advancedTools}
                                    currentToolId={activeTool}
                                    onToolSelect={(id) => { setActiveTool(id); setLastUsedAdvanced(id); }}
                                    toolGroup="advanced"
                                    defaultToolId={lastUsedAdvanced}
                                />
                                <ToolGroupAction
                                    label="Zoom Controls"
                                    icon={ZoomIn}
                                    isActive={false}
                                    tools={[
                                        { id: 'zoom-in', label: 'Zoom In', icon: ZoomIn },
                                        { id: 'zoom-out', label: 'Zoom Out', icon: ZoomOut },
                                        { id: 'reset-zoom', label: 'Reset Zoom', icon: Maximize2 },
                                    ]}
                                    onToolSelect={() => { }}
                                    counter="100%"
                                />
                                <FloatingContextMenuButton />
                            </HStack>
                        </FloatingToolbarShell>
                    </Box>
                </Box>
                <Text position="absolute" top={2} width="100%" textAlign="center" fontSize="xs" color="gray.500">
                    Interactive Action Bar Demo
                </Text>
            </Box>
        </VStack>
    );
};
