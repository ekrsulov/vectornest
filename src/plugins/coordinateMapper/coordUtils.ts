import type { CanvasElement, SubPath, Command, Point } from '../../types';
import type { CoordLabel } from './slice';

export function extractCoordinates(
  elements: CanvasElement[],
  showAnchors: boolean,
  showControls: boolean,
  showCenters: boolean,
  precision: number
): CoordLabel[] {
  const labels: CoordLabel[] = [];
  const fmt = (v: number) => Number(v.toFixed(precision));

  for (const el of elements) {
    if (el.type !== 'path') continue;

    if (showCenters) {
      const allPts = (el.data.subPaths as SubPath[]).flatMap((sp: SubPath) =>
        (sp as Command[]).filter((c: Command) => c.type !== 'Z').map((c: Command) => (c as { position: Point }).position)
      );
      if (allPts.length > 0) {
        const cx = allPts.reduce((s: number, p: Point) => s + p.x, 0) / allPts.length;
        const cy = allPts.reduce((s: number, p: Point) => s + p.y, 0) / allPts.length;
        labels.push({
          x: fmt(cx),
          y: fmt(cy),
          label: `(${fmt(cx)}, ${fmt(cy)})`,
          elementId: el.id,
          type: 'center',
        });
      }
    }

    for (const sp of el.data.subPaths as SubPath[]) {
      for (const cmd of sp as Command[]) {
        if (cmd.type === 'Z') continue;

        if (showAnchors) {
          labels.push({
            x: fmt(cmd.position.x),
            y: fmt(cmd.position.y),
            label: `(${fmt(cmd.position.x)}, ${fmt(cmd.position.y)})`,
            elementId: el.id,
            type: 'anchor',
          });
        }

        if (showControls && cmd.type === 'C') {
          labels.push({
            x: fmt(cmd.controlPoint1.x),
            y: fmt(cmd.controlPoint1.y),
            label: `(${fmt(cmd.controlPoint1.x)}, ${fmt(cmd.controlPoint1.y)})`,
            elementId: el.id,
            type: 'control',
          });
          labels.push({
            x: fmt(cmd.controlPoint2.x),
            y: fmt(cmd.controlPoint2.y),
            label: `(${fmt(cmd.controlPoint2.x)}, ${fmt(cmd.controlPoint2.y)})`,
            elementId: el.id,
            type: 'control',
          });
        }
      }
    }
  }

  return labels;
}
