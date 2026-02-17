/**
 * Text Plugin Actions
 * 
 * Contains the business logic for text operations that were previously
 * coupled to the canvas store.
 */

import type { StoreApi } from 'zustand';
import type { CanvasStore } from '../../store/canvasStore';
import type { TextPluginSlice } from './slice';
import type { StyleSlice } from '../../store/slices/features/styleSlice';

type TextStore = CanvasStore & TextPluginSlice & StyleSlice;
import { textToPathCommands } from '../../utils/textVectorizationUtils';
import { extractSubpaths } from '../../utils/pathParserUtils';
import { logger } from '../../utils';

/**
 * Add text converted to path
 */
export async function addText(
  x: number,
  y: number,
  text: string,
  getState: StoreApi<CanvasStore>['getState']
): Promise<void> {
  const state = getState() as TextStore;
  if (!state.text || !state.style) return;

  const textState = state.text;
  const styleState = state.style;

  const { fontSize, fontFamily, fontWeight, fontStyle } = textState;
  // Read style properties from centralized StyleSlice
  const { fillColor, fillOpacity, strokeColor, strokeWidth, strokeOpacity } = styleState;

  try {
    // Convert text to path commands directly without string parsing
    const commands = await textToPathCommands(
      text,
      x,
      y,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle
    );

    if (commands.length > 0) {
      // Extract subpaths directly from commands
      const subPaths = extractSubpaths(commands);

      // Create path element with the converted text
      state.addElement({
        type: 'path',
        data: {
          subPaths: subPaths.map(sp => sp.commands),
          strokeWidth,
          strokeColor,
          strokeOpacity,
          fillColor,
          fillOpacity,
          strokeLinecap: styleState.strokeLinecap || 'round',
          strokeLinejoin: styleState.strokeLinejoin || 'round',
          fillRule: styleState.fillRule || 'nonzero',
          strokeDasharray: styleState.strokeDasharray || 'none',
        },
      });
    } else {
      logger.error('Failed to convert text to path');
    }
  } catch (error) {
    logger.error('Error converting text to path', error);
  }

  // Auto-switch to select mode after adding text
  state.setActivePlugin('select');
}
