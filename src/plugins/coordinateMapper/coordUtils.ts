import type { CanvasElement, Command, Point } from '../../types';
import type { CoordLabel } from './slice';
import { getPathSubPathsInWorld } from '../../utils/pathWorldUtils';

type ElementsSource = CanvasElement[] | Map<string, CanvasElement>;

export function extractCoordinates(
  elements: CanvasElement[],
  showAnchors: boolean,
  showControls: boolean,
  showCenters: boolean,
  precision: number,
  elementsSource?: ElementsSource
): CoordLabel[] {
  const labels: CoordLabel[] = [];
  const fmt = (v: number) => Number(v.toFixed(precision));
  const worldSource = elementsSource ?? elements;

  for (const el of elements) {
    if (el.type !== 'path') continue;
    const worldSubPaths = getPathSubPathsInWorld(el, worldSource);

    if (showCenters) {
      const allPts = worldSubPaths.flatMap((sp) =>
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

    for (const sp of worldSubPaths) {
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
