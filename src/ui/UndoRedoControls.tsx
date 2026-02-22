import React from 'react';
import { IconButton, VStack, useColorModeValue, Box } from '@chakra-ui/react';
import { Undo2, Redo2, Search, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { useTemporalState, useSidebarLayout, useThemeColors } from '../hooks';
import { useIsGlobalUndoRedoDisabled } from '../utils/pluginManager';
import { useCanvasStore } from '../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { OPEN_COMMAND_PALETTE_EVENT } from '../plugins/commandPalette/events';
import ConditionalTooltip from './ConditionalTooltip';

export const UndoRedoControls: React.FC = () => {
    const { undo, redo, pastStates, futureStates } = useTemporalState();
    const isUndoRedoDisabledByPlugin = useIsGlobalUndoRedoDisabled();
    const { sidebarWidth, isSidebarOpen, isSidebarPinned, leftSidebarWidth, isLeftSidebarOpen, isLeftSidebarPinned } = useSidebarLayout();
    const { toggleSidebar, toggleLeftSidebar, showLeftSidebar } = useCanvasStore(
        useShallow((state) => ({
            toggleSidebar: state.toggleSidebar,
            toggleLeftSidebar: state.toggleLeftSidebar,
            showLeftSidebar: state.settings.showLeftSidebar,
        }))
    );

    const canUndo = pastStates.length > 0;
    const canRedo = futureStates.length > 0;
    const openCommandPalette = () => {
        window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    };

    // Use unified theme colors to match VirtualShiftButton
    const { toggle } = useThemeColors();
    const { inactive: { hoverBg: inactiveHoverBg, color: inactiveColor } } = toggle;
    const inactiveBg = 'rgba(255, 255, 255, 0.95)';
    const inactiveBgDark = 'rgba(26, 32, 44, 0.95)';

    const buttonProps = {
        bg: useColorModeValue(inactiveBg, inactiveBgDark),
        borderWidth: '0px',
        borderColor: 'transparent',
        color: inactiveColor,
        shadow: 'none',
        _hover: { bg: inactiveHoverBg },
        _dark: { bg: inactiveBgDark, borderWidth: '0px', borderColor: 'transparent' },
        size: 'sm',
        isRound: true,
        sx: {
            backdropFilter: 'blur(10px)',
        }
    };

    // Calculate dynamic right position based on sidebar state
    // Default spacing is 16px (matches top={4})
    const rightPosition = 16 + (isSidebarOpen ? sidebarWidth : 0);
    const leftPosition = 16 + (isLeftSidebarOpen ? leftSidebarWidth : 0);

    return (
        <>
            {showLeftSidebar && !isLeftSidebarPinned && (
                <Box
                    position="absolute"
                    top={4}
                    left={`${leftPosition}px`}
                    zIndex={100}
                    transition="left 0.2s ease-in-out"
                >
                    <ConditionalTooltip label={isLeftSidebarOpen ? "Close Left Sidebar" : "Open Left Sidebar"} placement="right">
                        <IconButton
                            {...buttonProps}
                            aria-label="Toggle Left Sidebar"
                            icon={isLeftSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                            onClick={toggleLeftSidebar}
                        />
                    </ConditionalTooltip>
                </Box>
            )}

            <Box
                position="absolute"
                top={4}
                right={`${rightPosition}px`}
                zIndex={100}
                transition="right 0.2s ease-in-out"
            >
                <VStack spacing={2}>
                    {/* Sidebar Toggle - Only visible when unpinned */}
                    {!isSidebarPinned && (
                        <ConditionalTooltip label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"} placement="left">
                            <IconButton
                                {...buttonProps}
                                aria-label="Toggle Sidebar"
                                icon={isSidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                                onClick={toggleSidebar}
                            />
                        </ConditionalTooltip>
                    )}

                    <ConditionalTooltip label="Command Bar (Cmd+K / Ctrl+K)" placement="left">
                        <IconButton
                            {...buttonProps}
                            aria-label="Open Command Bar"
                            icon={<Search size={18} />}
                            onClick={openCommandPalette}
                        />
                    </ConditionalTooltip>

                    <ConditionalTooltip label="Undo (Cmd+Z)" placement="left">
                        <IconButton
                            {...buttonProps}
                            aria-label="Undo"
                            icon={<Undo2 size={18} />}
                            onClick={() => undo()}
                            isDisabled={!canUndo || isUndoRedoDisabledByPlugin}
                        />
                    </ConditionalTooltip>

                    {canRedo && (
                        <ConditionalTooltip label="Redo (Cmd+Shift+Z)" placement="left">
                            <IconButton
                                {...buttonProps}
                                aria-label="Redo"
                                icon={<Redo2 size={18} />}
                                onClick={() => redo()}
                                isDisabled={!canRedo || isUndoRedoDisabledByPlugin}
                            />
                        </ConditionalTooltip>
                    )}
                </VStack>
            </Box>
        </>
    );
};
