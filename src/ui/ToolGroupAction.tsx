import React from 'react';
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    IconButton,
    useColorModeValue,
    Box
} from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import { useThemeColors } from '../hooks';
import ConditionalTooltip from './ConditionalTooltip';

interface ToolGroupActionProps {
    label: string;
    icon: LucideIcon | React.ComponentType<{ size?: number }>;
    isActive: boolean;
    tools: Array<{
        id: string;
        label: string;
        icon: LucideIcon | React.ComponentType<{ size?: number }>;
        isDisabled?: boolean;
    }>;
    currentToolId?: string;
    onToolSelect: (toolId: string) => void;
    isDisabled?: boolean;
    /**
     * Counter badge value (number or string)
     */
    counter?: number | string;
    counterColor?: 'gray' | 'red';
    /**
     * If true, clicking when inactive will activate the default tool
     * instead of opening the menu
     */
    toolGroup?: 'basic' | 'creation' | 'advanced';
    /**
     * Default tool to activate when clicking an inactive button
     */
    defaultToolId?: string;
}

export const ToolGroupAction: React.FC<ToolGroupActionProps> = ({
    label,
    icon: Icon,
    isActive,
    tools,
    currentToolId,
    onToolSelect,
    isDisabled = false,
    counter,
    counterColor = 'gray',
    toolGroup,
    defaultToolId,
}) => {
    const themeColors = useThemeColors();
    const { activeTool: { bg: activeBg, color: activeColor }, counter: counterColors, menu: menuColors } = themeColors;
    const menuBg = useColorModeValue('white', 'gray.800');
    const hoverBg = useColorModeValue('gray.100', 'whiteAlpha.200');

    // Determine badge colors based on theme
    const badgeColors = counterColor === 'red' ? counterColors.danger : counterColors.neutral;

    // If there are no tools, render nothing or disabled state
    if (tools.length === 0) return null;

    // Custom click handler: if inactive, activate default tool; if active, let Menu handle it
    const handleButtonClick = (e: React.MouseEvent) => {
        if (toolGroup && defaultToolId && !isActive) {
            // Prevent menu from opening
            e.preventDefault();
            e.stopPropagation();
            // Activate the default tool
            onToolSelect(defaultToolId);
        }
        // If isActive, let the Menu component handle opening
    };

    return (
        <Menu placement="top" offset={[0, 8]}>
        <ConditionalTooltip label={label} openDelay={500} placement="top">
            <Box position="relative">
                    <MenuButton
                        as={IconButton}
                        aria-label={label}
                        icon={<Icon size={16} />} // Match size with ToolbarIconButton
                        variant="ghost"
                        isDisabled={isDisabled}
                        bg={isActive ? activeBg : undefined}
                        color={isActive ? activeColor : undefined}
                        _hover={{
                            bg: isActive ? activeBg : hoverBg,
                        }}
                        _active={{
                            bg: isActive ? activeBg : hoverBg,
                        }}
                        size="xs"
                        sx={{
                            minHeight: '32px',
                            minWidth: '32px',
                            borderRadius: 'full',
                        }}
                        onClick={handleButtonClick}
                    />
                    {counter !== undefined && counter !== 0 && counter !== '' && (
                        <Box
                            position="absolute"
                            bottom="-3px"
                            left="50%"
                            transform="translateX(-50%)"
                            bg={badgeColors.bg}
                            color={badgeColors.color}
                            borderRadius="full"
                            minW="16px"
                            w="fit-content"
                            h="11px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="9px"
                            fontWeight="bold"
                            px="3px"
                            zIndex={1}
                        >
                            {counter}
                        </Box>
                    )}
            </Box>
        </ConditionalTooltip>
            <MenuList
                bg={menuBg}
                border="1px solid"
                borderColor={menuColors.borderColor}
                borderRadius="lg"
                boxShadow="lg"
                minW="180px"
                py={1}
                _focus={{ outline: 'none', boxShadow: 'lg' }}
            >
                {tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isToolActive = tool.id === currentToolId;

                    return (
                        <MenuItem
                            key={tool.id}
                            onClick={() => onToolSelect(tool.id)}
                            icon={<ToolIcon size={16} />}
                            command={isToolActive ? '✓' : undefined}
                            isDisabled={tool.isDisabled}
                            color={menuColors.iconColor}
                            _hover={{ bg: hoverBg }}
                            _focus={{ outline: 'none', boxShadow: 'none', bg: 'transparent' }}
                            _active={{ outline: 'none', bg: 'transparent' }}
                            fontSize="14px"
                            fontWeight="medium"
                            px={3}
                            py={2}
                        >
                            {tool.label}
                        </MenuItem>
                    );
                })}
            </MenuList>
        </Menu>
    );
};
