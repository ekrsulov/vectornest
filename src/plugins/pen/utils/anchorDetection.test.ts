import { describe, expect, it } from 'vitest';
import type { CanvasElement, GroupElement, PathElement } from '../../../types';
import { findPathAtPoint } from './anchorDetection';

const createPathElement = (
  id: string,
  parentId: string | null,
  subPath: PathElement['data']['subPaths'][number],
  transformMatrix?: [number, number, number, number, number, number]
): PathElement => ({
  id,
  type: 'path',
  zIndex: 1,
  parentId,
  data: {
    subPaths: [subPath],
    strokeWidth: 1,
    strokeColor: '#000000',
    strokeOpacity: 1,
    fillColor: 'none',
    fillOpacity: 1,
    transformMatrix,
  },
});

const createGroupElement = (
  id: string,
  childIds: string[],
  transform: GroupElement['data']['transform']
): GroupElement => ({
  id,
  type: 'group',
  zIndex: 0,
  parentId: null,
  data: {
    childIds,
    name: id,
    isExpanded: true,
    isHidden: false,
    isLocked: false,
    transform,
  },
});

describe('findPathAtPoint', () => {
  it('detects paths inside transformed groups using world coordinates', () => {
    const path = createPathElement('path-1', 'group-1', [
      { type: 'M', position: { x: 0, y: 0 } },
      { type: 'L', position: { x: 10, y: 0 } },
    ]);
    const group = createGroupElement('group-1', ['path-1'], {
      translateX: 100,
      translateY: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
    const elements: CanvasElement[] = [group, path];

    const result = findPathAtPoint({ x: 105, y: 50 }, elements, 1);

    expect(result).not.toBeNull();
    expect(result?.pathId).toBe('path-1');
    expect(result?.penPath.anchors[0].position).toEqual({ x: 100, y: 50 });
    expect(result?.penPath.anchors[1].position).toEqual({ x: 110, y: 50 });
  });

  it('scales the local hit threshold for paths inside scaled groups', () => {
    const path = createPathElement('path-3', 'group-2', [
      { type: 'M', position: { x: 0, y: 0 } },
      { type: 'L', position: { x: 10, y: 0 } },
    ]);
    const group = createGroupElement('group-2', ['path-3'], {
      translateX: 200,
      translateY: 300,
      rotation: 0,
      scaleX: 23.841475,
      scaleY: 23.841475,
    });
    const elements: CanvasElement[] = [group, path];

    const nearResult = findPathAtPoint({ x: 200 + 23.841475 * 5, y: 300 + 4 }, elements, 1);
    const farResult = findPathAtPoint({ x: 200 + 23.841475 * 5, y: 300 + 9 }, elements, 1);

    expect(nearResult).not.toBeNull();
    expect(farResult).toBeNull();
  });

  it('applies element transformMatrix when detecting path hit', () => {
    const path = createPathElement(
      'path-2',
      null,
      [
        { type: 'M', position: { x: 0, y: 0 } },
        { type: 'L', position: { x: 10, y: 0 } },
      ],
      [1, 0, 0, 1, 30, 40]
    );
    const elements: CanvasElement[] = [path];

    const result = findPathAtPoint({ x: 35, y: 40 }, elements, 1);

    expect(result).not.toBeNull();
    expect(result?.pathId).toBe('path-2');
    expect(result?.penPath.anchors[0].position).toEqual({ x: 30, y: 40 });
    expect(result?.penPath.anchors[1].position).toEqual({ x: 40, y: 40 });
  });
});
