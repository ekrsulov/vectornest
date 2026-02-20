import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { FlipHorizontal2 } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createSymmetryMirrorSlice } from './slice';
import type { SymmetryMirrorPluginSlice } from './slice';
import type { SymmetryDrawPluginSlice } from '../symmetryDraw/slice';
import { SymmetryMirrorPanel } from './SymmetryMirrorPanel';
import { createSettingsPanel } from '../../utils/pluginFactories';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { getMirrorTransforms, transformSubPaths } from './mirrorUtils';
import type { PathData, CanvasElement } from '../../types';

registerStateKeys('symmetryMirror', ['symmetryMirror'], 'temporal');

const symmetryMirrorSliceFactory = createPluginSlice(createSymmetryMirrorSlice);

type CombinedStore = CanvasStore & SymmetryMirrorPluginSlice & SymmetryDrawPluginSlice;

/**
 * Create mirror path data from a source, stripping isPencilPath so the pencil
 * tool never targets mirror copies when looking for the active drawing path.
 */
function buildMirrorData(
  srcData: PathData,
  transformedSubPaths: PathData['subPaths']
): PathData {
  return {
    ...srcData,
    subPaths: transformedSubPaths,
    isPencilPath: false,
  };
}

export const symmetryMirrorPlugin: PluginDefinition<CanvasStore> = {
  id: 'symmetryMirror',
  metadata: {
    label: 'Symmetry Mirror',
    icon: FlipHorizontal2,
    cursor: 'default',
  },
  supportsMobile: true,
  dependencies: ['symmetryDraw'],
  slices: [symmetryMirrorSliceFactory],
  sidebarPanels: [
    createSettingsPanel('symmetry-mirror-settings', SymmetryMirrorPanel),
  ],

  init: (context) => {
    // Map: source element ID → mirror element IDs
    const sourceToMirrors = new Map<string, string[]>();
    let busy = false;

    const unsubscribe = context.store.subscribe((state, prevState) => {
      if (busy) return;

      const store = state as unknown as CombinedStore;
      const prev = prevState as unknown as CombinedStore;
      const mirrorCfg = store.symmetryMirror;
      const symCfg = store.symmetryDraw;

      // When mirror or symmetry is disabled, clear runtime mappings
      if (!mirrorCfg?.enabled || !symCfg?.enabled) {
        if (sourceToMirrors.size > 0) sourceToMirrors.clear();
        return;
      }

      // Fast bail: no element changes
      if (store.elements === prev.elements) return;

      const { mode, centerX, centerY, segments } = symCfg;
      const mirroredSet = new Set(mirrorCfg.mirroredIds);

      // Build previous-element lookup
      const prevById = new Map<string, CanvasElement>();
      for (const el of prev.elements) prevById.set(el.id, el);

      busy = true;
      try {
        // 1. NEW path elements → create mirror copies
        for (const el of store.elements) {
          if (el.type !== 'path') continue;
          if (mirroredSet.has(el.id)) continue;   // is itself a mirror
          if (prevById.has(el.id)) continue;        // not new
          if (sourceToMirrors.has(el.id)) continue;  // already mapped

          const srcData = el.data as PathData;
          const transforms = getMirrorTransforms(mode, centerX, centerY, segments);
          const ids: string[] = [];

          for (const fn of transforms) {
            const mirrorId = store.addElement({
              type: 'path' as const,
              data: buildMirrorData(srcData, transformSubPaths(srcData.subPaths, fn)),
            });
            store.addMirroredId(mirrorId);
            ids.push(mirrorId);
          }

          sourceToMirrors.set(el.id, ids);
        }

        // 2. CHANGED source elements → update their mirrors in real-time
        for (const el of store.elements) {
          if (el.type !== 'path') continue;
          if (!sourceToMirrors.has(el.id)) continue;

          const oldEl = prevById.get(el.id);
          if (!oldEl || oldEl === el) continue; // no change

          const srcData = el.data as PathData;
          const transforms = getMirrorTransforms(mode, centerX, centerY, segments);
          const mirrorIds = sourceToMirrors.get(el.id)!;
          const count = Math.min(transforms.length, mirrorIds.length);

          for (let i = 0; i < count; i++) {
            store.updateElement(mirrorIds[i], {
              data: buildMirrorData(srcData, transformSubPaths(srcData.subPaths, transforms[i])),
            });
          }
        }

        // 3. Deleted sources → clean up mapping
        const currentIds = new Set(store.elements.map((e) => e.id));
        for (const sid of sourceToMirrors.keys()) {
          if (!currentIds.has(sid)) sourceToMirrors.delete(sid);
        }
      } finally {
        busy = false;
      }
    });

    return () => {
      unsubscribe();
      sourceToMirrors.clear();
    };
  },
};

export type { SymmetryMirrorPluginSlice } from './slice';
