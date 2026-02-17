/**
 * PluginProviders Component
 *
 * Renders React providers contributed by plugins in registration order.
 * This allows plugins to wrap the application with their own context providers
 * without the core needing to know about specific plugins.
 */

import React, { useMemo, useRef } from 'react';
import { pluginManager } from '../utils/pluginManager';

/**
 * Inner wrapper that nests plugin providers.
 * Memoized separately from children to avoid re-nesting on every render.
 */
const PluginProviderWrapper: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const providersRef = useRef(pluginManager.getPluginProviders());
  // Only recompute the provider chain identity when the list length changes
  // (providers are registered once during init, so this is effectively stable)
  const currentProviders = pluginManager.getPluginProviders();
  if (
    currentProviders.length !== providersRef.current.length ||
    currentProviders.some((p, i) => p.id !== providersRef.current[i]?.id)
  ) {
    providersRef.current = currentProviders;
  }
  const providers = providersRef.current;

  const wrappedChildren = useMemo(() => {
    return providers.reduceRight(
      (acc: React.ReactNode, provider) => {
        const ProviderComponent = provider.component;
        return (
          <ProviderComponent key={provider.id}>{acc}</ProviderComponent>
        );
      },
      children
    );
  }, [providers, children]);

  return <>{wrappedChildren}</>;
});
PluginProviderWrapper.displayName = 'PluginProviderWrapper';

export const PluginProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <PluginProviderWrapper>{children}</PluginProviderWrapper>;
};
