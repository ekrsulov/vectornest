import { registerExportContribution } from '../../utils/exportContributionRegistry';
import { serializeAnimation } from './index';

registerExportContribution({
  pluginId: 'animation',
  serializeAnimation: (animation, chainDelays, referenceAnimations) => {
    return serializeAnimation(
      animation as Parameters<typeof serializeAnimation>[0],
      chainDelays,
      referenceAnimations as Parameters<typeof serializeAnimation>[2]
    );
  },
});
