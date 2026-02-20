import type { CanvasElement, SubPath, Command } from '../../types';
import type { TangentLine } from './slice';

export function computeTangents(elements: CanvasElement[]): TangentLine[] {
  const tangents: TangentLine[] = [];

  for (const el of elements) {
    if (el.type !== 'path') continue;

    for (const sp of el.data.subPaths as SubPath[]) {
      const cmds = sp as Command[];
      for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        if (cmd.type === 'Z') continue;

        let angle: number | null = null;

        // Outgoing tangent
        if (i < cmds.length - 1) {
          const next = cmds[i + 1];
          if (next.type === 'C') {
            // Tangent toward first control point
            const dx = next.controlPoint1.x - cmd.position.x;
            const dy = next.controlPoint1.y - cmd.position.y;
            if (dx !== 0 || dy !== 0) {
              angle = Math.atan2(dy, dx);
            }
          } else if (next.type !== 'Z') {
            const dx = next.position.x - cmd.position.x;
            const dy = next.position.y - cmd.position.y;
            if (dx !== 0 || dy !== 0) {
              angle = Math.atan2(dy, dx);
            }
          }
        }

        // Incoming tangent (if no outgoing)
        if (angle === null && i > 0) {
          const prev = cmds[i - 1];
          if (cmd.type === 'C') {
            const dx = cmd.position.x - cmd.controlPoint2.x;
            const dy = cmd.position.y - cmd.controlPoint2.y;
            if (dx !== 0 || dy !== 0) {
              angle = Math.atan2(dy, dx);
            }
          } else if (prev.type !== 'Z') {
            const dx = cmd.position.x - prev.position.x;
            const dy = cmd.position.y - prev.position.y;
            if (dx !== 0 || dy !== 0) {
              angle = Math.atan2(dy, dx);
            }
          }
        }

        if (angle !== null) {
          tangents.push({
            x: cmd.position.x,
            y: cmd.position.y,
            angle,
            length: 1, // normalized, scaled by lineLength in overlay
          });
        }
      }
    }
  }

  return tangents;
}
