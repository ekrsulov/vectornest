import type { Command, ControlPoint, Point, PathData, CanvasElement } from '../../types';
import { getCommandStartPoint } from './parsing';
import { applyToPoint } from '../matrixUtils';
import { getAccumulatedTransformMatrix } from '../elementTransformUtils';
import { distance as pointDistance } from '../math';
import { buildElementMap } from '../elementMapUtils';

/**
 * Extract all points from parsed commands for editing
 */
export function extractEditablePoints(commands: Command[]): ControlPoint[] {
    const points: ControlPoint[] = [];
    let commandIndex = 0;

    for (const command of commands) {
        if (command.type === 'M' || command.type === 'L') {
            // M and L have one point
            points.push({
                commandIndex,
                pointIndex: 0,
                x: command.position.x,
                y: command.position.y,
                anchor: command.position,
                isControl: false,
            });
        } else if (command.type === 'C') {
            // Get the start point for this command (needed for outgoing control point anchor)
            const startPoint = getCommandStartPoint(commands, commandIndex);

            // C has 3 points: control1 (outgoing), control2 (incoming), end
            // Control point 1 (outgoing) - anchor is the start of the segment
            points.push({
                commandIndex,
                pointIndex: 0,
                x: command.controlPoint1.x,
                y: command.controlPoint1.y,
                anchor: startPoint || { x: 0, y: 0 }, // Start point of the segment
                isControl: true,
                associatedCommandIndex: commandIndex,
                associatedPointIndex: 2, // associated with end point
            });

            // Control point 2 (incoming) - anchor is the end of the segment
            points.push({
                commandIndex,
                pointIndex: 1,
                x: command.controlPoint2.x,
                y: command.controlPoint2.y,
                anchor: command.position, // End point of the segment
                isControl: true,
                associatedCommandIndex: commandIndex,
                associatedPointIndex: 2, // associated with end point
            });

            // End point
            points.push({
                commandIndex,
                pointIndex: 2,
                x: command.position.x,
                y: command.position.y,
                anchor: command.position,
                isControl: false,
                associatedCommandIndex: commandIndex,
                associatedPointIndex: 0, // associated with control1
            });
        }
        commandIndex++;
    }

    return points;
}

/**
 * Extract a specific point and its command from a selection
 */
export function getPointFromSelection(
    selection: { elementId: string; commandIndex: number; pointIndex: number },
    elements: CanvasElement[]
): { point: ControlPoint; command: Command } | null {
    const elementMap = buildElementMap(elements);
    const element = elementMap.get(selection.elementId);
    if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const commands = pathData.subPaths.flat();
        const points = extractEditablePoints(commands);
        const point = points.find(p => p.commandIndex === selection.commandIndex && p.pointIndex === selection.pointIndex);
        const command = commands[selection.commandIndex];

        if (point && command) {
            // Apply accumulated transforms to the point
            const transformMatrix = getAccumulatedTransformMatrix(element.id, elements);
            const transformedPos = applyToPoint(transformMatrix, { x: point.x, y: point.y });
            const transformedAnchor = applyToPoint(transformMatrix, { x: point.anchor.x, y: point.anchor.y });

            return {
                point: {
                    ...point,
                    x: transformedPos.x,
                    y: transformedPos.y,
                    anchor: transformedAnchor
                },
                command
            };
        }
    }
    return null;
}

/**
 * Update path d string from modified points
 * Note: This function only updates positions. Alignment handling should be done by the caller.
 */
export function updateCommands(commands: Command[], updatedPoints: ControlPoint[]): Command[] {
    // Create a copy of commands to modify
    const updatedCommands = commands.map(cmd => {
        if (cmd.type === 'M' || cmd.type === 'L') {
            return { ...cmd, position: { ...cmd.position } };
        } else if (cmd.type === 'C') {
            return { ...cmd, controlPoint1: { ...cmd.controlPoint1 }, controlPoint2: { ...cmd.controlPoint2 }, position: { ...cmd.position } };
        } else {
            return { ...cmd };
        }
    });

    // Apply updates to the commands
    updatedPoints.forEach(updatedPoint => {
        const cmd = updatedCommands[updatedPoint.commandIndex];
        if (cmd) {
            if (cmd.type === 'M' || cmd.type === 'L') {
                // For M and L, pointIndex 0 is the main point
                if (updatedPoint.pointIndex === 0) {
                    cmd.position = { x: updatedPoint.x, y: updatedPoint.y };
                }
            } else if (cmd.type === 'C') {
                // For C: pointIndex 0 = control1, 1 = control2, 2 = end
                if (updatedPoint.pointIndex === 0) {
                    cmd.controlPoint1 = {
                        ...cmd.controlPoint1,
                        x: updatedPoint.x,
                        y: updatedPoint.y
                    };
                } else if (updatedPoint.pointIndex === 1) {
                    cmd.controlPoint2 = {
                        ...cmd.controlPoint2,
                        x: updatedPoint.x,
                        y: updatedPoint.y
                    };
                } else if (updatedPoint.pointIndex === 2) {
                    cmd.position = { x: updatedPoint.x, y: updatedPoint.y };
                }
            }
        }
    });

    return updatedCommands;
}

