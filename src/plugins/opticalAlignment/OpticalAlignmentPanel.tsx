import React from 'react';
import {
  VStack,
  Text,
  Box,
  HStack,
  Grid,
  Collapse,
  useDisclosure,
  IconButton as ChakraIconButton,
} from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { ChevronDown, ChevronRight } from 'lucide-react';

const OpticalAlignmentPanelComponent: React.FC = () => {
  const opticalAlignmentResult = useCanvasStore((state) => state.opticalAlignmentResult);
  const isCalculatingAlignment = useCanvasStore((state) => state.isCalculatingAlignment);
  useCanvasStore((state) => state.selectedIds);

  const { isOpen: isAdvancedOpen, onToggle: onAdvancedToggle } = useDisclosure();
  const isDevelopment = import.meta.env.DEV;

  const {
    canPerformOpticalAlignment,
    calculateOpticalAlignment,
    applyOpticalAlignment,
    clearOpticalAlignment,
    applyOpticalAlignmentToAllPairs,
    applyMathematicalAlignment,
    applyMathematicalAlignmentToAllPairs,
    selectAllContainers,
    selectAllContents,
  } = useCanvasStore.getState();

  const canAlign = canPerformOpticalAlignment?.() ?? false;

  const handleCalculate = async () => {
    await calculateOpticalAlignment?.();
  };

  const handleApply = () => {
    applyOpticalAlignment?.();
  };

  const handleApplyDirectly = async () => {
    await calculateOpticalAlignment?.();
    setTimeout(() => {
      applyOpticalAlignment?.();
    }, 100);
  };

  const handleClear = () => {
    clearOpticalAlignment?.();
  };

  const handleApplyToAll = async () => {
    await applyOpticalAlignmentToAllPairs?.();
  };

  const handleMathematicalAlign = () => {
    applyMathematicalAlignment?.();
  };

  const handleMathematicalAlignAll = () => {
    applyMathematicalAlignmentToAllPairs?.();
  };

  const offsetFromMathCenter = opticalAlignmentResult
    ? {
        dx: opticalAlignmentResult.visualCenter.x - opticalAlignmentResult.mathematicalCenter.x,
        dy: opticalAlignmentResult.visualCenter.y - opticalAlignmentResult.mathematicalCenter.y,
      }
    : null;

  return (
    <Panel
      title="Optical Alignment"
      isCollapsible={!canAlign ? false : true}
      defaultOpen={false}
    >
      {canAlign && (
        <VStack align="stretch" spacing={2}>
          <PanelStyledButton
            onClick={handleApplyDirectly}
            isDisabled={!canAlign || isCalculatingAlignment}
            isLoading={isCalculatingAlignment}
            loadingText="Applying..."
          >
            Apply Visual Center
          </PanelStyledButton>

          {isDevelopment && (
            <Box mt={1}>
              <HStack justify="space-between" py={1}>
                <Text
                  color="gray.600"
                  _dark={{ color: 'gray.400' }}
                  cursor="pointer"
                  onClick={onAdvancedToggle}
                  _hover={{ color: 'gray.800', _dark: { color: 'gray.200' } }}
                >
                  Advanced
                </Text>
                <ConditionalTooltip label={isAdvancedOpen ? 'Collapse Advanced' : 'Expand Advanced'}>
                  <ChakraIconButton
                    aria-label={isAdvancedOpen ? 'Collapse Advanced' : 'Expand Advanced'}
                    icon={isAdvancedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    onClick={onAdvancedToggle}
                    variant="ghost"
                    size="xs"
                    h="20px"
                    minW="20px"
                    borderRadius="full"
                    flexShrink={0}
                    bg="transparent"
                  />
                </ConditionalTooltip>
              </HStack>

              <Collapse in={isAdvancedOpen} animateOpacity>
                <VStack spacing={3} align="stretch" mt={2}>
                  <Box>
                    <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                      Visual Center (Optical)
                    </Text>

                    <Grid templateColumns="1fr 1fr" gap={2}>
                      <PanelStyledButton
                        onClick={handleCalculate}
                        isDisabled={!canAlign || isCalculatingAlignment}
                        isLoading={isCalculatingAlignment}
                        loadingText="Calculating..."
                      >
                        Calculate
                      </PanelStyledButton>

                      <PanelStyledButton
                        onClick={handleApplyToAll}
                        isDisabled={isCalculatingAlignment}
                        isLoading={isCalculatingAlignment}
                      >
                        Apply All
                      </PanelStyledButton>
                    </Grid>

                    {opticalAlignmentResult && (
                      <VStack spacing={2} align="stretch" mt={1}>
                        <Box color="gray.600" _dark={{ color: 'gray.400' }}>
                          <Text>Offset</Text>

                          <HStack justify="space-between" fontSize="10px">
                            <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                              Current:
                            </Text>
                            <Text fontFamily="mono">
                              dx: {opticalAlignmentResult.offset.x.toFixed(2)}, dy:{' '}
                              {opticalAlignmentResult.offset.y.toFixed(2)}
                            </Text>
                          </HStack>

                          {offsetFromMathCenter && (
                            <HStack justify="space-between" fontSize="10px">
                              <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                                From math center:
                              </Text>
                              <Text fontFamily="mono">
                                dx: {offsetFromMathCenter.dx.toFixed(2)}, dy: {offsetFromMathCenter.dy.toFixed(2)}
                              </Text>
                            </HStack>
                          )}
                        </Box>

                        <Grid templateColumns="1fr 1fr" gap={2}>
                          <PanelStyledButton onClick={handleApply}>Apply</PanelStyledButton>
                          <PanelStyledButton onClick={handleClear}>Cancel</PanelStyledButton>
                        </Grid>
                      </VStack>
                    )}
                  </Box>

                  <Box>
                    <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                      Mathematical Center
                    </Text>

                    <Grid templateColumns="1fr 1fr" gap={2}>
                      <PanelStyledButton
                        onClick={handleMathematicalAlign}
                        isDisabled={!canAlign || isCalculatingAlignment}
                        isLoading={isCalculatingAlignment}
                        loadingText="Calculating..."
                      >
                        Align Center
                      </PanelStyledButton>

                      <PanelStyledButton
                        onClick={handleMathematicalAlignAll}
                        isDisabled={!canAlign || isCalculatingAlignment}
                        isLoading={isCalculatingAlignment}
                        loadingText="Calculating..."
                      >
                        Align All
                      </PanelStyledButton>
                    </Grid>
                  </Box>

                  <Grid templateColumns="1fr 1fr" gap={2}>
                    <PanelStyledButton onClick={selectAllContainers}>Select Containers</PanelStyledButton>
                    <PanelStyledButton onClick={selectAllContents}>Select Contents</PanelStyledButton>
                  </Grid>
                </VStack>
              </Collapse>
            </Box>
          )}
        </VStack>
      )}
    </Panel>
  );
};

export const OpticalAlignmentPanel = React.memo(OpticalAlignmentPanelComponent);
