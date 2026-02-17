/**
 * Potrace Plugin Actions
 * 
 * Contains the business logic for converting selections to paths using potrace
 *
 * (ES) Acciones del plugin Potrace
 * Contiene la lógica de negocio para convertir selecciones en paths usando potrace
 */

import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { PotracePluginSlice } from './slice';
import type { StyleSlice } from '../../store/slices/features/styleSlice';

type PotraceStore = CanvasStore & PotracePluginSlice & StyleSlice;
import { convertSelectionToPotrace } from './utils';
import { parsePathD } from '../../utils/path/parsing';
import { extractSubpaths } from '../../utils/pathParserUtils';
import { logger } from '../../utils/logger';
import { defsContributionRegistry } from '../../utils/defsContributionRegistry';

/**
 * Apply potrace to selected elements
 */
export async function applyPotraceToSelection(
  getState: StoreApi<CanvasStore>['getState']
): Promise<void> {
  const state = getState() as PotraceStore;
  
  if (!state.potrace || !state.style) {
    logger.error('Potrace or style state not available');
    return;
  }

  if (state.selectedIds.length === 0) {
    logger.warn('No elements selected for potrace conversion');
    return;
  }

  const potraceState = state.potrace;
  const styleState = state.style;

  // Get defs content for the selected elements
  const selectedElements = state.elements.filter(el => state.selectedIds.includes(el.id));
  const defs = defsContributionRegistry.serializeDefs(state, selectedElements);

  try {
    // Convert selection using potrace
    const pathData = await convertSelectionToPotrace(
      state.elements,
      state.selectedIds,
      {
        threshold: potraceState.threshold,
        turnPolicy: potraceState.turnPolicy,
        turdSize: potraceState.turdSize,
        optCurve: potraceState.optCurve,
        optTolerance: potraceState.optTolerance,
        alphaMax: potraceState.alphaMax,
        minPathSegments: potraceState.minPathSegments,
        renderScale: potraceState.renderScale,
        colorMode: potraceState.colorMode,
        brightness: potraceState.brightness,
        contrast: potraceState.contrast,
        grayscale: potraceState.grayscale,
        invert: potraceState.invert,
      },
      defs
    );

    if (!pathData) {
      logger.error('Failed to convert selection with potrace');
      return;
    }

    logger.info('Path data from potrace', { 
      pathDataLength: pathData.length,
      pathDataPreview: pathData.substring(0, 200) 
    });

    // Parse the path data to commands
    const commands = parsePathD(pathData);
    
    logger.info('Parsed commands', { commandCount: commands.length });

    const subPaths = extractSubpaths(commands);
    
    logger.info('Extracted subpaths', { subPathCount: subPaths.length });

    if (subPaths.length === 0) {
      logger.error('No subpaths extracted from path data');
      return;
    }

    // Create new path element with the traced result
    state.addElement({
      type: 'path',
      data: {
        subPaths: subPaths.map(sp => sp.commands),
        strokeWidth: styleState.strokeWidth,
        strokeColor: styleState.strokeColor,
        strokeOpacity: styleState.strokeOpacity,
        fillColor: styleState.fillColor,
        fillOpacity: styleState.fillOpacity,
        strokeLinecap: styleState.strokeLinecap || 'round',
        strokeLinejoin: styleState.strokeLinejoin || 'round',
        fillRule: styleState.fillRule || 'nonzero',
        strokeDasharray: styleState.strokeDasharray || 'none',
      },
    });

    logger.info('Successfully created potrace path element');

    // Optionally, delete the original selected elements
    // state.deleteElements(state.selectedIds);

    logger.info('Potrace conversion successful');
  } catch (error) {
    logger.error('Error applying potrace to selection', error);
  }
}
