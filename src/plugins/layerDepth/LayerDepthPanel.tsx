import React, { useCallback } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import { useShallow } from 'zustand/react/shallow';
import type { LayerDepthPluginSlice } from './slice';
import { analyzeLayerDepth } from './depthUtils';

type DepthStore = CanvasStore & LayerDepthPluginSlice;

export const LayerDepthPanel: React.FC = () => {
  const { state, update, elements } = useCanvasStore(
    useShallow((s) => {
      const st = s as DepthStore;
      return {
        state: st.layerDepth,
        update: st.updateLayerDepthState,
        elements: s.elements,
      };
    })
  );

  const handleAnalyze = useCallback(() => {
    if (!state || !update) return;
    const layers = analyzeLayerDepth(elements);
    const fullyObscuredCount = layers.filter((l) => l.isFullyObscured).length;
    const partiallyObscuredCount = layers.filter((l) => l.obscuredPercent > 0 && !l.isFullyObscured).length;
    update({
      layers,
      totalLayers: layers.length,
      fullyObscuredCount,
      partiallyObscuredCount,
    });
  }, [state, update, elements]);

  if (!state || !update) return null;

  return (
    <Panel
      title="Layer Depth"
      isCollapsible={state.enabled}
      defaultOpen={false}
      headerActions={
        <PanelSwitch
          isChecked={state.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          aria-label="Toggle layer depth overlay"
        />
      }
    >
      {state.enabled && (
        <>
          <PanelToggle
            isChecked={state.showZIndexLabels}
            onChange={(e) => update({ showZIndexLabels: e.target.checked })}
          >
            Show Z-Index Labels
          </PanelToggle>

          <PanelToggle
            isChecked={state.highlightObscured}
            onChange={(e) => update({ highlightObscured: e.target.checked })}
          >
            Highlight Obscured Elements
          </PanelToggle>

          <PanelStyledButton onClick={handleAnalyze}>
            Analyze Layers ({elements.length} elements)
          </PanelStyledButton>

          {state.totalLayers > 0 && (
            <>
              <SectionHeader title="Summary" />

              <HStack justify="space-between" px={2} py={1}>
                <Text fontSize="xs" color="gray.400">Total Layers</Text>
                <Text fontSize="xs" color="gray.300">{state.totalLayers}</Text>
              </HStack>

              {state.fullyObscuredCount > 0 && (
                <HStack justify="space-between" px={2} py={1}>
                  <Text fontSize="xs" color="gray.400">Fully Obscured</Text>
                  <Text fontSize="xs" color="red.400" fontWeight="bold">
                    {state.fullyObscuredCount}
                  </Text>
                </HStack>
              )}

              {state.partiallyObscuredCount > 0 && (
                <HStack justify="space-between" px={2} py={1}>
                  <Text fontSize="xs" color="gray.400">Partially Obscured</Text>
                  <Text fontSize="xs" color="orange.400" fontWeight="bold">
                    {state.partiallyObscuredCount}
                  </Text>
                </HStack>
              )}

              <SectionHeader title="Layer Stack" />

              <VStack gap={1} align="stretch" maxH="300px" overflowY="auto" px={2}>
                {[...state.layers].reverse().map((layer) => {
                  const obscuredColor = layer.isFullyObscured
                    ? 'red.400'
                    : layer.obscuredPercent > 0
                      ? 'orange.400'
                      : 'green.400';

                  return (
                    <Box
                      key={layer.id}
                      p={2}
                      bg="whiteAlpha.50"
                      borderRadius="md"
                      borderLeft="3px solid"
                      borderColor={obscuredColor}
                      cursor="pointer"
                      _hover={{ bg: 'whiteAlpha.100' }}
                      onClick={() => {
                        const store = useCanvasStore.getState();
                        store.selectElements([layer.id]);
                      }}
                    >
                      <HStack justify="space-between">
                        <HStack gap={2}>
                          <Box
                            bg="blue.500"
                            color="white"
                            fontSize="xs"
                            fontWeight="bold"
                            borderRadius="full"
                            w="20px"
                            h="20px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            {layer.zIndex}
                          </Box>
                          <Text fontSize="xs" color="gray.300">
                            {layer.name}...
                          </Text>
                        </HStack>

                        {layer.obscuredPercent > 0 && (
                          <Text fontSize="xs" color={obscuredColor}>
                            {layer.obscuredPercent}% hidden
                          </Text>
                        )}
                      </HStack>

                      {layer.obscuredBy.length > 0 && (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Behind {layer.obscuredBy.length} element{layer.obscuredBy.length > 1 ? 's' : ''}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </VStack>
            </>
          )}
        </>
      )}
    </Panel>
  );
};
