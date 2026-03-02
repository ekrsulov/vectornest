import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import { theme } from './theme'
import { pluginManager } from './utils/pluginManager'
import {
  CORE_PLUGINS,
  DEFERRED_PLUGIN_BATCHES,
  getDeferredPluginBatchIdsForUiState,
  type DeferredPluginBatchId,
} from './plugins'
import { canvasStoreApi } from './store/canvasStore'
import { DEFAULT_TOOL } from './constants'

const DesignSystemPage = lazy(() => import('./design-system'))

// Small helper to render the design system without a router
const isDesignSystemRoute = () => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  return pathname.startsWith('/design-system') || search.has('design-system');
};

const loadedDeferredPluginBatchIds = new Set<DeferredPluginBatchId>();
const deferredPluginBatchPromises = new Map<DeferredPluginBatchId, Promise<void>>();

const loadDeferredPluginBatch = (batchId: DeferredPluginBatchId): Promise<void> => {
  if (loadedDeferredPluginBatchIds.has(batchId)) {
    return Promise.resolve();
  }

  const existingPromise = deferredPluginBatchPromises.get(batchId);
  if (existingPromise) {
    return existingPromise;
  }

  const batch = DEFERRED_PLUGIN_BATCHES.find((entry) => entry.id === batchId);
  if (!batch) {
    return Promise.resolve();
  }

  const promise = batch.loadPlugins()
    .then((plugins) => {
      plugins.forEach((plugin) => {
        pluginManager.register(plugin);
      });
      loadedDeferredPluginBatchIds.add(batchId);
    })
    .finally(() => {
      deferredPluginBatchPromises.delete(batchId);
    });

  deferredPluginBatchPromises.set(batchId, promise);
  return promise;
};

const ensureDeferredPluginsForVisiblePanels = () => {
  const state = canvasStoreApi.getState();
  const requiredBatchIds = getDeferredPluginBatchIdsForUiState(state);

  requiredBatchIds.forEach((batchId) => {
    void loadDeferredPluginBatch(batchId);
  });
};

const scheduleDeferredPluginRegistration = () => {
  const loadDeferredPlugins = async () => {
    for (const batch of DEFERRED_PLUGIN_BATCHES) {
      await loadDeferredPluginBatch(batch.id);
    }
  };

  const startLoading = () => {
    void loadDeferredPlugins();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      startLoading();
    });
    return;
  }

  setTimeout(startLoading, 0);
};

const designSystemRoute = isDesignSystemRoute();

if (!designSystemRoute) {
  pluginManager.setStoreApi(canvasStoreApi)

  // Set initial mode when canvas is empty
  const state = canvasStoreApi.getState();
  if (state.elements.length === 0) {
    canvasStoreApi.setState({ activePlugin: DEFAULT_TOOL });
  }

  CORE_PLUGINS.forEach((plugin) => {
    pluginManager.register(plugin)
  })

  ensureDeferredPluginsForVisiblePanels();
  canvasStoreApi.subscribe((state, previousState) => {
    const relevantUiStateChanged =
      state.activePlugin !== previousState.activePlugin ||
      state.showFilePanel !== previousState.showFilePanel ||
      state.showSettingsPanel !== previousState.showSettingsPanel ||
      state.showLibraryPanel !== previousState.showLibraryPanel ||
      state.leftSidebarActivePanel !== previousState.leftSidebarActivePanel ||
      state.selectedIds.length !== previousState.selectedIds.length;

    if (!relevantUiStateChanged) {
      return;
    }

    ensureDeferredPluginsForVisiblePanels();
  });

  scheduleDeferredPluginRegistration();

  // Conditionally expose test globals whenever we're not in production
  if (process.env.NODE_ENV !== 'production') {
    import('./testing/testHelpers').then(({ exposeTestGlobals }) => exposeTestGlobals());
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is an element with id="root" in your HTML.');
}

const RootApp = designSystemRoute ? (
  <Suspense fallback={null}>
    <DesignSystemPage />
  </Suspense>
) : <App />;

createRoot(rootElement).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {RootApp}
    </ChakraProvider>
  </StrictMode>,
)
