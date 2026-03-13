import React from 'react';
import { IconButton, VStack, useColorModeValue, Box } from '@chakra-ui/react';
import { Undo2, Redo2, Search, PanelRightOpen, PanelRightClose, PanelLeftOpen, PanelLeftClose, X } from 'lucide-react';
import { useSidebarLayout } from '../hooks/useSidebarLayout';
import { useTemporalState } from '../hooks/useTemporalState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useIsGlobalUndoRedoDisabled } from '../utils/pluginManager';
import { useCanvasStore, type CanvasStore } from '../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { OPEN_COMMAND_PALETTE_EVENT } from '../plugins/commandPalette/events';
import ConditionalTooltip from './ConditionalTooltip';

export const UndoRedoControls: React.FC = () => {
    const { undo, redo, pastStates, futureStates } = useTemporalState();
    const isUndoRedoDisabledByPlugin = useIsGlobalUndoRedoDisabled();
    const {
        sidebarWidth,
        isSidebarOpen,
        isSidebarPinned,
        leftSidebarWidth,
        isLeftSidebarOpen,
        isLeftSidebarPinned,
        isWithoutDistractionMode,
    } = useSidebarLayout();
    const { toggleSidebar, toggleLeftSidebar, showLeftSidebar } = useCanvasStore(
        useShallow((state) => ({
            toggleSidebar: state.toggleSidebar,
            toggleLeftSidebar: state.toggleLeftSidebar,
            showLeftSidebar: state.settings.showLeftSidebar,
        }))
    );
    const { stopAnimations, stopCanvasPreview } = useCanvasStore(
        useShallow((state) => ({
            stopAnimations: (state as CanvasStore & { stopAnimations?: () => void }).stopAnimations,
            stopCanvasPreview: (state as CanvasStore & { stopCanvasPreview?: () => void }).stopCanvasPreview,
        }))
    );

    const canUndo = pastStates.length > 0;
    const canRedo = futureStates.length > 0;
    const openCommandPalette = () => {
        window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    };
    const handleStopAndResetApp = () => {
        stopAnimations?.();
        stopCanvasPreview?.();
        useCanvasStore.persist.clearStorage();
        window.location.reload();
    };

    // Use unified theme colors to match VirtualShiftButton
    const { toggle } = useThemeColors();
    const { inactive: { hoverBg: inactiveHoverBg, color: inactiveColor } } = toggle;
    const inactiveBg = 'rgba(255, 255, 255, 0.95)';
    const inactiveBgDark = 'rgba(26, 32, 44, 0.95)';

    const buttonProps = {
        bg: useColorModeValue(inactiveBg, inactiveBgDark),
        borderWidth: '1px',
        borderColor: 'border.toolbar',
        color: inactiveColor,
        shadow: 'none',
        _hover: { bg: inactiveHoverBg },
        _dark: { bg: inactiveBgDark, borderWidth: '1px', borderColor: 'border.toolbar' },
        size: 'sm',
        isRound: true,
        sx: {
            backdropFilter: 'blur(10px)',
        }
    };
    const dangerButtonProps = {
        ...buttonProps,
        bg: useColorModeValue('rgba(254, 226, 226, 0.98)', 'rgba(127, 29, 29, 0.95)'),
        borderColor: useColorModeValue('red.300', 'red.500'),
        color: useColorModeValue('red.700', 'red.200'),
        _hover: {
            bg: useColorModeValue('rgba(254, 202, 202, 0.98)', 'rgba(153, 27, 27, 0.98)'),
        },
        _dark: {
            bg: 'rgba(127, 29, 29, 0.95)',
            borderWidth: '1px',
            borderColor: 'red.500',
            color: 'red.200',
            _hover: {
                bg: 'rgba(153, 27, 27, 0.98)',
            },
        },
    };

    // Calculate dynamic right position based on sidebar state
    // Default spacing is 16px (matches top={4})
    const rightPosition = 16 + (isSidebarOpen ? sidebarWidth : 0);
    const leftPosition = 16 + (isLeftSidebarOpen ? leftSidebarWidth : 0);

    return (
        <>
            {showLeftSidebar && !isLeftSidebarPinned && !isWithoutDistractionMode && (
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
                    {!isSidebarPinned && !isWithoutDistractionMode && (
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

                    {import.meta.env.DEV && (
                        <ConditionalTooltip label="Stop Animations and Reset App" placement="left">
                            <IconButton
                                {...dangerButtonProps}
                                aria-label="Stop Animations and Reset App"
                                icon={<X size={18} />}
                                onClick={handleStopAndResetApp}
                            />
                        </ConditionalTooltip>
                    )}

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
