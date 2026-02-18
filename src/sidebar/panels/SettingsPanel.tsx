import React, { useState, useEffect } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  useColorMode,
  Flex,
  Text,
  Box,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useEnabledPlugins, useResponsive } from '../../hooks';
import { logger, LogLevel } from '../../utils';
import { Panel } from '../../ui/Panel';
import { pluginManager } from '../../utils/pluginManager';
// No icon button here - we show text label instead
import { PanelSwitch } from '../../ui/PanelSwitch';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { CustomSelect } from '../../ui/CustomSelect';
import { useFullscreen } from './settings/useFullscreen';

export const SettingsPanel: React.FC = () => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const settings = useCanvasStore(state => state.settings);
  const updateSettings = useCanvasStore(state => state.updateSettings);
  const { setColorMode } = useColorMode();

  // Subscribe to enabledPlugins to trigger re-render when plugins are toggled
  useEnabledPlugins();

  // Use unified responsive hook
  const { isMobile } = useResponsive();

  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('chakra-ui-color-mode');
    return (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'light';
  });
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.WARN); // Default log level
  const [showCallerInfo, setShowCallerInfo] = useState(false);
  const [keyboardPrecision, setKeyboardPrecision] = useState(settings.keyboardMovementPrecision);
  const { isFullscreen, setFullscreen } = useFullscreen();

  // Sync selected theme with Chakra color mode
  useEffect(() => {
    setColorMode(selectedTheme);
    localStorage.setItem('chakra-ui-color-mode', selectedTheme);
  }, [selectedTheme, setColorMode]);

  // Initialize log level and caller info from current logger config
  useEffect(() => {
    const currentLevel = logger.getLogLevel();
    setLogLevel(currentLevel);

    const currentShowCallerInfo = logger.getShowCallerInfo();
    setShowCallerInfo(currentShowCallerInfo);
  }, []);
  const handleLogLevelChange = (newLevel: LogLevel) => {
    setLogLevel(newLevel);
    // Apply the log level change immediately (online)
    logger.setConfig({ level: newLevel });
    logger.info('Log level changed to', getLogLevelName(newLevel));
  };

  const handleCallerInfoToggle = (enabled: boolean) => {
    setShowCallerInfo(enabled);
    // Apply the caller info setting immediately (online)
    logger.setShowCallerInfo(enabled);
    logger.info('Caller info display', enabled ? 'enabled' : 'disabled');
  };

  const handleKeyboardPrecisionChange = (value: number) => {
    // Validate the input: must be between 0 and 10
    if (value >= 0 && value <= 10) {
      setKeyboardPrecision(value);
      updateSettings({ keyboardMovementPrecision: value });
      logger.debug('Keyboard movement precision changed to', value);
    }
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
    <Panel>
      <VStack spacing={1} align="stretch">
        {/* Theme - Always visible at the top */}
        <FormControl>
          <Flex align="center" gap={2}>
            <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={0} minW="40px">
              Theme
            </FormLabel>
            <JoinedButtonGroup
              key={selectedTheme}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
              value={selectedTheme}
              onChange={setSelectedTheme}
              disableTooltips
            />
          </Flex>
        </FormControl>

        {/* Configuration Panel */}
        <Panel
          title="Configuration"
          isCollapsible={true}
          defaultOpen={false}
        >
          <VStack spacing={2} align="stretch" pt={0.5}>
            {/* Precision */}
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

            {/* Log Level Selector - Only in development */}
            {import.meta.env.DEV && (
              <FormControl>
                <Flex align="center" gap={2}>
                  <FormLabel fontSize="12px" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.400' }} mb={0} minW="60px">
                    Log Level
                  </FormLabel>
                  <CustomSelect
                    value={logLevel.toString()}
                    onChange={(value) => handleLogLevelChange(parseInt(value) as LogLevel)}
                    options={logLevelOptions}
                    size="sm"
                  />
                </Flex>
              </FormControl>
            )}

            {/* Show Caller Info Switch - Only in development */}
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

            {/* Show Render Count Badges */}
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

            {/* Scale Stroke With Zoom */}
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

            {/* Show Tooltips - Only on desktop */}
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

            {/* Left Sidebar */}
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

            {/* Fullscreen toggle (available on both desktop and mobile now) */}
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

            {/* Plugin Actions */}
            {pluginManager.getActions('settings-panel').map((action) => {
              const ActionComponent = action.component as React.ComponentType<Record<string, unknown>>;
              return <ActionComponent key={action.id} />;
            })}
          </VStack>
        </Panel>
      </VStack>
    </Panel>
  );
};
