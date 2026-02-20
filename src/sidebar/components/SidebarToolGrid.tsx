import React, { type ComponentType } from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { Pin, PinOff } from 'lucide-react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { SidebarUtilityButton } from '../../ui/SidebarUtilityButton';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { pluginManager } from '../../utils/pluginManager';
import { useEnabledPlugins } from '../../hooks';
import { useCanvasStore } from '../../store/canvasStore';

interface ToolConfig {
  name: string;
  label: string;
  flex: number;
  icon?: ComponentType<{ size?: number }>;
  iconOnly?: boolean;
}

// Plugin configuration - only utility/settings tools
const UTILITY_TOOLS: ToolConfig[] = [
  { name: 'file', label: 'File', flex: 0 },
  { name: 'library', label: 'Lib', flex: 0 },
  { name: 'settings', label: 'Prefs', flex: 0 },
];

/**
 * Grid component for plugin/tool buttons in the sidebar
 * Note: Main action tools (select, pencil, text, shape, subpath, transform, edit)
 * are now in the ActionBar at the bottom of the screen
 */
export const SidebarToolGrid: React.FC = () => {
  const toolGridBorderColor = useColorModeValue('gray.600', 'whiteAlpha.700');
  // Get values from context
  const {
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    showLibraryPanel,
    canPinSidebar,
    isPinned,
    onToolClick,
    onTogglePin,
  } = useSidebarContext();
  const showLeftSidebar = useCanvasStore((state) => state.settings.showLeftSidebar);
  useEnabledPlugins();
  const sidebarToolbarButtons = pluginManager.getSidebarToolbarButtons();
  const effectiveUtilityTools = showLeftSidebar
    ? UTILITY_TOOLS.filter((tool) => tool.name !== 'library')
    : UTILITY_TOOLS;
  const effectiveSidebarToolbarButtons = showLeftSidebar
    ? sidebarToolbarButtons.filter(
      (button) => button.pluginId !== 'svgStructure' && button.pluginId !== 'generatorLibrary'
    )
    : sidebarToolbarButtons;
  const shouldUseHorizontalScroll = !showLeftSidebar;

  const renderPluginButton = (plugin: ToolConfig) => {
    const handleClick = () => {
      onToolClick(plugin.name);
    };

    // Determine if button should be active
    let isActive = false;

    if (showFilePanel) {
      isActive = plugin.name === 'file';
    } else if (showSettingsPanel) {
      isActive = plugin.name === 'settings';
    } else if (showLibraryPanel) {
      isActive = plugin.name === 'library';
    } else {
      isActive = activePlugin === plugin.name;
    }

    // Flex values: File=1, Library=2, Settings=2, Unpin=1 (small)
    const flexValue = plugin.flex;

    const button = (
      <SidebarUtilityButton
        key={plugin.name}
        label={plugin.label}
        isActive={isActive}
        onClick={handleClick}
        fullWidth={!shouldUseHorizontalScroll}
        flex={flexValue}
        icon={undefined}
        iconOnly={false}
        fontSize="sm"
        borderWidth="1px"
        inactiveBorderColor={toolGridBorderColor}
      />
    );
    return button;
  };

  const buttons = [
    ...effectiveUtilityTools.map((plugin) => ({ key: plugin.name, element: renderPluginButton(plugin) })),
    ...effectiveSidebarToolbarButtons.map((button) => {
      let label = button.label ?? pluginManager.getPlugin(button.pluginId)?.metadata.label ?? button.id;
      if (button.pluginId === 'svgStructure') {
        label = 'Struct';
      }

      return {
        key: `${button.pluginId}:${button.id}`,
        element: (
            <SidebarUtilityButton
              label={label}
              icon={undefined}
              iconOnly={false}
              onClick={() => onToolClick(button.pluginId)}
              isActive={activePlugin === button.pluginId}
              fullWidth={!shouldUseHorizontalScroll}
              flex={0}
              fontSize="sm"
              borderWidth="1px"
              inactiveBorderColor={toolGridBorderColor}
            />
        ),
      };
    }),
  ];

  return (
    <Box
      bg="surface.panel"
      position="relative"
      pl="6px"
      pt="4px"
    >
      <RenderCountBadgeWrapper componentName="SidebarToolGrid" position="top-left" />
      <HStack w="full" spacing={0} alignItems="stretch">
        <Box flex={1} minW={0} overflow={shouldUseHorizontalScroll ? 'hidden' : 'visible'}>
          <Box
            overflowX={shouldUseHorizontalScroll ? 'auto' : 'visible'}
            overflowY="hidden"
            css={shouldUseHorizontalScroll ? {
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none',
              },
            } : undefined}
          >
            <HStack
              spacing={shouldUseHorizontalScroll ? 1 : 2}
              w={shouldUseHorizontalScroll ? 'max-content' : 'full'}
              minW={shouldUseHorizontalScroll ? 'full' : undefined}
              pr={shouldUseHorizontalScroll ? 1 : 0}
              justifyContent={shouldUseHorizontalScroll ? undefined : 'space-between'}
            >
              {buttons.map((button) => (
                <Box
                  key={button.key}
                  flex={shouldUseHorizontalScroll ? '0 0 auto' : '1'}
                  w={shouldUseHorizontalScroll ? undefined : 'full'}
                  display="flex"
                  justifyContent="center"
                >
                  {button.element}
                </Box>
              ))}
            </HStack>
          </Box>
        </Box>
        <Box
          flexShrink={0}
          display="flex"
          alignItems="center"
          pl={0}
        >
          <ConditionalTooltip label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}>
            <SidebarUtilityButton
              label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              icon={isPinned ? PinOff : Pin}
              iconOnly
              fontSize="xs"
              fullWidth={false}
              flex={0}
              onClick={onTogglePin}
              isActive={false}
              isDisabled={!canPinSidebar}
              borderless
            />
          </ConditionalTooltip>
        </Box>
      </HStack>
    </Box>
  );
};
