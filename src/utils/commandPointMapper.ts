import type { Command, Point } from '../types';

/**
 * Point mapper function type.
 * Receives a point and returns a transformed point.
 */
export type PointMapper = (point: Point) => Point;

/**
 * Generic function to map all geometric points in a command array through a
 * transformation function. This eliminates the duplicated M/L/C/Z iteration
 * pattern that previously appeared in 5+ locations (translateCommands,
 * transformCommands, rotateCommands, applyAffineToPath, etc.).
 *
 * For control points on cubic bezier curves, the ControlPoint metadata
 * (type, isControl, associatedCommandIndex, etc.) is preserved — only the
 * x/y coordinates are replaced.
 *
 * @param commands - Array of path commands to transform
 * @param mapper  - Function to apply to each point (position, controlPoint1, controlPoint2)
 * @returns New array of transformed commands
 */
export function mapCommandPoints(
  commands: Command[],
  mapper: PointMapper
): Command[] {
  return commands.map((cmd) => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      return {
        ...cmd,
        position: mapper(cmd.position),
      };
    }
    if (cmd.type === 'C') {
      const mappedCp1 = mapper(cmd.controlPoint1);
      const mappedCp2 = mapper(cmd.controlPoint2);
      return {
        ...cmd,
        controlPoint1: { ...cmd.controlPoint1, x: mappedCp1.x, y: mappedCp1.y },
        controlPoint2: { ...cmd.controlPoint2, x: mappedCp2.x, y: mappedCp2.y },
        position: mapper(cmd.position),
      };
    }
    // Z commands have no points to transform
    return cmd;
  });
}
