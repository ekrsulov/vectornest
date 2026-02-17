import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('lasso', ['lassoEnabled', 'lassoClosed', 'activeSelectionStrategy'], 'temporal');
