import React from 'react';
import { HStack, Box } from '@chakra-ui/react';
import { Menu } from 'lucide-react';
import { FloatingToolbarShell } from './FloatingToolbarShell';
import { ToolbarIconButton } from './ToolbarIconButton';
import { pluginManager } from '../utils/pluginManager';
import { useCanvasStore } from '../store/canvasStore';

interface ExtraToolInfo {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface ExtraToolsBarProps {
  /** Array of extra tools to display */
  extraTools: ExtraToolInfo[];
  /** Current active mode/tool */
  activeMode: string | null;
  /** Active tool highlight text color */
  activeColor: string;
  /** Effective sidebar width for positioning */
  sidebarWidth: number;
  /** Whether to show grid rulers (affects positioning) */
  showGridRulers: boolean;
  /** Whether elements are currently being dragged */
  isDraggingElements: boolean;
  /** Callback when a tool is selected */
  onToolSelect: (toolId: string) => void;
  /** Current selection (used only for disable checks) */
  selectedIds: string[];
}

/**
 * ExtraToolsBar - Secondary toolbar for overflow tools on mobile.
 * Extracted from TopActionBar to reduce complexity.
 */
export const ExtraToolsBar: React.FC<ExtraToolsBarProps> = ({
  extraTools,
  activeMode,
  activeColor,
  sidebarWidth,
  showGridRulers,
  isDraggingElements,
  onToolSelect,
  selectedIds,
}) => {
  // Compute disabled states once instead of calling getState() per tool in the render loop
  const disabledMap = React.useMemo(() => {
    if (isDraggingElements) return {};
    const storeState = useCanvasStore.getState();
    const stateWithSelection = { ...storeState, selectedIds };
    return Object.fromEntries(
      extraTools.map(({ id }) => [id, pluginManager.isToolDisabled(id, stateWithSelection)])
    );
  }, [extraTools, isDraggingElements, selectedIds]);

  if (extraTools.length === 0) {
    return null;
  }

  return (
    <FloatingToolbarShell
      toolbarPosition="top"
      sidebarWidth={sidebarWidth}
      showGridRulers={showGridRulers}
      sx={{
        marginTop: '42px',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <HStack
        spacing={{ base: 0, md: 0 }}
        justify="center"
        position="relative"
      >
        {extraTools.map(({ id, icon: Icon, label }) => {
          const isDisabled = disabledMap[id] ?? false;

          return (
            <Box
              key={id}
              position="relative"
              zIndex={1}
            >
              <ToolbarIconButton
                icon={Icon ?? Menu}
                label={label}
                onClick={() => onToolSelect(id)}
                variant="ghost"
                colorScheme="gray"
                bg={activeMode === id ? 'transparent' : undefined}
                color={activeMode === id ? activeColor : undefined}
                _hover={activeMode === id ? { bg: 'transparent' } : undefined}
                tooltip={label}
                isDisabled={isDisabled}
                showTooltip={true}
                title={label}
              />
            </Box>
          );
        })}
      </HStack>
    </FloatingToolbarShell>
  );
};
