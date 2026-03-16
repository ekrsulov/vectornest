import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useEnabledPlugins } from '../../hooks/useEnabledPlugins';
import { useResponsive } from '../../hooks/useResponsive';
import { logger, LogLevel } from '../../utils/logger';
import { Panel } from '../../ui/Panel';
import { pluginManager } from '../../utils/pluginManager';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { useFullscreen } from './settings/useFullscreen';
import { DEFAULT_MODE } from '../../constants';

export const SettingsConfigurationPanel: React.FC = () => {
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);
  const setMode = useCanvasStore(state => state.setMode);
  const setShowSettingsPanel = useCanvasStore(state => state.setShowSettingsPanel);

  useEnabledPlugins();

  const { isMobile } = useResponsive();
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.WARN);
  const [showCallerInfo, setShowCallerInfo] = useState(false);
  const [keyboardPrecision, setKeyboardPrecision] = useState(settings.keyboardMovementPrecision);
  const { isFullscreen, setFullscreen } = useFullscreen();

  useEffect(() => {
    const currentLevel = logger.getLogLevel();
    setLogLevel(currentLevel);

    const currentShowCallerInfo = logger.getShowCallerInfo();
    setShowCallerInfo(currentShowCallerInfo);
  }, []);

  const handleLogLevelChange = (newLevel: LogLevel) => {
    setLogLevel(newLevel);
    logger.setConfig({ level: newLevel });
    logger.info('Log level changed to', getLogLevelName(newLevel));
  };

  const handleCallerInfoToggle = (enabled: boolean) => {
    setShowCallerInfo(enabled);
    logger.setShowCallerInfo(enabled);
    logger.info('Caller info display', enabled ? 'enabled' : 'disabled');
  };

  const handleKeyboardPrecisionChange = (value: number) => {
    if (value >= 0 && value <= 10) {
      setKeyboardPrecision(value);
      updateSettings({ keyboardMovementPrecision: value });
      logger.debug('Keyboard movement precision changed to', value);
    }
  };

  const handleWithoutDistractionModeToggle = (enabled: boolean) => {
    updateSettings({ withoutDistractionMode: enabled });

    if (!enabled) {
      return;
    }

    setShowSettingsPanel(false);
    setMode(DEFAULT_MODE);
  };

  const getLogLevelName = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'WARN';
    }
  };

  const logLevelOptions = [
    { value: LogLevel.DEBUG.toString(), label: 'DEBUG' },
    { value: LogLevel.INFO.toString(), label: 'INFO' },
    { value: LogLevel.WARN.toString(), label: 'WARN' },
    { value: LogLevel.ERROR.toString(), label: 'ERROR' },
  ];

  return (
    <Panel
      title="Configuration"
      isCollapsible
      defaultOpen={false}
    >
      <VStack spacing={2} align="stretch" pt={0.5}>
        <Box pr={0.5}>
          <SliderControl
            label="Precision"
            value={keyboardPrecision}
            min={0}
            max={4}
            step={1}
            onChange={handleKeyboardPrecisionChange}
            title="Number of decimal places for keyboard movement (0 = integers only)"
          />
        </Box>

        {import.meta.env.DEV && (
          <FormControl>
            <Flex align="center" gap={2}>
              <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={0} minW="60px">
                Log Level
              </FormLabel>
              <CustomSelect
                value={logLevel.toString()}
                onChange={(value) => handleLogLevelChange(parseInt(value, 10) as LogLevel)}
                options={logLevelOptions}
                size="sm"
              />
            </Flex>
          </FormControl>
        )}

        {import.meta.env.DEV && (
          <Flex justify="space-between" align="center">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Show caller info in logs
            </Text>
            <PanelSwitch
              isChecked={showCallerInfo}
              onChange={(e) => handleCallerInfoToggle(e.target.checked)}
              title="Show caller info in logs"
              aria-label="Show caller info in logs"
            />
          </Flex>
        )}

        {import.meta.env.DEV && (
          <Flex justify="space-between" align="center">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Show render count badges (debug)
            </Text>
            <PanelSwitch
              isChecked={settings.showRenderCountBadges}
              onChange={(e) => updateSettings({ showRenderCountBadges: e.target.checked })}
              title="Show render count badges"
              aria-label="Show render count badges"
            />
          </Flex>
        )}

        <Flex justify="space-between" align="center">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Scale stroke with zoom
          </Text>
          <PanelSwitch
            isChecked={settings.scaleStrokeWithZoom}
            onChange={(e) => updateSettings({ scaleStrokeWithZoom: e.target.checked })}
            title="Scale stroke with zoom"
            aria-label="Scale stroke with zoom"
          />
        </Flex>

        {!isMobile && (
          <Flex justify="space-between" align="center">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Show tooltips
            </Text>
            <PanelSwitch
              isChecked={settings.showTooltips}
              onChange={(e) => updateSettings({ showTooltips: e.target.checked })}
              title="Show tooltips"
              aria-label="Show tooltips"
            />
          </Flex>
        )}

        <Flex justify="space-between" align="center">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Show left sidebar
          </Text>
          <PanelSwitch
            isChecked={!isMobile && settings.showLeftSidebar}
            onChange={(e) => updateSettings({ showLeftSidebar: e.target.checked })}
            isDisabled={isMobile}
            title="Show left sidebar (Structure/Library)"
            aria-label="Show left sidebar"
          />
        </Flex>

        <Flex justify="space-between" align="center">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Non distraction mode
          </Text>
          <PanelSwitch
            isChecked={Boolean(settings.withoutDistractionMode)}
            onChange={(e) => handleWithoutDistractionModeToggle(e.target.checked)}
            title="Show only the expandable tool panel and command palette"
            aria-label="Non distraction mode"
          />
        </Flex>

        <Flex justify="space-between" align="center">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Full Screen
          </Text>
          <PanelSwitch
            isChecked={isFullscreen}
            onChange={(e) => {
              void setFullscreen(e.target.checked);
            }}
            title="Full Screen"
            aria-label="Full Screen"
          />
        </Flex>

        {pluginManager.getActions('settings-panel').map((action) => {
          const ActionComponent = action.component as React.ComponentType<Record<string, unknown>>;
          return <ActionComponent key={action.id} />;
        })}
      </VStack>
    </Panel>
  );
};