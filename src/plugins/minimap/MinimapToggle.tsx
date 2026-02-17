import { Flex, Text } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { useResponsive } from '../../hooks/useResponsive';
import type { ChangeEvent } from 'react';

/**
 * MinimapToggle - Settings panel contribution for the minimap plugin.
 * Allows users to toggle the minimap visibility in settings.
 * Only renders on non-mobile devices.
 */
export const MinimapToggle: React.FC = () => {
  const { isMobile } = useResponsive();
  const settings = useCanvasStore((state) => state.settings);
  const updateSettings = useCanvasStore((state) => state.updateSettings);

  // Don't render on mobile
  if (isMobile) {
    return null;
  }

  return (
    <Flex justify="space-between" align="center">
      <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
        Show minimap
      </Text>
      <PanelSwitch
        isChecked={settings.showMinimap}
        onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ showMinimap: e.target.checked })}
        title="Show minimap"
        aria-label="Show minimap"
      />
    </Flex>
  );
};
