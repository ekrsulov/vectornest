import { Canvas } from './canvas/Canvas';
import './App.css';
import type { CSSProperties } from 'react';
import { Suspense, lazy, useCallback, useEffect } from 'react';

import { useSvgImport } from './hooks/useSvgImport';
import { useColorModeSync } from './hooks/useColorModeSync';
import { useIOSSupport } from './hooks/useIOSSupport';
import { useCanvasStore } from './store/canvasStore';
import { DEFAULT_MODE } from './constants';

const AppChrome = lazy(() => import('./ui/AppChrome').then((module) => ({ default: module.AppChrome })));

function App() {
  const { importSvgFiles } = useSvgImport();
  const isWithoutDistractionMode = useCanvasStore((state) => Boolean(state.settings.withoutDistractionMode));
  const importAppendToExisting = useCanvasStore((state) => state.settings.importAppendToExisting ?? true);
  const activePlugin = useCanvasStore((state) => state.activePlugin);
  const setMode = useCanvasStore((state) => state.setMode);
  const setShowFilePanel = useCanvasStore((state) => state.setShowFilePanel);
  const setShowSettingsPanel = useCanvasStore((state) => state.setShowSettingsPanel);
  const setShowLibraryPanel = useCanvasStore((state) => state.setShowLibraryPanel);

  // iOS support hook (handles detection and back swipe prevention)
  const { isIOS } = useIOSSupport();

  // Color mode sync hook (handles theme changes and element color updates)
  useColorModeSync();

  useEffect(() => {
    if (!isWithoutDistractionMode) {
      return;
    }

    if (activePlugin !== 'file' && activePlugin !== 'settings' && activePlugin !== 'library') {
      return;
    }

    setShowFilePanel(false);
    setShowSettingsPanel(false);
    setShowLibraryPanel(false);
    setMode(DEFAULT_MODE);
  }, [
    isWithoutDistractionMode,
    activePlugin,
    setShowFilePanel,
    setShowSettingsPanel,
    setShowLibraryPanel,
    setMode,
  ]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const setDocumentName = useCanvasStore((state) => state.setDocumentName);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Use the first SVG file's name (without extension) as document name
      const svgFile = Array.from(files).find((f) => /\.svg$/i.test(f.name));
      if (svgFile) {
        setDocumentName(svgFile.name.replace(/\.svg$/i, ''));
      }
      await importSvgFiles(files, { appendMode: importAppendToExisting });
    }
  }, [importAppendToExisting, importSvgFiles, setDocumentName]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'none',
      } as CSSProperties}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'pan-x pan-y',
        }}
      >
        <Canvas />
      </div>
      <Suspense fallback={null}>
        <AppChrome
          isIOS={isIOS}
          isWithoutDistractionMode={isWithoutDistractionMode}
        />
      </Suspense>
    </div>
  );
}

export default App;
