import type { Command, Point, SubPath } from '../../../types';
import { PATH_JOIN_TOLERANCE } from '../../../constants';

/**
 * Reverse the direction of a subpath.
 */
export function reverseSubPath(subPath: SubPath): SubPath {
  if (subPath.length <= 1) {
    return subPath;
  }

  const hasZ = subPath[subPath.length - 1].type === 'Z';
  const commands = hasZ ? subPath.slice(0, -1) : subPath;

  if (commands.length <= 1) {
    return hasZ ? [...commands, { type: 'Z' }] : commands;
  }

  const reversedCommands = [...commands].reverse();
  const newCommands: Command[] = [];

  const firstPoint = (commands[commands.length - 1] as Exclude<Command, { type: 'Z' }>).position;
  newCommands.push({
    type: 'M',
    position: firstPoint,
  });

  for (let i = 0; i < reversedCommands.length - 1; i++) {
    const cmd = reversedCommands[i];
    const previousPoint = (reversedCommands[i + 1] as Exclude<Command, { type: 'Z' }>).position;

    switch (cmd.type) {
      case 'M':
        newCommands.push({
          type: 'L',
          position: previousPoint,
        });
        break;

      case 'L':
        newCommands.push({
          type: 'L',
          position: previousPoint,
        });
        break;

      case 'C':
        newCommands.push({
          type: 'C',
          controlPoint1: cmd.controlPoint2,
          controlPoint2: cmd.controlPoint1,
          position: previousPoint,
        });
        break;
    }
  }

  if (hasZ) {
    newCommands.push({ type: 'Z' });
  }

  return newCommands;
}

/**
 * Join subpaths that have their end and start points matching (with tolerance).
 */
export function joinSubPaths(subPaths: SubPath[], tolerance = PATH_JOIN_TOLERANCE): SubPath[] {
  const getStart = (sp: SubPath): Point | null => {
    for (const cmd of sp) {
      if (cmd.type === 'M') {
        return cmd.position;
      }
    }
    return null;
  };

  const getEnd = (sp: SubPath): Point | null => {
    if (sp.length === 0) {
      return null;
    }
    const last = sp[sp.length - 1];
    if (last.type === 'Z') {
      return getStart(sp);
    }
    return (last as Exclude<Command, { type: 'Z' }>).position;
  };

  const posEqual = (a: Point, b: Point) =>
    Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;

  const mergeTwo = (a: SubPath, b: SubPath): SubPath => {
    const newB: SubPath = b.map((cmd, idx) => {
      if (idx === 0 && cmd.type === 'M') {
        return { type: 'L', position: cmd.position } as Command;
      }
      return { ...cmd } as Command;
    });

    const aLast = a[a.length - 1];
    const bFirst = newB[0];
    if (
      aLast &&
      bFirst &&
      (aLast.type === 'L' || aLast.type === 'C' || aLast.type === 'M') &&
      bFirst.type === 'L'
    ) {
      const aPos =
        aLast.type === 'C' ? aLast.position : (aLast as Exclude<Command, { type: 'Z' }>).position;
      const bPos = bFirst.position;
      if (aPos && posEqual(aPos, bPos)) {
        newB.shift();
      }
    }

    return [...a, ...newB];
  };

  const working: SubPath[] = subPaths.map((sp) => sp.map((cmd) => ({ ...cmd })));
  let changed = true;

  while (changed) {
    changed = false;
    outer: for (let i = 0; i < working.length; i++) {
      for (let j = 0; j < working.length; j++) {
        if (i === j) {
          continue;
        }

        const endI = getEnd(working[i]);
        const startJ = getStart(working[j]);
        if (!endI || !startJ) {
          continue;
        }

        if (posEqual(endI, startJ)) {
          working[i] = mergeTwo(working[i], working[j]);
          working.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }

  return working;
}
