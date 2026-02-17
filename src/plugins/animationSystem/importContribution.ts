import { registerImportContribution } from '../../utils/importContributionRegistry';
import { mergeImportedAnimations, type ImportedAnimationPayload } from '../../utils/importMergeUtils';

registerImportContribution({
  pluginId: 'animation',
  merge: (imports, sourceIdMap) => {
    mergeImportedAnimations(imports as ImportedAnimationPayload[] | undefined, sourceIdMap);
  },
});
