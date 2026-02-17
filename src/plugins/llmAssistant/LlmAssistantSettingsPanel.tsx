import React, { useCallback, useMemo, useState } from 'react';
import { VStack, HStack, Text, IconButton, Box } from '@chakra-ui/react';
import { Eye, EyeOff } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { SliderControl } from '../../ui/SliderControl';
import type { LlmAssistantSlice } from './slice';

interface LlmAssistantSettingsPanelProps {
  hideTitle?: boolean;
  panelKey?: string;
}

export const LlmAssistantSettingsPanel: React.FC<LlmAssistantSettingsPanelProps> = ({ hideTitle = false, panelKey }) => {
  const settings = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).llmAssistant?.settings);
  const updateSettings = useCanvasStore((s) => (s as unknown as LlmAssistantSlice).updateLlmAssistantSettings);

  const [showApiKey, setShowApiKey] = useState(false);

  const providerOptions = useMemo(
    () => [
      { value: 'openai', label: 'OpenAI' },
      { value: 'openai-compatible', label: 'OpenAI Compatible' },
    ],
    []
  );

  const handleProviderChange = useCallback(
    (value: string) => updateSettings?.({ provider: value as 'openai' | 'openai-compatible' }),
    [updateSettings]
  );

  const handleBaseUrlChange = useCallback((value: string) => updateSettings?.({ baseUrl: value }), [updateSettings]);
  const handleModelChange = useCallback((value: string) => updateSettings?.({ model: value }), [updateSettings]);
  const handleApiKeyChange = useCallback((value: string) => updateSettings?.({ apiKey: value }), [updateSettings]);

  const temperature = settings?.temperature ?? 0;
  const maxTokens = settings?.maxTokens ?? 800;

  return (
    <Panel
      title="LLM Assistant"
      hideHeader={hideTitle}
      panelKey={panelKey}
      isCollapsible={!hideTitle}
      defaultOpen={hideTitle}
    >
      <VStack spacing={2} align="stretch" pb={0.5}>
        <VStack spacing={0.5} align="stretch">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Provider
          </Text>
          <Box display="flex">
            <CustomSelect
              value={settings?.provider ?? 'openai'}
              onChange={handleProviderChange}
              options={providerOptions}
              size="sm"
              flex="1"
            />
          </Box>
        </VStack>

        <VStack spacing={0.5} align="stretch">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Base URL
          </Text>
          <Box pl={0.5} pr={0.5}>
            <PanelTextInput
              value={settings?.baseUrl ?? ''}
              onChange={handleBaseUrlChange}
              placeholder="https://api.openai.com/v1"
              width="full"
            />
          </Box>
        </VStack>

        <VStack spacing={0.5} align="stretch">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Model
          </Text>
          <Box pl={0.5} pr={0.5}>
            <PanelTextInput
              value={settings?.model ?? ''}
              onChange={handleModelChange}
              placeholder="gpt-4o-mini"
              width="full"
            />
          </Box>
        </VStack>

        <VStack spacing={0.5} align="stretch">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            API Key
          </Text>
          <Box pl={0.5} pr={0.5}>
            <PanelTextInput
              value={settings?.apiKey ?? ''}
              onChange={handleApiKeyChange}
              placeholder="••••••••"
              width="full"
              type={showApiKey ? 'text' : 'password'}
              rightElement={
                <IconButton
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  icon={showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowApiKey((v) => !v)}
                  h="100%"
                  w="100%"
                  minW="20px"
                  borderRadius={0}
                />
              }
            />
          </Box>
        </VStack>

        <VStack spacing={1} align="stretch">
          <HStack spacing={1} align="center">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="80px" flexShrink={0}>
              Temperature
            </Text>
            <Box flex={1} pr={0.5}>
            <SliderControl
              value={temperature}
              min={0}
              max={1}
              step={0.1}
              onChange={(value) => updateSettings?.({ temperature: value })}
              formatter={(v) => v.toFixed(1)}
              valueWidth="65px"
              inline
            />
            </Box>
          </HStack>
          <HStack spacing={1} align="center">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }} minW="80px" flexShrink={0}>
              Max Tokens
            </Text>
            <Box flex={1} pr={0.5}>
            <SliderControl
              value={maxTokens}
              min={2000}
              max={16000}
              step={2000}
              onChange={(value) => updateSettings?.({ maxTokens: Math.floor(value) })}
              formatter={(v) => v.toString()}
              valueWidth="65px"
              inline
            />
            </Box>
          </HStack>
        </VStack>
      </VStack>
    </Panel>
  );
};
