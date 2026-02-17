import React from 'react';
import {
    HStack,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    Portal,
    useColorModeValue,
} from '@chakra-ui/react';
import {
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize,
    Maximize
} from 'lucide-react';
import { useThemeColors } from '../../hooks';
import ConditionalTooltip from '../../ui/ConditionalTooltip';

interface MinimapTopBarProps {
    isMinimized: boolean;
    onToggleMinimize: () => void;
    currentZoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    hasActiveArtboard: boolean;
    onFitArtboard: () => void;
}

export const MinimapTopBar: React.FC<MinimapTopBarProps> = ({
    isMinimized,
    onToggleMinimize,
    currentZoom,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    hasActiveArtboard,
    onFitArtboard,
}) => {
    const themeColors = useThemeColors();
    const { toolbar, menu } = themeColors;

    const bg = toolbar.bg;
    const borderColor = toolbar.borderColor;
    const borderWidth = useColorModeValue(0, 0);
    const dividerWidth = useColorModeValue(1, 0);
    const textColor = 'text.primary'; // Keeping existing color usage via string key if it works, or fallback to theme
    const iconColor = 'text.secondary';

    const buttonProps = {
        size: 'xs',
        variant: 'ghost',
        color: iconColor,
        _hover: { bg: useColorModeValue('gray.100', 'whiteAlpha.200') },
        isRound: true,
        sx: {
            minWidth: '24px',
            minHeight: '24px', // Smaller than standard toolbar buttons as these are xs
            borderRadius: 'full',
        }
    };

    // Standard menu styles from ToolGroupAction
    const menuListProps = {
        bg: menu.bg,
        border: '1px solid',
        borderColor: menu.borderColor,
        borderRadius: 'lg',
        boxShadow: 'lg',
        minW: '180px', // Standard width
        py: 1,
        zIndex: 101, // Keep high z-index for portal
        _focus: { outline: 'none', boxShadow: 'lg' },
    };

    const menuItemProps = {
        color: menu.iconColor,
        _hover: { bg: menu.hoverBg },
        _focus: { outline: 'none', boxShadow: 'none', bg: 'transparent' },
        _active: { outline: 'none', bg: 'transparent' },
        fontSize: "14px",
        fontWeight: "medium",
        px: 3,
        py: 2,
    };

    // Shared MenuButton props
    const menuButtonProps = {
        as: Button,
        size: "xs",
        variant: "ghost",
        fontWeight: "bold", // Removed fontFamily="mono"
        color: textColor,
        px: isMinimized ? 3 : 1, // Increased horizontal padding
        minW: isMinimized ? undefined : "50px",
        borderRadius: "full",
        _hover: { bg: useColorModeValue('gray.100', 'whiteAlpha.200') },
    };

    if (isMinimized) {
        return (
            <HStack
                spacing={1}
                bg={bg}
                p={1}
                borderWidth={borderWidth}
                borderColor={borderColor}
                borderRadius="full" // Match button shape
                shadow="none"
                height="32px"
                align="center"
            >
                <Menu autoSelect={false} placement="top-end">
                    <MenuButton {...menuButtonProps} rightIcon={undefined}>
                        {currentZoom}%
                    </MenuButton>
                    <Portal>
                        <MenuList {...menuListProps}>
                            <MenuItem icon={<ZoomIn size={16} />} onClick={onZoomIn} {...menuItemProps}>
                                Zoom In
                            </MenuItem>
                            <MenuItem icon={<ZoomOut size={16} />} onClick={onZoomOut} {...menuItemProps}>
                                Zoom Out
                            </MenuItem>
                            {hasActiveArtboard && (
                                <MenuItem icon={<Maximize size={16} />} onClick={onFitArtboard} {...menuItemProps}>
                                    Fit Artboard
                                </MenuItem>
                            )}
                            <MenuItem icon={<Maximize2 size={16} />} onClick={onResetZoom} {...menuItemProps}>
                                Reset Zoom
                            </MenuItem>
                        </MenuList>
                    </Portal>
                </Menu>

                <ConditionalTooltip label="Expand Minimap">
                    <IconButton
                        {...buttonProps}
                        aria-label="Maximize"
                        icon={<Maximize size={14} />}
                        onClick={onToggleMinimize}
                    />
                </ConditionalTooltip>
            </HStack>
        );
    }

    return (
        <HStack
            spacing={0}
            bg={bg}
            borderBottomWidth={dividerWidth}
            borderBottomColor={borderColor}
            height="32px"
            width="100%"
            px={1}
            justify="space-between"
            align="center"
        >
            <HStack spacing={0}>
                <ConditionalTooltip label="Zoom Out">
                    <IconButton
                        {...buttonProps}
                        aria-label="Zoom Out"
                        icon={<ZoomOut size={14} />}
                        onClick={onZoomOut}
                    />
                </ConditionalTooltip>

                <Menu autoSelect={false} placement="top">
                    <MenuButton {...menuButtonProps}>
                        {currentZoom}%
                    </MenuButton>
                    <Portal>
                        <MenuList {...menuListProps}>
                            {hasActiveArtboard && (
                                <MenuItem icon={<Maximize size={16} />} onClick={onFitArtboard} {...menuItemProps}>
                                    Fit Artboard
                                </MenuItem>
                            )}
                            <MenuItem icon={<Maximize2 size={16} />} onClick={onResetZoom} {...menuItemProps}>
                                Reset Zoom
                            </MenuItem>
                        </MenuList>
                    </Portal>
                </Menu>

                <ConditionalTooltip label="Zoom In">
                    <IconButton
                        {...buttonProps}
                        aria-label="Zoom In"
                        icon={<ZoomIn size={14} />}
                        onClick={onZoomIn}
                    />
                </ConditionalTooltip>
            </HStack>

            <ConditionalTooltip label="Minimize Minimap">
                <IconButton
                    {...buttonProps}
                    aria-label="Minimize"
                    icon={<Minimize size={14} />}
                    onClick={onToggleMinimize}
                />
            </ConditionalTooltip>
        </HStack >
    );
};
