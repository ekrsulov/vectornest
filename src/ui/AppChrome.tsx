import React from 'react';
import { LeftSidebar } from '../sidebar/LeftSidebar';
import { Sidebar } from '../sidebar/Sidebar';
import { BottomActionBar } from './BottomActionBar';
import { ExpandableToolPanel } from './ExpandableToolPanel';
import { VirtualShiftButton } from './VirtualShiftButton';
import { GlobalOverlays } from './GlobalOverlays';
import { UndoRedoControls } from './UndoRedoControls';

interface AppChromeProps {
  isIOS: boolean;
  isWithoutDistractionMode: boolean;
}

export const AppChrome: React.FC<AppChromeProps> = ({ isIOS, isWithoutDistractionMode }) => {
  return (
    <>
      {!isWithoutDistractionMode && <LeftSidebar />}
      {!isWithoutDistractionMode && <Sidebar />}
      {!isWithoutDistractionMode && <BottomActionBar />}
      <UndoRedoControls />
      <ExpandableToolPanel />
      <VirtualShiftButton />
      <GlobalOverlays isIOS={isIOS} />
    </>
  );
};
