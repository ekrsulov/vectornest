import { registerCoreGizmos } from './contributions';

let coreGizmosRegistered = false;

export function ensureCoreGizmosRegistered(): void {
  if (coreGizmosRegistered) return;
  registerCoreGizmos();
  coreGizmosRegistered = true;
}
