import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import DesignSystemPage from './design-system'
import { theme } from './theme'
import { pluginManager } from './utils/pluginManager'
import { CORE_PLUGINS } from './plugins'
import { canvasStoreApi } from './store/canvasStore'
import { DEFAULT_TOOL } from './constants'

pluginManager.setStoreApi(canvasStoreApi)

// Set initial mode when canvas is empty
const state = canvasStoreApi.getState();
if (state.elements.length === 0) {
  canvasStoreApi.setState({ activePlugin: DEFAULT_TOOL });
}

CORE_PLUGINS.forEach((plugin) => {
  pluginManager.register(plugin)
})

// Conditionally expose test globals whenever we're not in production
if (process.env.NODE_ENV !== 'production') {
  import('./testing/testHelpers').then(({ exposeTestGlobals }) => exposeTestGlobals());
}

// Small helper to render the design system without a router
const isDesignSystemRoute = () => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.toLowerCase();
  const search = new URLSearchParams(window.location.search);
  return pathname.startsWith('/design-system') || search.has('design-system');
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is an element with id="root" in your HTML.');
}

const RootApp = isDesignSystemRoute() ? <DesignSystemPage /> : <App />;

createRoot(rootElement).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {RootApp}
    </ChakraProvider>
  </StrictMode>,
)
