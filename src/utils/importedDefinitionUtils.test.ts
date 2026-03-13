import { describe, expect, it } from 'vitest';
import type { CanvasElement } from '../types';
import type { CanvasStore } from '../store/canvasStore';
import { expandElementsWithReferencedDefinitions } from './importedDefinitionUtils';

describe('expandElementsWithReferencedDefinitions', () => {
  it('includes definition targets referenced from rawContent hrefs and mpath nodes', () => {
    const orbit: CanvasElement = {
      id: 'orbit-runtime',
      type: 'path',
      zIndex: 1,
      parentId: null,
      data: {
        subPaths: [],
        isDefinition: true,
        sourceId: 'orbit',
      },
    };

    const flower: CanvasElement = {
      id: 'flower-runtime',
      type: 'group',
      zIndex: 2,
      parentId: null,
      data: {
        childIds: [],
        name: 'flower',
        isLocked: false,
        isHidden: false,
        isExpanded: true,
        isDefinition: true,
        sourceId: 'flower',
        transform: {
          translateX: 0,
          translateY: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
    };

    const systemUse: CanvasElement = {
      id: 'system-use',
      type: 'use',
      zIndex: 3,
      parentId: null,
      data: {
        href: 'system',
        rawContent: `
          <g>
            <use href="#flower" />
            <animateMotion dur="9s" repeatCount="indefinite">
              <mpath href="#orbit" />
            </animateMotion>
          </g>
        `,
      },
    };

    const state = {
      elements: [orbit, flower, systemUse],
    } as unknown as CanvasStore;

    const expanded = expandElementsWithReferencedDefinitions([systemUse], state);
    const expandedIds = new Set(expanded.map((element) => element.id));

    expect(expandedIds).toEqual(new Set(['system-use', 'flower-runtime', 'orbit-runtime']));
  });

  it('includes definition targets referenced by imported animateMotion state on definition subtrees', () => {
    const orbit: CanvasElement = {
      id: 'orbit-runtime',
      type: 'path',
      zIndex: 1,
      parentId: null,
      data: {
        subPaths: [],
        isDefinition: true,
        sourceId: 'orbit',
      },
    };

    const motionHost: CanvasElement = {
      id: 'system-child',
      type: 'group',
      zIndex: 2,
      parentId: 'system-runtime',
      data: {
        childIds: [],
        name: 'motion-host',
        isLocked: false,
        isHidden: false,
        isExpanded: true,
        isDefinition: true,
        sourceId: 'motion-host',
        transform: {
          translateX: 0,
          translateY: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
    };

    const system: CanvasElement = {
      id: 'system-runtime',
      type: 'group',
      zIndex: 3,
      parentId: null,
      data: {
        childIds: ['system-child'],
        name: 'system',
        isLocked: false,
        isHidden: false,
        isExpanded: true,
        isDefinition: true,
        sourceId: 'system',
        transform: {
          translateX: 0,
          translateY: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
    };

    const visibleUse: CanvasElement = {
      id: 'visible-system-use',
      type: 'use',
      zIndex: 4,
      parentId: null,
      data: {
        href: 'system-runtime',
      },
    };

    const state = {
      elements: [orbit, motionHost, system, visibleUse],
      animations: [
        {
          id: 'anim-1',
          type: 'animateMotion',
          targetElementId: 'system-child',
          mpath: 'orbit-runtime',
        },
      ],
    } as unknown as CanvasStore;

    const expanded = expandElementsWithReferencedDefinitions([visibleUse], state);
    const expandedIds = new Set(expanded.map((element) => element.id));

    expect(expandedIds).toEqual(new Set(['visible-system-use', 'system-runtime', 'system-child', 'orbit-runtime']));
  });
});