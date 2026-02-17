import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { extractEditablePoints, getControlPointAlignmentInfo, updateCommands, extractSubpaths } from '../../utils/pathParserUtils';
import type { Command, Point, ControlPoint, PathData } from '../../types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  VStack,
  HStack,
  Box,
  Text,
  IconButton as ChakraIconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Collapse,
  useDisclosure
} from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { Panel } from '../../ui/Panel';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { NumberInput } from '../../ui/NumberInput';
import { formatToPrecision } from '../../utils';

export const ControlPointAlignmentPanel: React.FC = () => {
  // ALL HOOKS FIRST - must be called unconditionally
  const { isOpen: showDetails, onToggle: toggleDetails } = useDisclosure({ defaultIsOpen: false });
  
  // Use individual selectors to prevent unnecessary re-renders
  const selectedCommands = useCanvasStore(state => state.selectedCommands);
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const allElements = useCanvasStore(state => state.elements);
  const settings = useCanvasStore(state => state.settings);
  
  // Filter elements in useMemo to avoid recalculation and infinite loops
  const elements = useMemo(() => {
    if ((selectedCommands?.length ?? 0) === 0) return allElements;
    if (!selectedCommands) return allElements;
    const selectedElementIds = [...new Set(selectedCommands.map((cmd: { elementId: string }) => cmd.elementId))];
    return allElements.filter(el => selectedElementIds.includes(el.id));
  }, [allElements, selectedCommands]);
  
  const deleteZCommandForMPoint = useCanvasStore(state => state.deleteZCommandForMPoint);
  const convertZToLineForMPoint = useCanvasStore(state => state.convertZToLineForMPoint);
  const addZCommandToSubpath = useCanvasStore(state => state.addZCommandToSubpath);
  const moveToM = useCanvasStore(state => state.moveToM);
  const convertCommandType = useCanvasStore(state => state.convertCommandType);
  const cutSubpathAtPoint = useCanvasStore(state => state.cutSubpathAtPoint);
  const setControlPointAlignmentType = useCanvasStore(state => state.setControlPointAlignmentType);
  const updateElement = useCanvasStore(state => state.updateElement);

  /**
   * Helper function to retrieve path commands with validation
   * Centralizes the shared retrieval/validation logic used by multiple callbacks
   */
  const withPathCommands = useCallback(<T,>(
    elementId: string,
    commandIndex: number,
    callback: (commands: Command[], command: Command) => T,
    fallbackValue: T
  ): T => {
    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'path') return fallbackValue;

    const pathData = element.data as import('../../types').PathData;
    const commands = pathData.subPaths.flat();

    const command = commands[commandIndex];
    if (!command) return fallbackValue;

    return callback(commands, command);
  }, [elements]);

  // Check if selected M point has a closing Z command
  const hasClosingZCommand = useCallback((elementId: string, commandIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Check if the command at commandIndex is an M command
      if (command.type !== 'M') return false;

      // Look for Z commands after this M command
      for (let i = commandIndex + 1; i < commands.length; i++) {
        if (commands[i].type === 'Z') {
          // Check if this Z closes to our M point
          // A Z closes to the last M before it
          let lastMIndex = -1;
          for (let j = i - 1; j >= 0; j--) {
            if (commands[j].type === 'M') {
              lastMIndex = j;
              break;
            }
          }

          if (lastMIndex === commandIndex) {
            return true;
          }
        } else if (commands[i].type === 'M') {
          // If we hit another M, stop looking
          break;
        }
      }

      return false;
    }, false);
  }, [withPathCommands]);

  // Check if selected point is the last point of its subpath
  const isLastPointOfSubpath = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Check if this is the last point of the command
      const pointsLength = command.type === 'M' || command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
      const isLastPoint = pointIndex === pointsLength - 1;
      if (!isLastPoint) return false;

      // Check if this is the last command in the path or before a Z/M
      const isLastCommandInSubpath = commandIndex === commands.length - 1 ||
        commands[commandIndex + 1].type === 'M' ||
        commands[commandIndex + 1].type === 'Z';

      return isLastCommandInSubpath;
    }, false);
  }, [withPathCommands]);

  // Check if selected point is already at the same position as the M of its subpath
  const isAtMPosition = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      // Find the M command for this subpath (the last M before this command)
      let subpathMIndex = -1;
      for (let i = commandIndex - 1; i >= 0; i--) {
        if (commands[i].type === 'M') {
          subpathMIndex = i;
          break;
        }
      }

      if (subpathMIndex === -1) return false;

      // Get the point to check
      let pointToCheck: Point | null = null;
      if (command.type === 'M' || command.type === 'L') {
        if (pointIndex === 0) pointToCheck = command.position;
      } else if (command.type === 'C') {
        if (pointIndex === 0) pointToCheck = command.controlPoint1;
        else if (pointIndex === 1) pointToCheck = command.controlPoint2;
        else if (pointIndex === 2) pointToCheck = command.position;
      }
      const mPosition = (commands[subpathMIndex] as Command & { type: 'M' }).position;

      if (!pointToCheck || !mPosition) return false;

      // Check if they are at the same position (with small tolerance for floating point)
      const tolerance = 0.1;
      return Math.abs(pointToCheck.x - mPosition.x) < tolerance &&
        Math.abs(pointToCheck.y - mPosition.y) < tolerance;
    }, false);
  }, [withPathCommands]);

  // Check if cutting subpath at this point is allowed
  const canCutSubpathAtPoint = useCallback((elementId: string, commandIndex: number, pointIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands, command) => {
      if (command.type !== 'L' && command.type !== 'C') return false;

      // Check if this is the anchor point (last point of the command)
      const pointsLength = command.type === 'L' ? 1 : command.type === 'C' ? 3 : 0;
      const isAnchorPoint = pointIndex === pointsLength - 1;
      if (!isAnchorPoint) return false;

      // Find the end of the current subpath
      let subpathEndIndex = commandIndex;
      for (let i = commandIndex + 1; i < commands.length; i++) {
        if (commands[i].type === 'M') {
          break;
        }
        subpathEndIndex = i;
      }

      // Don't allow cutting at the last command of the subpath
      if (commandIndex === subpathEndIndex) return false;

      // Check if there's a Z in this subpath
      let hasZInSubpath = false;
      for (let i = commandIndex; i <= subpathEndIndex; i++) {
        if (commands[i].type === 'Z') {
          hasZInSubpath = true;
          break;
        }
      }

      // If there's a Z, don't allow cutting at the second-to-last command
      if (hasZInSubpath && commandIndex === subpathEndIndex - 1) return false;

      return true;
    }, false);
  }, [withPathCommands]);

  // Check if the subpath already has a Z command
  const subpathHasZCommand = useCallback((elementId: string, commandIndex: number): boolean => {
    return withPathCommands(elementId, commandIndex, (commands) => {
      // Find the end of the current subpath
      let subpathEndIndex = commandIndex;
      for (let i = commandIndex + 1; i < commands.length; i++) {
        if (commands[i].type === 'M') {
          break;
        }
        subpathEndIndex = i;
      }

      // Check if there's a Z command after the last command
      if (subpathEndIndex < commands.length - 1 && commands[subpathEndIndex + 1].type === 'Z') {
        return true;
      }

      // Also check if there's a Z within the subpath
      for (let i = commandIndex; i <= subpathEndIndex; i++) {
        if (commands[i].type === 'Z') {
          return true;
        }
      }

      return false;
    }, false);
  }, [withPathCommands]);

  // Get info for a single selected control point
  const getSinglePointInfo = useCallback(() => {
    if (activePlugin !== 'edit' || !selectedCommands || selectedCommands.length !== 1) {
      return null;
    }

    const cmd = selectedCommands[0];
    const element = elements.find(el => el.id === cmd.elementId);
    if (!element || element.type !== 'path') {
      return null;
    }

    const pathData = element.data as import('../../types').PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);
    const point = points.find((p: ControlPoint) => p.commandIndex === cmd.commandIndex && p.pointIndex === cmd.pointIndex);

    if (!point) {
      return null;
    }

    if (!point.isControl) {
      // It's an anchor point - show only basic information
      const command = commands[cmd.commandIndex];

      return {
        point,
        command,
        isAnchor: true,
        anchorType: 'basic',
        location: `${command.type} Command ${cmd.commandIndex}, Point ${cmd.pointIndex}`
      };
    } else {
      // Control point - calculate alignment info on-demand
      const alignmentInfo = getControlPointAlignmentInfo(commands, points, cmd.commandIndex, cmd.pointIndex);
      
      // Find paired control point if alignment info indicates it exists
      let pairedPoint: ControlPoint | null = null;
      if (alignmentInfo && alignmentInfo.pairedCommandIndex !== undefined && alignmentInfo.pairedPointIndex !== undefined) {
        pairedPoint = points.find((p: ControlPoint) =>
          p.commandIndex === alignmentInfo.pairedCommandIndex && p.pointIndex === alignmentInfo.pairedPointIndex
        ) || null;
      }

      // Calculate magnitudes and angles for display
      let mag1 = 0;
      let angle1 = 0;
      let mag2: number | undefined;
      let angle2: number | undefined;
      let anchor2: { x: number, y: number } | undefined;

      const anchor1 = point.anchor;
      const vector1 = { x: point.x - anchor1.x, y: point.y - anchor1.y };
      mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
      angle1 = Math.atan2(vector1.y, vector1.x) * 180 / Math.PI;

      if (pairedPoint) {
        anchor2 = pairedPoint.anchor;
        const vector2 = { x: pairedPoint.x - anchor2!.x, y: pairedPoint.y - anchor2!.y };
        mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        angle2 = Math.atan2(vector2.y, vector2.x) * 180 / Math.PI;
      }

      return {
        point,
        command: commands[cmd.commandIndex],
        info: alignmentInfo ? {
          commandIndex: point.commandIndex,
          pointIndex: point.pointIndex,
          type: alignmentInfo.type,
          pairedCommandIndex: alignmentInfo.pairedCommandIndex,
          pairedPointIndex: alignmentInfo.pairedPointIndex,
          anchor: alignmentInfo.anchor
        } : {
          commandIndex: point.commandIndex,
          pointIndex: point.pointIndex,
          type: 'independent' as const,
          anchor: point.anchor
        },
        pairedPoint,
        pairedInfo: pairedPoint && alignmentInfo ? {
          commandIndex: pairedPoint.commandIndex,
          pointIndex: pairedPoint.pointIndex,
          type: alignmentInfo.type,
          pairedCommandIndex: alignmentInfo.pairedCommandIndex,
          pairedPointIndex: alignmentInfo.pairedPointIndex,
          anchor: alignmentInfo.anchor
        } : null,
        calculatedType: alignmentInfo?.type || 'independent',
        mag1,
        angle1,
        mag2,
        angle2,
        anchor1,
        anchor2,
        isAnchor: false
      };
    }
  }, [activePlugin, selectedCommands, elements]);

  const singlePointInfo = useMemo(() => getSinglePointInfo(), [getSinglePointInfo]);

  // Define handlers before early return
  const handlePositionChange = useCallback((axis: 'x' | 'y', value: number) => {
    if (!selectedCommands || selectedCommands.length !== 1) return;
    if (!singlePointInfo) return;

    const selectedCmd = selectedCommands[0];
    const element = elements.find(el => el.id === selectedCmd.elementId);
    if (!element || element.type !== 'path') return;

    const pathData = element.data as PathData;
    const commands = pathData.subPaths.flat();
    const points = extractEditablePoints(commands);

    const pointToUpdate = points.find(p =>
      p.commandIndex === selectedCmd.commandIndex &&
      p.pointIndex === selectedCmd.pointIndex
    );

    if (!pointToUpdate) return;

    // Update the point position
    const newX = axis === 'x' ? formatToPrecision(value, settings.keyboardMovementPrecision) : pointToUpdate.x;
    const newY = axis === 'y' ? formatToPrecision(value, settings.keyboardMovementPrecision) : pointToUpdate.y;

    pointToUpdate.x = newX;
    pointToUpdate.y = newY;

    // Update commands with the new point position
    const updatedCommands = updateCommands(commands, [pointToUpdate]);
    const newSubPaths = extractSubpaths(updatedCommands).map(s => s.commands);

    updateElement(selectedCmd.elementId, {
      data: {
        ...pathData,
        subPaths: newSubPaths
      }
    });
  }, [singlePointInfo, selectedCommands, elements, settings.keyboardMovementPrecision, updateElement]);

  // Early return AFTER all hooks: Only render when in edit mode and exactly one point is selected
  if (activePlugin !== 'edit' || !selectedCommands || selectedCommands.length !== 1) {
    return null;
  }

  // At this point, TypeScript knows selectedCommands is defined and has exactly one element
  const selectedCmd = selectedCommands[0];

  // Always show the panel, even when no control point is selected
  // if (!singlePointInfo) {
  //   return null;
  // }

  const handleAlignmentChange = (type: 'independent' | 'aligned' | 'mirrored') => {
    if (singlePointInfo && singlePointInfo.pairedPoint && setControlPointAlignmentType) {
      setControlPointAlignmentType(
        selectedCmd.elementId,
        selectedCmd.commandIndex,
        selectedCmd.pointIndex,
        singlePointInfo.pairedPoint.commandIndex,
        singlePointInfo.pairedPoint.pointIndex,
        type
      );
    }
  };

  const renderAlignmentButtons = () => {
    if (!singlePointInfo || singlePointInfo.isAnchor || !singlePointInfo.pairedPoint) {
      return null;
    }

    return (
      <VStack spacing={0} align="stretch" mb={1}>
        <HStack spacing={1}>
          <Box flex={1}>
            <JoinedButtonGroup
              options={[
                { value: 'independent', label: 'Independent', description: 'Control points move freely' },
                { value: 'aligned', label: 'Aligned', description: 'Control points maintain opposite directions' },
                { value: 'mirrored', label: 'Mirrored', description: 'Control points are perfectly mirrored' }
              ]}
              value={singlePointInfo.info?.type || 'independent'}
              onChange={handleAlignmentChange}
            />
          </Box>

          <Box ml="auto">
            <ConditionalTooltip label={showDetails ? "Hide Details" : "Show Details"}>
              <ChakraIconButton
                aria-label={showDetails ? "Hide Details" : "Show Details"}
                icon={showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                onClick={toggleDetails}
                variant="ghost"
                size="xs"
                borderRadius="full"
                bg="transparent"
                _hover={{ bg: 'surface.panelSecondary' }}
              />
            </ConditionalTooltip>
          </Box>
        </HStack>

        {/* Etiqueta descriptiva siempre visible */}
        <Text fontSize="11px" color="text.muted">
          {(singlePointInfo.info?.type || 'independent') === 'independent' && 'Points move independently'}
          {(singlePointInfo.info?.type || 'independent') === 'aligned' && 'Points maintain opposite directions'}
          {(singlePointInfo.info?.type || 'independent') === 'mirrored' && 'Points are mirrored across anchor'}
        </Text>
      </VStack>
    );
  };

  const renderDetailContent = () => {
    if (!singlePointInfo || !showDetails) return null;

    if (singlePointInfo.pairedPoint) {
      return (
        <Collapse in={showDetails} animateOpacity>
          <VStack spacing={0} align="stretch" fontSize="11px" color="text.muted" lineHeight="1.4">
            <Text><Text as="strong" color="text.primary">Point Index:</Text> {singlePointInfo.point.pointIndex}</Text>
            <Text><Text as="strong" color="text.primary">Anchor:</Text> ({formatToPrecision(singlePointInfo.anchor1?.x || 0, settings.keyboardMovementPrecision)}, {formatToPrecision(singlePointInfo.anchor1?.y || 0, settings.keyboardMovementPrecision)})</Text>
            <Text><Text as="strong" color="text.primary">Direction:</Text> {singlePointInfo.angle1?.toFixed(1) || '0'}°</Text>
            <Text><Text as="strong" color="text.primary">Size:</Text> {formatToPrecision(singlePointInfo.mag1 || 0, settings.keyboardMovementPrecision)}</Text>
            <Text><Text as="strong" color="text.primary">Alignment:</Text> {singlePointInfo.info?.type || 'independent'}</Text>
            {singlePointInfo.pairedPoint && (
              <>
                <Text><Text as="strong" color="text.primary">Paired Point:</Text> ({formatToPrecision(singlePointInfo.pairedPoint.x, settings.keyboardMovementPrecision)}, {formatToPrecision(singlePointInfo.pairedPoint.y, settings.keyboardMovementPrecision)}) at command {singlePointInfo.pairedInfo?.commandIndex}, point {singlePointInfo.pairedInfo?.pointIndex}</Text>
                <Text><Text as="strong" color="text.primary">Paired Anchor:</Text> ({formatToPrecision(singlePointInfo.anchor2?.x || 0, settings.keyboardMovementPrecision)}, {formatToPrecision(singlePointInfo.anchor2?.y || 0, settings.keyboardMovementPrecision)})</Text>
                <TableContainer>
                  <Table size="sm" fontSize="12px" mt={2}>
                    <Thead>
                      <Tr>
                        <Th fontSize="12px" p={1} bg="surface.panelSecondary" borderColor="border.panel" textTransform="none">Property</Th>
                        <Th fontSize="12px" p={1} bg="surface.panelSecondary" borderColor="border.panel" textTransform="none">Current</Th>
                        <Th fontSize="12px" p={1} bg="surface.panelSecondary" borderColor="border.panel" textTransform="none">Paired</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td fontSize="12px" p={1} borderColor="border.panel">Direction</Td>
                        <Td fontSize="12px" p={1} borderColor="border.panel">{singlePointInfo.angle1?.toFixed(1) || '0'}°</Td>
                        <Td fontSize="12px" p={1} borderColor="border.panel">{singlePointInfo.angle2?.toFixed(1) || '0'}°</Td>
                      </Tr>
                      <Tr>
                        <Td fontSize="12px" p={1} borderColor="border.panel">Size</Td>
                        <Td fontSize="12px" p={1} borderColor="border.panel">{formatToPrecision(singlePointInfo.mag1 || 0, settings.keyboardMovementPrecision)}</Td>
                        <Td fontSize="12px" p={1} borderColor="border.panel">{formatToPrecision(singlePointInfo.mag2 || 0, settings.keyboardMovementPrecision)}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </>
            )}
          </VStack>
        </Collapse>
      );
    }

    return (
      <Collapse in={showDetails} animateOpacity>
        <VStack spacing={1} align="stretch" fontSize="12px" color="text.muted" lineHeight="1.4">
          <Text><Text as="strong" color="text.primary">Point Index:</Text> {singlePointInfo.point.pointIndex}</Text>
          <Text><Text as="strong" color="text.primary">Alignment:</Text> {singlePointInfo.info?.type || 'independent'}</Text>
        </VStack>
      </Collapse>
    );
  };

  return (
    <Panel
      title="Point"
      isCollapsible
      defaultOpen={false}
      showRenderCount={true}
    >
      {renderAlignmentButtons()}

          {/* Always visible Position controls */}
          {singlePointInfo && (
            <VStack spacing={0} align="stretch">
              <HStack spacing={2}>
                <Box flex={1}>
                  <NumberInput
                    label="X"
                    value={formatToPrecision(singlePointInfo.point.x, settings.keyboardMovementPrecision)}
                    onChange={(value) => handlePositionChange('x', value)}
                    step={0.1}
                    labelWidth="20px"
                    inputWidth="100%"
                  />
                </Box>
                <Box flex={1}>
                  <NumberInput
                    label="Y"
                    value={formatToPrecision(singlePointInfo.point.y, settings.keyboardMovementPrecision)}
                    onChange={(value) => handlePositionChange('y', value)}
                    step={0.1}
                    labelWidth="20px"
                    inputWidth="100%"
                  />
                </Box>
              </HStack>
              <Text fontSize="11px" color="text.muted">
                Command {singlePointInfo.command.type} at index {singlePointInfo.point.commandIndex}
              </Text>
            </VStack>
          )}

          {renderDetailContent()}

          {/* Always visible anchor-specific actions */}
          {singlePointInfo && singlePointInfo.isAnchor && (
            <VStack spacing={1} align="stretch" fontSize="11px" color="text.muted" lineHeight="1.4">
              {hasClosingZCommand(selectedCmd.elementId, selectedCmd.commandIndex) && (
                <>
                  <PanelStyledButton
                    onClick={() => deleteZCommandForMPoint?.(selectedCmd.elementId, selectedCmd.commandIndex)}
                    size="xs"
                    fontSize="12px"
                    w="full"
                    title="Delete the Z command that closes this path"
                  >
                    Delete Z Command
                  </PanelStyledButton>
                  <PanelStyledButton
                    onClick={() => convertZToLineForMPoint?.(selectedCmd.elementId, selectedCmd.commandIndex)}
                    size="xs"
                    fontSize="12px"
                    w="full"
                    title="Convert the Z command to a line command"
                  >
                    Convert Z to Line
                  </PanelStyledButton>
                </>
              )}
              {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') &&
                isLastPointOfSubpath(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) &&
                !isAtMPosition(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) && (
                  <PanelStyledButton
                    onClick={() => moveToM?.(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex)}
                    size="xs"
                    fontSize="12px"
                    w="full"
                    title="Move this point to start a new subpath"
                  >
                    Move to M
                  </PanelStyledButton>
                )}
              {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') &&
                isLastPointOfSubpath(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) &&
                isAtMPosition(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) &&
                !subpathHasZCommand(selectedCmd.elementId, selectedCmd.commandIndex) && (
                  <PanelStyledButton
                    onClick={() => addZCommandToSubpath?.(selectedCmd.elementId, selectedCmd.commandIndex)}
                    size="xs"
                    fontSize="12px"
                    w="full"
                    title="Add Z command to close this subpath"
                  >
                    Add Z Command
                  </PanelStyledButton>
                )}
              {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') && (
                <PanelStyledButton
                  onClick={() => convertCommandType?.(selectedCmd.elementId, selectedCmd.commandIndex)}
                  size="xs"
                  fontSize="12px"
                  w="full"
                  title={`Change to ${singlePointInfo.command.type === 'L' ? 'Curve' : 'Line'}`}
                >
                  Change to {singlePointInfo.command.type === 'L' ? 'Curve' : 'Line'}
                </PanelStyledButton>
              )}
              {(singlePointInfo.command.type === 'L' || singlePointInfo.command.type === 'C') &&
                canCutSubpathAtPoint(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex) && (
                  <PanelStyledButton
                    onClick={() => cutSubpathAtPoint?.(selectedCmd.elementId, selectedCmd.commandIndex, selectedCmd.pointIndex)}
                    size="xs"
                    fontSize="12px"
                    w="full"
                    title="Cut the subpath at this point, creating two separate subpaths"
                  >
                    Cut Subpath
                  </PanelStyledButton>
                )}
        </VStack>
      )}
    </Panel>
  );
};
