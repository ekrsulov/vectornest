import type { Point, Command, SubPath, ControlPoint } from '../../types';
import { PATH_DECIMAL_PRECISION } from '../../types';
import { formatToPrecision } from '../numberUtils';

/**
 * Parse SVG path d string into commands and points
 */
export function parsePathD(d: string): Command[] {
    const commands: Command[] = [];
    // Ensure whitespace around command letters to simplify tokenization (handles compact paths like "M0,-42L10,20Z")
    const normalizedD = d.replace(/([MLCZmlcz])/g, ' $1 ');
    const tokens = normalizedD.trim().split(/[\s,]+/);

    let i = 0;
    let commandIndex = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        if (!token) {
            i++;
            continue;
        }

        const command = token.toUpperCase();
        if (command === 'M') {
            const points: Point[] = [];
            i++;
            while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                const x = parseFloat(tokens[i]);
                const y = parseFloat(tokens[i + 1]);
                if (!Number.isFinite(x) || !Number.isFinite(y)) break;
                points.push({ x, y });
                i += 2;
            }
            // Per SVG spec: first coordinate pair is M, subsequent pairs become implicit L commands
            if (points.length > 0) {
                commands.push({ type: 'M', position: points[0] });
                for (let p = 1; p < points.length; p++) {
                    commandIndex++;
                    commands.push({ type: 'L', position: points[p] });
                }
            }
        } else if (command === 'L') {
            const points: Point[] = [];
            i++;
            while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                const x = parseFloat(tokens[i]);
                const y = parseFloat(tokens[i + 1]);
                if (!Number.isFinite(x) || !Number.isFinite(y)) break;
                points.push({ x, y });
                i += 2;
            }
            // Each coordinate pair produces a separate L command
            for (let p = 0; p < points.length; p++) {
                if (p > 0) commandIndex++;
                commands.push({ type: 'L', position: points[p] });
            }
        } else if (command === 'C') {
            const points: Point[] = [];
            i++;
            while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
                const x = parseFloat(tokens[i]);
                const y = parseFloat(tokens[i + 1]);
                points.push({ x, y });
                i += 2;
            }
            const controlPoint1: ControlPoint = {
                ...points[0],
                commandIndex,
                pointIndex: 0,
                anchor: points[2],
                isControl: true
            };
            const controlPoint2: ControlPoint = {
                ...points[1],
                commandIndex,
                pointIndex: 1,
                anchor: points[2],
                isControl: true
            };
            commands.push({ type: 'C', controlPoint1, controlPoint2, position: points[2] });
        } else if (command === 'Z') {
            commands.push({ type: 'Z' });
            i++;
        } else {
            i++;
        }
        commandIndex++;
    }

    return commands;
}

/**
 * Get the starting point for a command (needed for control line drawing)
 */
export function getCommandStartPoint(commands: Command[], commandIndex: number): Point | null {
    if (commandIndex === 0) {
        // First command should be M
        if (commands[0].type === 'M') {
            return commands[0].position;
        }
        return null;
    }

    // For subsequent commands, the start point is the last point of the previous command
    const prevCommand = commands[commandIndex - 1];
    if (prevCommand.type === 'Z') {
        // Z closes to the first M point
        if (commands[0].type === 'M') {
            return commands[0].position;
        }
        return null;
    }

    // Get the last point of the previous command
    if (prevCommand.type === 'M' || prevCommand.type === 'L') {
        return prevCommand.position;
    } else if (prevCommand.type === 'C') {
        return prevCommand.position;
    }
    return null;
}

/**
 * Normalize path commands by removing invalid commands and consecutive Z commands
 */
export function normalizePathCommands(commands: Command[]): Command[] {
    if (commands.length === 0) return [];

    const normalized: Command[] = [];
    let lastWasZ = false;

    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];

        // Skip null or undefined commands
        if (!cmd) continue;

        // Handle Z commands - don't allow consecutive Z commands
        if (cmd.type === 'Z') {
            if (!lastWasZ) {
                normalized.push(cmd);
                lastWasZ = true;
            }
            // Skip consecutive Z commands
            continue;
        }

        // Reset Z flag for non-Z commands
        lastWasZ = false;

        // For M and L, check position
        if ((cmd.type === 'M' || cmd.type === 'L') && (!cmd.position || !isFinite(cmd.position.x) || !isFinite(cmd.position.y))) {
            continue;
        }

        // For C, check all points
        if (cmd.type === 'C') {
            if (!cmd.controlPoint1 || !isFinite(cmd.controlPoint1.x) || !isFinite(cmd.controlPoint1.y) ||
                !cmd.controlPoint2 || !isFinite(cmd.controlPoint2.x) || !isFinite(cmd.controlPoint2.y) ||
                !cmd.position || !isFinite(cmd.position.x) || !isFinite(cmd.position.y)) {
                continue;
            }
        }

        normalized.push(cmd);
    }

    // Remove trailing Z if it's the only command
    if (normalized.length === 1 && normalized[0].type === 'Z') {
        return [];
    }

    return normalized;
}

/**
 * Extract subpaths from the main path commands
 */
export function extractSubpaths(commands: Command[]): { commands: SubPath; d: string; startIndex: number; endIndex: number }[] {
    const subpaths: { commands: SubPath; d: string; startIndex: number; endIndex: number }[] = [];
    let currentStart = 0;

    for (let i = 0; i < commands.length; i++) {
        if (commands[i].type === 'M' && i > 0) {
            // End previous subpath
            const subpathCommands = commands.slice(currentStart, i);
            const d = commandsToString(subpathCommands);
            subpaths.push({ commands: subpathCommands, d, startIndex: currentStart, endIndex: i - 1 });
            currentStart = i;
        }
    }

    // Last subpath
    if (currentStart < commands.length) {
        const subpathCommands = commands.slice(currentStart);
        const d = commandsToString(subpathCommands);
        subpaths.push({ commands: subpathCommands, d, startIndex: currentStart, endIndex: commands.length - 1 });
    }

    return subpaths;
}

export function commandsToString(commands: Command[]): string {
    const result = commands.map(cmd => {
        if (!cmd) return ''; // Guard against undefined/null commands
        if (cmd.type === 'Z') return 'Z';
        if (cmd.type === 'M' || cmd.type === 'L') {
            // Validate that position exists
            if (!cmd.position || typeof cmd.position.x !== 'number' || typeof cmd.position.y !== 'number') {
                return '';
            }
            return `${cmd.type} ${formatToPrecision(cmd.position.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.y, PATH_DECIMAL_PRECISION)}`;
        }
        if (cmd.type === 'C') {
            // Validate that all required properties exist
            if (!cmd.controlPoint1 || !cmd.controlPoint2 || !cmd.position ||
                typeof cmd.controlPoint1.x !== 'number' || typeof cmd.controlPoint1.y !== 'number' ||
                typeof cmd.controlPoint2.x !== 'number' || typeof cmd.controlPoint2.y !== 'number' ||
                typeof cmd.position.x !== 'number' || typeof cmd.position.y !== 'number') {
                return '';
            }
            return `${cmd.type} ${formatToPrecision(cmd.controlPoint1.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint1.y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint2.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.controlPoint2.y, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.x, PATH_DECIMAL_PRECISION)} ${formatToPrecision(cmd.position.y, PATH_DECIMAL_PRECISION)}`;
        }
        return '';
    }).join(' ');

    return result;
}
