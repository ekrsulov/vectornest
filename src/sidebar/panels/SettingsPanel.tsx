import React, { useState, useEffect } from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  useColorMode,
  Flex,
  Box,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useThemeColors } from '../../hooks/useThemeColors';

export const SettingsPanel: React.FC = () => {
  const { setColorMode } = useColorMode();
  const { panelHeader: { titleColor } } = useThemeColors();

  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('chakra-ui-color-mode');
    return (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'light';
  });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sync selected theme with Chakra color mode
  useEffect(() => {
    setColorMode(selectedTheme);
    localStorage.setItem('chakra-ui-color-mode', selectedTheme);
  }, [selectedTheme, setColorMode]);

  const handleResetApp = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsResetModalOpen(true);
  };

  const handleConfirmResetApp = () => {
    useCanvasStore.persist.clearStorage();
    window.location.reload();
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
  };

  return (
    <>
      <Panel disableExpandedFrame>
        <VStack spacing={1} align="stretch">
        {/* Theme - Always visible at the top */}
        <FormControl>
          <Flex align="center" gap={2}>
            <FormLabel fontSize="12px" fontWeight="bold" color={titleColor} mb={0} minW="42px">
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

          <Box pt={0.5}>
            <PanelStyledButton
              onClick={handleResetApp}
              size="sm"
              width="full"
              title="Reset Application - This will clear all data and reload the page"
              color="red.600"
              borderColor="red.400"
              _hover={{
                bg: 'red.50',
              }}
              _dark={{
                color: 'red.300',
                borderColor: 'red.400',
                _hover: {
                  bg: 'rgba(239, 68, 68, 0.14)',
                },
              }}
            >
              Reset App
            </PanelStyledButton>
          </Box>
        </VStack>
      </Panel>

      <Modal isOpen={isResetModalOpen} onClose={handleCloseResetModal} isCentered size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Reset App</ModalHeader>
          <ModalBody>
            <Text fontSize="sm">
              This will permanently remove all canvas content and reset the editor settings.
            </Text>
          </ModalBody>
          <ModalFooter gap={2}>
            <PanelStyledButton onClick={handleCloseResetModal} size="sm">
              Cancel
            </PanelStyledButton>
            <PanelStyledButton
              onClick={handleConfirmResetApp}
              size="sm"
              color="red.600"
              borderColor="red.400"
              _hover={{
                bg: 'red.50',
              }}
              _dark={{
                color: 'red.300',
                borderColor: 'red.400',
                _hover: {
                  bg: 'rgba(239, 68, 68, 0.14)',
                },
              }}
            >
              Reset App
            </PanelStyledButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
