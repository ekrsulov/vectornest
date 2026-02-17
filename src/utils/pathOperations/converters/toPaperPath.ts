import paper from 'paper';
import type { PathData, SubPath } from '../../../types';
import { PATH_JOIN_TOLERANCE } from '../../../constants';
import { ensurePaperSetup } from '../paperSetup';

function applyPathStyle(
  path: paper.Path,
  pathData: Pick<PathData, 'fillColor' | 'strokeColor' | 'strokeWidth'>
): void {
  path.fillColor = pathData.fillColor ? new paper.Color(pathData.fillColor) : null;
  path.strokeColor = pathData.strokeColor ? new paper.Color(pathData.strokeColor) : null;
  path.strokeWidth = pathData.strokeWidth || 1;
}

function buildPaperPathFromSubPath(
  subPath: SubPath,
  pathData: Pick<PathData, 'fillColor' | 'strokeColor' | 'strokeWidth'>
): paper.Path {
  const paperPath = new paper.Path();
  applyPathStyle(paperPath, pathData);

  let firstPosition: { x: number; y: number } | null = null;

  for (const cmd of subPath) {
    switch (cmd.type) {
      case 'M':
        firstPosition = cmd.position;
        paperPath.moveTo(new paper.Point(cmd.position.x, cmd.position.y));
        break;
      case 'L':
        paperPath.lineTo(new paper.Point(cmd.position.x, cmd.position.y));
        break;
      case 'C':
        paperPath.cubicCurveTo(
          new paper.Point(cmd.controlPoint1.x, cmd.controlPoint1.y),
          new paper.Point(cmd.controlPoint2.x, cmd.controlPoint2.y),
          new paper.Point(cmd.position.x, cmd.position.y)
        );
        break;
      case 'Z':
        paperPath.closePath();
        break;
    }
  }

  if (firstPosition && subPath.length > 1) {
    const lastCmd = subPath[subPath.length - 1];
    if (
      lastCmd.type !== 'Z' &&
      lastCmd.position &&
      Math.abs(lastCmd.position.x - firstPosition.x) < PATH_JOIN_TOLERANCE &&
      Math.abs(lastCmd.position.y - firstPosition.y) < PATH_JOIN_TOLERANCE
    ) {
      paperPath.closePath();
    }
  }

  return paperPath;
}

export function convertPathDataToPaperPath(pathData: PathData): paper.Path | paper.CompoundPath {
  ensurePaperSetup();

  if (pathData.subPaths.length === 1) {
    return buildPaperPathFromSubPath(pathData.subPaths[0], pathData);
  }

  const compoundPath = new paper.CompoundPath('');
  for (const subPath of pathData.subPaths) {
    const childPath = buildPaperPathFromSubPath(subPath, pathData);
    compoundPath.children.push(childPath);
  }

  return compoundPath;
}
