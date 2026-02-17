import React, { useMemo } from 'react';
import { Grid } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import type { PathData } from '../../types';
import { pluginManager } from '../../utils/pluginManager';

const PathOperationsPanelComponent: React.FC = () => {
  // Subscribe only to the keys we need to detect changes in selection
  const selectedIdsKey = useCanvasStore(state => state.selectedIds.join(','));
  const selectedSubpathsKey = useCanvasStore(state => 
    (state.selectedSubpaths ?? []).map((sp: { elementId: string; subpathIndex: number }) => `${sp.elementId}-${sp.subpathIndex}`).join(',')
  );
  const selectedPathsSignature = useCanvasStore(state => {
    const selectedIds = state.selectedIds || [];
    const elements = state.elements || [];
    return selectedIds
      .map(id => {
        const el = elements.find(e => e.id === id && e.type === 'path');
        const subPathCount = el ? (el.data as PathData)?.subPaths?.length ?? 0 : 0;
        return `${id}:${subPathCount}`;
      })
      .join('|');
  });
  
  // Memoize the calculation based on selection keys - only recalculates when selection actually changes
  const selectionInfo = useMemo(() => {
    const state = useCanvasStore.getState();
    const { selectedIds, selectedSubpaths, elements } = state;
    
    const selectedPathsCount = selectedIds.filter(id => {
      const el = elements.find(e => e.id === id);
      return el && el.type === 'path';
    }).length;
    
    const hasPathWithMultipleSubpaths = selectedIds.some(id => {
      const pathEl = elements.find(el => el.id === id && el.type === 'path');
      return pathEl && (pathEl.data as PathData).subPaths?.length > 1;
    });
    
    const totalSelectedItems = selectedPathsCount + (selectedSubpaths?.length ?? 0);
    
    return {
      totalSelectedItems,
      hasPathWithMultipleSubpaths,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdsKey, selectedSubpathsKey, selectedPathsSignature]);

  // Destructure path operation actions once
  const {
    performPathUnion,
    performPathUnionPaperJS,
    performPathSubtraction,
    performPathIntersect,
    performPathExclude,
    performPathDivide,
  } = useCanvasStore.getState();

  const canShowPanel = selectionInfo.hasPathWithMultipleSubpaths || selectionInfo.totalSelectedItems >= 2;

  if (!canShowPanel) {
    return null;
  }

  const performPathSimplify = () => {
    // Use plugin API instead of store action
    pluginManager.callPluginApi('subpath', 'performPathSimplify');
  };

  const performPathJoin = () => {
    pluginManager.callPluginApi('subpath', 'performSubPathJoin');
  };

  const { totalSelectedItems, hasPathWithMultipleSubpaths } = selectionInfo;

  return (
    <Panel
      title="Path Operations"
      isCollapsible
      defaultOpen={false}
    >
      <Grid templateColumns="repeat(auto-fit, minmax(100px, 1fr))" gap={1}>
          {hasPathWithMultipleSubpaths && (
            <PanelStyledButton
              aria-label="Split subpaths"
              onClick={performPathSimplify}
            >
              Subpath Split
            </PanelStyledButton>
          )}

          {hasPathWithMultipleSubpaths && (
            <PanelStyledButton
              aria-label="Join subpaths"
              onClick={performPathJoin}
            >
              Subpath Join
            </PanelStyledButton>
          )}

          {totalSelectedItems >= 2 && (
            <>
              <PanelStyledButton
                aria-label="Union (Simple)"
                onClick={performPathUnion}
              >
                Union
              </PanelStyledButton>
              
              <PanelStyledButton
                aria-label="Union (Paper.js)"
                onClick={performPathUnionPaperJS}
              >
                Union PaperJs
              </PanelStyledButton>
              
              {totalSelectedItems === 2 && (
                <>
                  <PanelStyledButton
                    aria-label="Subtract"
                    onClick={performPathSubtraction}
                  >
                    Subtract
                  </PanelStyledButton>
                  
                  <PanelStyledButton
                    aria-label="Intersect"
                    onClick={performPathIntersect}
                  >
                    Intersect
                  </PanelStyledButton>
                  
                  <PanelStyledButton
                    aria-label="Exclude"
                    onClick={performPathExclude}
                  >
                    Exclude
                  </PanelStyledButton>
                  
                  <PanelStyledButton
                    aria-label="Divide"
                    onClick={performPathDivide}
                  >
                    Divide
                  </PanelStyledButton>
                </>
              )}
            </>
          )}
        </Grid>
    </Panel>
  );
};

// Export memoized version - only re-renders when props change (no props = never re-renders from parent)
// Component only re-renders internally when activePlugin changes or selection changes
export const PathOperationsPanel = React.memo(PathOperationsPanelComponent);
