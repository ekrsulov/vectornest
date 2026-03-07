import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { Pin, PinOff } from 'lucide-react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { SidebarUtilityButton, SIDEBAR_UTILITY_BORDER_WIDTH } from '../../ui/SidebarUtilityButton';
import { SidebarTabStrip, type SidebarTabStripItem } from '../../ui/SidebarTabStrip';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { pluginManager } from '../../utils/pluginManager';
import { useEnabledPlugins } from '../../hooks/useEnabledPlugins';
import { useCanvasStore } from '../../store/canvasStore';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ToolConfig {
  name: string;
  label: string;
}

// Plugin configuration - only utility/settings tools
const UTILITY_TOOLS: ToolConfig[] = [
  { name: 'file', label: 'File' },
  { name: 'library', label: 'Lib' },
  { name: 'settings', label: 'Prefs' },
];

/**
 * Grid component for plugin/tool buttons in the sidebar
 * Note: Main action tools (select, pencil, text, shape, subpath, transform, edit)
 * are now in the ActionBar at the bottom of the screen
 */
export const SidebarToolGrid: React.FC = () => {
  const pinBorderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.200');
  const defaultTopRowBorderColor = useColorModeValue('blackAlpha.300', 'whiteAlpha.400');
  const {
    toggle: {
      active: { bg: activeTabFill },
    },
  } = useThemeColors();
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
      (button) => button.pluginId !== 'svgStructure' && button.pluginId !== 'generatorLibrary' && button.pluginId !== 'animLibrary'
    )
    : sidebarToolbarButtons;
  const shouldUseHorizontalScroll = !showLeftSidebar;

  const isToolActive = (toolName: string) => {
    let isActive = false;

    if (showFilePanel) {
      isActive = toolName === 'file';
    } else if (showSettingsPanel) {
      isActive = toolName === 'settings';
    } else if (showLibraryPanel) {
      isActive = toolName === 'library';
    } else {
      isActive = activePlugin === toolName;
    }

    return isActive;
  };

  const tabItems: SidebarTabStripItem[] = [
    ...effectiveUtilityTools.map((plugin) => ({
      key: plugin.name,
      label: plugin.label,
      isActive: isToolActive(plugin.name),
      onClick: () => onToolClick(plugin.name),
    })),
    ...effectiveSidebarToolbarButtons.map((button) => {
      let label = button.label ?? pluginManager.getPlugin(button.pluginId)?.metadata.label ?? button.id;
      if (button.pluginId === 'svgStructure') {
        label = 'Struct';
      }

      return {
        key: `${button.pluginId}:${button.id}`,
        label,
        isActive: activePlugin === button.pluginId,
        onClick: () => onToolClick(button.pluginId),
      };
    }),
  ];
  const hasActiveTab = tabItems.some((item) => item.isActive);
  const topRowBorderColor = hasActiveTab ? activeTabFill : defaultTopRowBorderColor;

  return (
    <Box
      bg="surface.panel"
      position="relative"
      pl={0}
      pr={0}
      pt={0}
    >
      <RenderCountBadgeWrapper componentName="SidebarToolGrid" position="top-left" />
      <HStack
        w="full"
        spacing={0}
        h="26px"
        alignItems="stretch"
        borderBottomWidth={SIDEBAR_UTILITY_BORDER_WIDTH}
        borderBottomStyle="solid"
        borderColor={topRowBorderColor}
      >
        <Box flex={1} minW={0} display="flex" alignItems="stretch">
          <SidebarTabStrip
            items={tabItems}
            scrollable={shouldUseHorizontalScroll}
            flat
          />
        </Box>
        {canPinSidebar && (
          <Box
            flexShrink={0}
            display="flex"
            alignItems="center"
            h="26px"
            borderLeftWidth="2px"
            borderLeftStyle="solid"
            borderColor={pinBorderColor}
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
                visualStyle="tab"
                tabShape="none"
                borderless
              />
            </ConditionalTooltip>
          </Box>
        )}
      </HStack>
    </Box>
  );
};
