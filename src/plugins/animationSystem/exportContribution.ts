import { registerExportContribution } from '../../utils/exportContributionRegistry';
import { serializeAnimation } from './index';

registerExportContribution({
  pluginId: 'animation',
  serializeAnimation: (animation, chainDelays) => {
    return serializeAnimation(animation as Parameters<typeof serializeAnimation>[0], chainDelays);
  },
});
