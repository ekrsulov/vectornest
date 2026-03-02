import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { knifePlugin } from '../knife';
import { pathWeldPlugin } from '../pathWeld';
import { shapeCutterPlugin } from '../shapeCutter';
import { roughenToolPlugin } from '../roughenTool';
import { cornerRounderPlugin } from '../cornerRounder';
import { smartEraserPlugin } from '../smartEraser';
import { blobBrushPlugin } from '../blobBrush';
import { sprayCanPlugin } from '../sprayCan';
import { shapeBuilderPlugin } from '../shapeBuilder';
import { zigzagToolPlugin } from '../zigzagTool';
import { stampBrushPlugin } from '../stampBrush';
import { stippleBrushPlugin } from '../stippleBrush';
import { coilToolPlugin } from '../coilTool';
import { starBurstPlugin } from '../starBurst';
import { erodeDilatePlugin } from '../erodeDilate';
import { scallopToolPlugin } from '../scallopTool';
import { fractureToolPlugin } from '../fractureTool';
import { bridgeToolPlugin } from '../bridgeTool';
import { smoothPaintPlugin } from '../smoothPaint';

export const ADVANCED_TOOL_PLUGINS: PluginDefinition<CanvasStore>[] = [
  knifePlugin,
  pathWeldPlugin,
  shapeCutterPlugin,
  roughenToolPlugin,
  cornerRounderPlugin,
  smartEraserPlugin,
  blobBrushPlugin,
  sprayCanPlugin,
  shapeBuilderPlugin,
  zigzagToolPlugin,
  stampBrushPlugin,
  stippleBrushPlugin,
  coilToolPlugin,
  starBurstPlugin,
  erodeDilatePlugin,
  scallopToolPlugin,
  fractureToolPlugin,
  bridgeToolPlugin,
  smoothPaintPlugin,
];
