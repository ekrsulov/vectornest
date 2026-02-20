import type { CanvasElement, Command, SubPath } from '../../types';
import type { AnchorInfo, AnchorPointAnalysis } from './slice';

function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function normalizeAngle(a: number): number {
  while (a < -180) a += 360;
  while (a > 180) a -= 360;
  return a;
}

export function analyzeAnchorPoints(
  elements: CanvasElement[],
  smoothThreshold: number,
  shortHandleThreshold: number,
  longHandleMultiplier: number
): AnchorPointAnalysis {
  const anchors: AnchorInfo[] = [];
  const allHandleLengths: number[] = [];

  for (const el of elements) {
    if (el.type !== 'path') continue;

    for (let spIdx = 0; spIdx < (el.data.subPaths as SubPath[]).length; spIdx++) {
      const sp = (el.data.subPaths as SubPath[])[spIdx];
      const cmds = sp as Command[];

      for (let cmdIdx = 0; cmdIdx < cmds.length; cmdIdx++) {
        const cmd = cmds[cmdIdx];
        if (cmd.type === 'Z') continue;

        const pt = cmd.position;
        const prevCmd: Command | undefined = cmdIdx > 0 ? cmds[cmdIdx - 1] : undefined;
        const nextCmd: Command | undefined = cmdIdx < cmds.length - 1 ? cmds[cmdIdx + 1] : undefined;

        // Determine incoming and outgoing handle angles
        let inAngle: number | null = null;
        let outAngle: number | null = null;
        let inLen = 0;
        let outLen = 0;

        // Incoming: if current cmd is C, the cp2 -> position direction
        if (cmd.type === 'C') {
          inAngle = angleBetween(cmd.controlPoint2.x, cmd.controlPoint2.y, pt.x, pt.y);
          inLen = dist(cmd.controlPoint2.x, cmd.controlPoint2.y, pt.x, pt.y);
          allHandleLengths.push(inLen);
        } else if (prevCmd && prevCmd.type !== 'Z') {
          // Line incoming
          inAngle = angleBetween(prevCmd.position.x, prevCmd.position.y, pt.x, pt.y);
          inLen = dist(prevCmd.position.x, prevCmd.position.y, pt.x, pt.y);
        }

        // Outgoing: if next cmd is C, the position -> cp1 direction
        if (nextCmd && nextCmd.type === 'C') {
          outAngle = angleBetween(pt.x, pt.y, nextCmd.controlPoint1.x, nextCmd.controlPoint1.y);
          outLen = dist(pt.x, pt.y, nextCmd.controlPoint1.x, nextCmd.controlPoint1.y);
          allHandleLengths.push(outLen);
        } else if (nextCmd && nextCmd.type !== 'Z') {
          outAngle = angleBetween(pt.x, pt.y, nextCmd.position.x, nextCmd.position.y);
          outLen = dist(pt.x, pt.y, nextCmd.position.x, nextCmd.position.y);
        }

        let type: AnchorInfo['type'] = 'endpoint';
        let handleAngle: number | null = null;
        let handleLengthDiff: number | null = null;

        if (inAngle !== null && outAngle !== null) {
          // Compute angle difference — smooth points have ~180° between in and out
          const angleDiff = Math.abs(normalizeAngle(outAngle - inAngle));
          handleAngle = Math.round(angleDiff * 10) / 10;
          handleLengthDiff = inLen > 0 && outLen > 0
            ? Math.round(Math.abs(inLen - outLen) * 10) / 10
            : null;

          // Classify: smooth if angle ~180°, corner if sharp, cusp if handles on same side
          if (Math.abs(angleDiff - 180) < smoothThreshold) {
            type = 'smooth';
          } else if (angleDiff < 90) {
            type = 'cusp';
          } else {
            type = 'corner';
          }
        }

        anchors.push({
          elementId: el.id,
          subPathIndex: spIdx,
          commandIndex: cmdIdx,
          x: Math.round(pt.x * 10) / 10,
          y: Math.round(pt.y * 10) / 10,
          type,
          handleAngle,
          handleLengthDiff,
        });
      }
    }
  }

  const avgHandleLength = allHandleLengths.length > 0
    ? Math.round(allHandleLengths.reduce((s, v) => s + v, 0) / allHandleLengths.length * 10) / 10
    : 0;

  const shortHandles = allHandleLengths.filter(l => l > 0 && l < shortHandleThreshold).length;
  const longHandles = allHandleLengths.filter(l => l > avgHandleLength * longHandleMultiplier).length;

  return {
    totalAnchors: anchors.length,
    smoothCount: anchors.filter(a => a.type === 'smooth').length,
    cornerCount: anchors.filter(a => a.type === 'corner').length,
    cuspCount: anchors.filter(a => a.type === 'cusp').length,
    endpointCount: anchors.filter(a => a.type === 'endpoint').length,
    avgHandleLength,
    shortHandles,
    longHandles,
    anchors,
  };
}
