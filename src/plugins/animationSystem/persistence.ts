import { registerPersistenceContribution, registerStateKeys } from '../../store/persistenceRegistry';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPluginSlice } from './types';

type AnimationStore = CanvasStore & Partial<AnimationPluginSlice>;

registerStateKeys('animation', ['timelineLabelWidth'], 'temporal');

registerPersistenceContribution({
  pluginId: 'animation',
  persistPartialize: (state: CanvasStore) => {
    const animationState = state as AnimationStore;
    return {
      animations: animationState.animations ?? [],
      animationSync: {
        chains: animationState.animationSync?.chains ?? [],
        events: [],
      },
      timelineLabelWidth: animationState.timelineLabelWidth ?? 170,
    };
  },
});
