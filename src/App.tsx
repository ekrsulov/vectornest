import { Canvas } from './canvas/Canvas';
import { LeftSidebar } from './sidebar/LeftSidebar';
import { Sidebar } from './sidebar/Sidebar';
import { BottomActionBar } from './ui/BottomActionBar';
import { ExpandableToolPanel } from './ui/ExpandableToolPanel';
import { VirtualShiftButton } from './ui/VirtualShiftButton';
import { GlobalOverlays } from './ui/GlobalOverlays';
import { PluginProviders } from './ui/PluginProviders';
import { UndoRedoControls } from './ui/UndoRedoControls';
import './App.css';
import type { CSSProperties } from 'react';
import { useCallback, useEffect } from 'react';

import { useSvgImport } from './hooks/useSvgImport';
import { useColorModeSync } from './hooks/useColorModeSync';
import { useIOSSupport } from './hooks/useIOSSupport';
import { useCanvasStore } from './store/canvasStore';
import { DEFAULT_MODE } from './constants';

function App() {
  const { importSvgFiles } = useSvgImport();
  const isWithoutDistractionMode = useCanvasStore((state) => Boolean(state.settings.withoutDistractionMode));
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await importSvgFiles(files, { appendMode: true });
    }
  }, [importSvgFiles]);

  return (
    <PluginProviders>
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
        {!isWithoutDistractionMode && <LeftSidebar />}
        {!isWithoutDistractionMode && <Sidebar />}
        {!isWithoutDistractionMode && <BottomActionBar />}
        {!isWithoutDistractionMode && <UndoRedoControls />}
        <ExpandableToolPanel />
        {!isWithoutDistractionMode && <VirtualShiftButton />}
        <GlobalOverlays isIOS={isIOS} />
      </div>
    </PluginProviders>
  );
}

export default App;
