import { useEffect, useState } from 'react';
import { pluginManager } from '../utils/pluginManager';

/**
 * Triggers a re-render when the plugin registry changes.
 * Useful for UI that reads pluginManager synchronously.
 */
export function usePluginRegistrationVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => (
    pluginManager.onPluginRegistrationChange(() => {
      setVersion((current) => current + 1);
    })
  ), []);

  return version;
}
