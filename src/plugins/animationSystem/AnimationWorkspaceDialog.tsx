import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  HStack,
  Text,
  Badge,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasElement } from '../../types';
import type { AnimationPluginSlice, DraftAnimation, SVGAnimation } from './types';
import { TimelineTab, EditorTab, PreviewTab, SyncTab } from './tabs';

// Singleton pattern
let isMounted = false;

export const AnimationWorkspaceDialog: React.FC = () => {
  const [isActiveInstance, setIsActiveInstance] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [editingAnimationId, setEditingAnimationId] = useState<string | null>(null);
  const [previewAnimationId, setPreviewAnimationId] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<DraftAnimation | null>(null);
  const [previewMode, setPreviewMode] = useState<'animation' | 'draft'>('animation');

  useEffect(() => {
    if (!isMounted) {
      isMounted = true;
      setIsActiveInstance(true);
    }
    return () => {
      if (isActiveInstance) {
        isMounted = false;
      }
    };
  }, [isActiveInstance]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const badgeBg = useColorModeValue('gray.100', 'gray.700');
  const badgeColor = useColorModeValue('gray.700', 'gray.300');
  const dummyRef = useRef<HTMLDivElement>(null);

  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const elements = useCanvasStore((state) => state.elements);
  const animations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animations ?? []);
  const animationState = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animationState);
  const animationSync = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animationSync);
  const setAnimationWorkspaceOpen = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).setAnimationWorkspaceOpen);

  const isWorkspaceOpen = animationState?.isWorkspaceOpen ?? false;

  const selectedElement = useMemo<CanvasElement | undefined>(() => {
    if (!selectedIds.length) return undefined;
    return elements.find((el) => el.id === selectedIds[0]);
  }, [elements, selectedIds]);

  if (!isActiveInstance || !isWorkspaceOpen) {
    return null;
  }

  const handleClose = () => {
    setAnimationWorkspaceOpen?.(false);
  };

  const handleEditAnimation = (anim: SVGAnimation) => {
    // Set the animation ID to edit and switch to Editor tab (index 1)
    setEditingAnimationId(anim.id);
    setActiveTabIndex(1);
  };

  const handlePreviewAnimation = (anim: SVGAnimation) => {
    setPreviewMode('animation');
    setPreviewDraft(null);
    setPreviewAnimationId(anim.id);
    setActiveTabIndex(2);
  };

  const handlePreviewDraft = (draft: DraftAnimation | null) => {
    setPreviewMode('draft');
    setPreviewDraft(draft ?? null);
    setPreviewAnimationId(draft?.id ?? null);
    setActiveTabIndex(2);
  };

  const chainsCount = animationSync?.chains?.length ?? 0;

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      size="xl"
      initialFocusRef={dummyRef}
    >
      <ModalOverlay />
      <ModalContent bg={bgColor} maxH="80vh" display="flex" flexDirection="column">
        <ModalHeader borderBottom="1px" borderColor={borderColor} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} flexShrink={0}>
          <div ref={dummyRef} tabIndex={-1} style={{ position: 'absolute', opacity: 0 }} />
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Text>Animation Workspace</Text>
              <Badge bg={badgeBg} color={badgeColor} variant="subtle">
                {animations.length} animation{animations.length !== 1 ? 's' : ''}
              </Badge>
            </HStack>
          </HStack>
        </ModalHeader>
        <ModalBody
          px={{ base: 2, md: 4 }}
          py={{ base: 2, md: 3 }}
          flex="1"
          overflowY="auto"
          onTouchMove={(e) => e.stopPropagation()}
        >
          <Tabs
            variant="enclosed"
            size="sm"
            colorScheme="gray"
            index={activeTabIndex}
            onChange={(index) => {
              setActiveTabIndex(index);
              // Clear editing animation when switching tabs
              if (index !== 1) { // Editor is index 1
                setEditingAnimationId(null);
              }
            }}
          >
            <TabList>
              <Tab>Timeline</Tab>
              <Tab>Editor</Tab>
              <Tab>Preview</Tab>
              <Tab>Sync {chainsCount > 0 && `(${chainsCount})`}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} py={{ base: 1, md: 3 }}>
                <TimelineTab
                  onEditAnimation={handleEditAnimation}
                  onAddNew={() => { setEditingAnimationId(null); setActiveTabIndex(1); }}
                  onPreviewAnimation={handlePreviewAnimation}
                />
              </TabPanel>
              <TabPanel px={0} py={{ base: 1, md: 3 }}>
                <EditorTab
                  selectedElement={selectedElement}
                  editingAnimationId={editingAnimationId}
                  onSave={() => setActiveTabIndex(0)}
                  onOpenPreview={handlePreviewDraft}
                />
              </TabPanel>
              <TabPanel px={0} py={{ base: 1, md: 3 }}>
                <PreviewTab
                  selectedElement={selectedElement}
                  selectedAnimationId={previewAnimationId}
                  draftAnimation={previewDraft}
                  mode={previewMode}
                />
              </TabPanel>
              <TabPanel px={0} py={{ base: 1, md: 3 }}>
                <SyncTab />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter borderTop="1px" borderColor={borderColor} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
          <PanelStyledButton onClick={handleClose}>Close</PanelStyledButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