/**
 * Determine the alignment type between two control points (internal function)
 */
function determineControlPointAlignment(
    commands: Command[],
    commandIndex1: number,
    pointIndex1: number,
    commandIndex2: number,
    pointIndex2: number,
    sharedAnchor: Point
): 'independent' | 'aligned' | 'mirrored' {
    const command1 = commands[commandIndex1];
    const command2 = commands[commandIndex2];

    if (!command1 || !command2 || command1.type !== 'C' || command2.type !== 'C') {
        return 'independent';
    }

    // Get the control point positions
    let point1: Point | null = null;
    let point2: Point | null = null;

    if (pointIndex1 === 0) {
        point1 = command1.controlPoint1;
    } else if (pointIndex1 === 1) {
        point1 = command1.controlPoint2;
    }

    if (pointIndex2 === 0) {
        point2 = command2.controlPoint1;
    } else if (pointIndex2 === 1) {
        point2 = command2.controlPoint2;
    }

    if (!point1 || !point2) {
        return 'independent';
    }

    // Calculate vectors from anchor to control points
    const vector1 = {
        x: point1.x - sharedAnchor.x,
        y: point1.y - sharedAnchor.y
    };
    const vector2 = {
        x: point2.x - sharedAnchor.x,
        y: point2.y - sharedAnchor.y
    };

    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    if (magnitude1 === 0 || magnitude2 === 0) {
        return 'independent';
    }

    // Normalize vectors
    const unit1 = {
        x: vector1.x / magnitude1,
        y: vector1.y / magnitude1
    };
    const unit2 = {
        x: vector2.x / magnitude2,
        y: vector2.y / magnitude2
    };

    // Check if vectors are aligned (opposite directions)
    const dotProduct = unit1.x * (-unit2.x) + unit1.y * (-unit2.y);
    const alignmentThreshold = 0.985; // About 10 degrees tolerance

    if (dotProduct > alignmentThreshold) {
        // Vectors are aligned, check if magnitudes are similar
        const magnitudeRatio = Math.min(magnitude1, magnitude2) / Math.max(magnitude1, magnitude2);
        if (magnitudeRatio > 0.9) {
            return 'mirrored';
        } else {
            return 'aligned';
        }
    }

    return 'independent';
}

/**
 * Find the paired control point for a given control point (internal function)
 */
