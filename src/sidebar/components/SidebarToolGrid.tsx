import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { FolderOpen, FolderTree, LibraryBig, Pin, PinOff, Settings2, ShieldCheck } from 'lucide-react';
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
  tooltip: string;
  icon: React.ComponentType<{ size?: number }>;
}

// Plugin configuration - only utility/settings tools
const UTILITY_TOOLS: ToolConfig[] = [
  { name: 'file', label: 'File', tooltip: 'File', icon: FolderOpen },
  { name: 'library', label: 'Library', tooltip: 'Library', icon: LibraryBig },
  { name: 'settings', label: 'Preferences', tooltip: 'Preferences', icon: Settings2 },
];

/**
 * Grid component for plugin/tool buttons in the sidebar
 * Note: Main action tools (select, pencil, text, shape, subpath, transform, edit)
 * are now in the ActionBar at the bottom of the screen
 */
export const SidebarToolGrid: React.FC = () => {
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
      tooltip: plugin.tooltip,
      icon: plugin.icon,
      iconOnly: true,
      isActive: isToolActive(plugin.name),
      onClick: () => onToolClick(plugin.name),
    })),
    ...effectiveSidebarToolbarButtons.map((button) => {
      const pluginLabel = pluginManager.getPlugin(button.pluginId)?.metadata.label ?? button.id;
      const label =
        button.pluginId === 'svgStructure'
          ? 'Structure'
          : button.label ?? pluginLabel;
      const tooltip =
        button.pluginId === 'svgStructure'
          ? 'Structure'
          : button.pluginId === 'generatorLibrary'
            ? 'Generators'
            : button.pluginId === 'animLibrary'
              ? 'Animation'
          : button.pluginId === 'auditLibrary'
            ? 'Audit'
            : button.label ?? pluginLabel;
      const icon =
        button.pluginId === 'svgStructure'
          ? FolderTree
          : button.pluginId === 'auditLibrary'
            ? ShieldCheck
            : button.icon;

      return {
        key: `${button.pluginId}:${button.id}`,
        label,
        tooltip,
        icon,
        iconOnly: true,
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
        spacing={1}
        minH="34px"
        alignItems="center"
        px={1.5}
        py={1}
        borderBottomWidth={SIDEBAR_UTILITY_BORDER_WIDTH}
        borderBottomStyle="solid"
        borderColor={topRowBorderColor}
      >
        <Box flex={1} minW={0} display="flex" alignItems="stretch">
          <SidebarTabStrip
            items={tabItems}
            scrollable={shouldUseHorizontalScroll}
            tabWidth={shouldUseHorizontalScroll ? '28px' : undefined}
            variant="iconRail"
          />
        </Box>
        {canPinSidebar && (
          <Box
            flexShrink={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
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
                visualStyle="segment"
                borderless
              />
            </ConditionalTooltip>
          </Box>
        )}
      </HStack>
    </Box>
  );
};
