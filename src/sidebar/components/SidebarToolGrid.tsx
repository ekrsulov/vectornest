import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { Pin, PinOff } from 'lucide-react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { SidebarUtilityButton } from '../../ui/SidebarUtilityButton';
import { SidebarTabStrip, type SidebarTabStripItem } from '../../ui/SidebarTabStrip';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { pluginManager } from '../../utils/pluginManager';
import { useEnabledPlugins } from '../../hooks/useEnabledPlugins';
import { useCanvasStore } from '../../store/canvasStore';

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
  const pinBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100');
  const pinBorderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.200');
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

  return (
    <Box
      bg="surface.panel"
      position="relative"
      pl={{ base: 0, md: '2px' }}
      pr={{ base: 0, md: '2px' }}
      pt={{ base: 0, md: '1px' }}
    >
      <RenderCountBadgeWrapper componentName="SidebarToolGrid" position="top-left" />
      <HStack w="full" spacing={1} alignItems="stretch">
        <Box flex={1} minW={0} display="flex" alignItems="stretch">
          <SidebarTabStrip
            items={tabItems}
            scrollable={shouldUseHorizontalScroll}
          />
        </Box>
        {canPinSidebar && (
          <Box
            flexShrink={0}
            display="flex"
            alignItems="center"
            h="28px"
          >
            <ConditionalTooltip label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}>
              <SidebarUtilityButton
                label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                icon={isPinned ? PinOff : Pin}
                iconOnly
                visualStyle="tab"
                fontSize="xs"
                fullWidth={false}
                flex={0}
                onClick={onTogglePin}
                isActive={false}
                isDisabled={!canPinSidebar}
                inactiveBg={pinBg}
                inactiveBorderColor={pinBorderColor}
              />
            </ConditionalTooltip>
          </Box>
        )}
      </HStack>
    </Box>
  );
};