function findPairedControlPoint(
    commands: Command[],
    commandIndex: number,
    pointIndex: number
): { commandIndex: number; pointIndex: number; anchor: Point } | null {
    const command = commands[commandIndex];
    if (!command || command.type !== 'C' || (pointIndex !== 0 && pointIndex !== 1)) {
        return null;
    }

    let pairedCommandIndex = -1;
    let pairedPointIndex = -1;
    let anchor: Point | undefined;

    if (pointIndex === 1) {
        // Incoming control point - look for next command's outgoing control point
        const nextCommandIndex = commandIndex + 1;

        // Skip Z commands
        let targetCommandIndex = nextCommandIndex;
        while (targetCommandIndex < commands.length && commands[targetCommandIndex].type === 'Z') {
            targetCommandIndex++;
        }

        if (targetCommandIndex < commands.length && commands[targetCommandIndex].type === 'C') {
            pairedCommandIndex = targetCommandIndex;
            pairedPointIndex = 0;
            anchor = command.position; // End point of current command is the anchor
        } else {
            // For closed paths (with Z command) or open paths where last point equals M point
            const hasZCommand = commands[commands.length - 1]?.type === 'Z';

            // Find the M command for this subpath
            let mCommandIndex = -1;
            for (let i = commandIndex; i >= 0; i--) {
                if (commands[i].type === 'M') {
                    mCommandIndex = i;
                    break;
                }
            }

            if (mCommandIndex !== -1) {
                const mPoint = (commands[mCommandIndex] as { type: 'M'; position: Point }).position;
                const currentEndPoint = command.position;

                // Verify that the end point matches the M point
                const tolerance = 0.1;
                const dist = pointDistance(currentEndPoint, mPoint);

                // Check if path is closed (Z command or last point at M position)
                if (hasZCommand && dist < tolerance) {
                    // Find first C command after M and verify it starts at M point
                    for (let j = mCommandIndex + 1; j < commands.length; j++) {
                        if (commands[j].type === 'C') {
                            // Verify that the first C command starts at the M point
                            const firstCStartPoint = getCommandStartPoint(commands, j);
                            if (firstCStartPoint) {
                                const startDistance = pointDistance(firstCStartPoint, mPoint);

                                // Only pair if the first C command also starts at M point
                                if (startDistance < tolerance) {
                                    pairedCommandIndex = j;
                                    pairedPointIndex = 0;
                                    anchor = mPoint; // Use M point as anchor
                                }
                            }
                            break;
                        }
                    }
                } else if (!hasZCommand && dist < tolerance) {
                    // Open path but last point equals M point
                    // Find first C command after M
                    for (let j = mCommandIndex + 1; j < commands.length; j++) {
                        if (commands[j].type === 'C') {
                            pairedCommandIndex = j;
                            pairedPointIndex = 0;
                            anchor = mPoint; // Use M point as anchor
                            break;
                        }
                    }
                }
            }
        }
    } else if (pointIndex === 0) {
        // Outgoing control point - look for previous command's incoming control point
        const prevCommandIndex = commandIndex - 1;

        // Skip Z commands
        let targetCommandIndex = prevCommandIndex;
        while (targetCommandIndex >= 0 && commands[targetCommandIndex].type === 'Z') {
            targetCommandIndex--;
        }

        if (targetCommandIndex >= 0 && commands[targetCommandIndex].type === 'C') {
            pairedCommandIndex = targetCommandIndex;
            pairedPointIndex = 1;
            anchor = getCommandStartPoint(commands, commandIndex) || { x: 0, y: 0 };
        } else {
            // For closed paths (with Z command) or open paths where last point equals M point
            const hasZCommand = commands[commands.length - 1]?.type === 'Z';

            // Find the M command for this subpath
            let mCommandIndex = -1;
            for (let i = commandIndex; i >= 0; i--) {
                if (commands[i].type === 'M') {
                    mCommandIndex = i;
                    break;
                }
            }

            if (mCommandIndex !== -1) {
                const mPoint = (commands[mCommandIndex] as { type: 'M'; position: Point }).position;
                const currentStartPoint = getCommandStartPoint(commands, commandIndex) || { x: 0, y: 0 };

                // Verify that the start point matches the M point (this is the first command after M)
                const tolerance = 0.1;
                const startDistance = pointDistance(currentStartPoint, mPoint);

                if (startDistance < tolerance) {
                    // Find last C command before Z (or before end if no Z)
                    for (let j = commands.length - 1; j >= mCommandIndex + 1; j--) {
                        if (commands[j].type === 'C') {
                            const lastCurveEndPoint = (commands[j] as { type: 'C'; position: Point }).position;

                            // Verify that the last curve ends at M point
                            const endDistance = pointDistance(lastCurveEndPoint, mPoint);

                            // Check if path is closed (Z command or last point at M position)
                            if ((hasZCommand && endDistance < tolerance) || (!hasZCommand && endDistance < tolerance)) {
                                pairedCommandIndex = j;
                                pairedPointIndex = 1;
                                anchor = mPoint; // Use M point as anchor
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    if (pairedCommandIndex !== -1 && anchor) {
        return {
            commandIndex: pairedCommandIndex,
            pointIndex: pairedPointIndex,
            anchor
        };
    }

    return null;
}

/**
 * Get alignment information for a control point (calculated on-demand)
 * Returns null if the point is not a control point or if it's independent
 */
export function getControlPointAlignmentInfo(
    commands: Command[],
    points: ControlPoint[],
    commandIndex: number,
    pointIndex: number
): import('../../types').ControlPointAlignmentInfo | null {
    const point = points.find(p => p.commandIndex === commandIndex && p.pointIndex === pointIndex);

    if (!point || !point.isControl) {
        return null;
    }

    // Find the paired control point
    const pairedInfo = findPairedControlPoint(commands, commandIndex, pointIndex);

    if (!pairedInfo) {
        return {
            type: 'independent',
            anchor: point.anchor
        };
    }

    // Check if paired point shares the same anchor
    const tolerance = 0.1;
    const anchorDistance = pointDistance(point.anchor, pairedInfo.anchor);

    if (anchorDistance >= tolerance) {
        return {
            type: 'independent',
            anchor: point.anchor
        };
    }

    // Calculate alignment type
    const alignmentType = determineControlPointAlignment(
        commands,
        commandIndex,
        pointIndex,
        pairedInfo.commandIndex,
        pairedInfo.pointIndex,
        pairedInfo.anchor
    );

    return {
        type: alignmentType,
        pairedCommandIndex: pairedInfo.commandIndex,
        pairedPointIndex: pairedInfo.pointIndex,
        anchor: pairedInfo.anchor
    };
}
