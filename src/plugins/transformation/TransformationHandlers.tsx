import React from 'react';

interface TransformationHandlersProps {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  elementId: string;
  subpathIndex?: number; // Optional for individual subpath handlers
  handlerSize: number;
  selectionColor: string;
  viewport: { zoom: number };
  onPointerDown: (e: React.PointerEvent, targetId: string, handlerType: string) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

/**
 * Unified transformation handlers component that consolidates the logic for both
 * element-level and subpath-level transformation handlers.
 * This replaces the duplicated renderTransformationHandlers and renderIndividualSubpathHandlers functions.
 */
export const TransformationHandlers: React.FC<TransformationHandlersProps> = ({
  bounds,
  elementId,
  subpathIndex,
  handlerSize,
  selectionColor,
  viewport,
  onPointerDown,
  onPointerUp
}) => {
  // Generate target ID based on whether this is for a subpath or element
  const generateTargetId = () => {
    if (subpathIndex !== undefined) {
      return `subpath:${elementId}:${subpathIndex}`;
    }
    return elementId;
  };

  const handlePointerDown = (e: React.PointerEvent, handlerType: string) => {
    const targetId = generateTargetId();
    onPointerDown(e, targetId, handlerType);
  };

  const triangleOpacity = "0.5";
  const lineOpacity = "1";
  const triangleSize = handlerSize;
  const lineSeparation = 5 / viewport.zoom;
  const overlaySize = 20 / viewport.zoom;
  const cornerOverlaySize = 24 / viewport.zoom; // Larger overlay for corners
  const rotationOverlaySize = 20 / viewport.zoom; // Larger overlay for rotation
  const rotationOffset = 18 / viewport.zoom; // Distance from corner to rotation handler
  const lineThickness = 1;
  const circleSize = handlerSize * 0.75;

  return (
    <>
      {/* Corner handlers - Always visible */}
      {/* Top-left corner */}
      <polygon
        points={`${bounds.minX},${bounds.minY} ${bounds.minX + triangleSize},${bounds.minY} ${bounds.minX},${bounds.minY + triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Top-left corner L lines */}
      <line
        x1={bounds.minX}
        y1={bounds.minY}
        x2={bounds.minX + triangleSize}
        y2={bounds.minY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <line
        x1={bounds.minX}
        y1={bounds.minY}
        x2={bounds.minX}
        y2={bounds.minY + triangleSize}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Top-left corner overlay */}
      <rect
        x={bounds.minX - (cornerOverlaySize - triangleSize) / 2}
        y={bounds.minY - (cornerOverlaySize - triangleSize) / 2}
        width={cornerOverlaySize}
        height={cornerOverlaySize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'nw-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'corner-tl')}
        onPointerUp={onPointerUp}
      />

      {/* Top-right corner */}
      <polygon
        points={`${bounds.maxX},${bounds.minY} ${bounds.maxX - triangleSize},${bounds.minY} ${bounds.maxX},${bounds.minY + triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Top-right corner L lines */}
      <line
        x1={bounds.maxX - triangleSize}
        y1={bounds.minY}
        x2={bounds.maxX}
        y2={bounds.minY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <line
        x1={bounds.maxX}
        y1={bounds.minY}
        x2={bounds.maxX}
        y2={bounds.minY + triangleSize}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Top-right corner overlay */}
      <rect
        x={bounds.maxX - cornerOverlaySize + (cornerOverlaySize - triangleSize) / 2}
        y={bounds.minY - (cornerOverlaySize - triangleSize) / 2}
        width={cornerOverlaySize}
        height={cornerOverlaySize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'ne-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'corner-tr')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-left corner */}
      <polygon
        points={`${bounds.minX},${bounds.maxY} ${bounds.minX + triangleSize},${bounds.maxY} ${bounds.minX},${bounds.maxY - triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Bottom-left corner L lines */}
      <line
        x1={bounds.minX}
        y1={bounds.maxY}
        x2={bounds.minX + triangleSize}
        y2={bounds.maxY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <line
        x1={bounds.minX}
        y1={bounds.maxY - triangleSize}
        x2={bounds.minX}
        y2={bounds.maxY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Bottom-left corner overlay */}
      <rect
        x={bounds.minX - (cornerOverlaySize - triangleSize) / 2}
        y={bounds.maxY - cornerOverlaySize + (cornerOverlaySize - triangleSize) / 2}
        width={cornerOverlaySize}
        height={cornerOverlaySize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'sw-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'corner-bl')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-right corner */}
      <polygon
        points={`${bounds.maxX},${bounds.maxY} ${bounds.maxX - triangleSize},${bounds.maxY} ${bounds.maxX},${bounds.maxY - triangleSize}`}
        fill={selectionColor}
        opacity={triangleOpacity}
        pointerEvents="none"
      />
      {/* Bottom-right corner L lines */}
      <line
        x1={bounds.maxX - triangleSize}
        y1={bounds.maxY}
        x2={bounds.maxX}
        y2={bounds.maxY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      <line
        x1={bounds.maxX}
        y1={bounds.maxY - triangleSize}
        x2={bounds.maxX}
        y2={bounds.maxY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Bottom-right corner overlay */}
      <rect
        x={bounds.maxX - cornerOverlaySize + (cornerOverlaySize - triangleSize) / 2}
        y={bounds.maxY - cornerOverlaySize + (cornerOverlaySize - triangleSize) / 2}
        width={cornerOverlaySize}
        height={cornerOverlaySize}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'se-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'corner-br')}
        onPointerUp={onPointerUp}
      />

      {/* Rotation handlers */}
      <circle
        cx={bounds.maxX + rotationOffset}
        cy={bounds.minY - rotationOffset}
        r={circleSize / 2}
        fill={selectionColor}
        fillOpacity={triangleOpacity}
        strokeOpacity={lineOpacity}
        stroke={selectionColor}
        style={{ cursor: 'alias' }}
        strokeWidth={lineThickness}
        pointerEvents="none"
      />
      {/* Rotation handler overlay */}
      <circle
        cx={bounds.maxX + rotationOffset}
        cy={bounds.minY - rotationOffset}
        r={rotationOverlaySize / 2}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'alias', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'rotate-tr')}
        onPointerUp={onPointerUp}
      />

      {/* Midpoint handlers (Side handlers) - Complete lines */}
      {/* Top line */}
      <line
        x1={bounds.minX + handlerSize + lineSeparation}
        y1={bounds.minY}
        x2={bounds.minX + handlerSize + lineSeparation + Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        y2={bounds.minY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Top overlay */}
      <rect
        x={bounds.minX + handlerSize + lineSeparation}
        y={bounds.minY - 8 / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        height={overlaySize / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'n-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'midpoint-t')}
        onPointerUp={onPointerUp}
      />

      {/* Right line */}
      <line
        x1={bounds.maxX}
        y1={bounds.minY + handlerSize + lineSeparation}
        x2={bounds.maxX}
        y2={bounds.minY + handlerSize + lineSeparation + Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Right overlay */}
      <rect
        x={bounds.maxX - lineThickness / viewport.zoom - 8 / viewport.zoom}
        y={bounds.minY + handlerSize + lineSeparation}
        width={overlaySize / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'e-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'midpoint-r')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom line */}
      <line
        x1={bounds.minX + handlerSize + lineSeparation}
        y1={bounds.maxY}
        x2={bounds.minX + handlerSize + lineSeparation + Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        y2={bounds.maxY}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Bottom overlay */}
      <rect
        x={bounds.minX + handlerSize + lineSeparation}
        y={bounds.maxY - lineThickness / viewport.zoom - 8 / viewport.zoom}
        width={Math.max(0, bounds.maxX - bounds.minX - 2 * handlerSize - 2 * lineSeparation)}
        height={overlaySize / viewport.zoom}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 's-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'midpoint-b')}
        onPointerUp={onPointerUp}
      />

      {/* Left line */}
      <line
        x1={bounds.minX}
        y1={bounds.minY + handlerSize + lineSeparation}
        x2={bounds.minX}
        y2={bounds.minY + handlerSize + lineSeparation + Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        stroke={selectionColor}
        strokeWidth={lineThickness / viewport.zoom}
        opacity={lineOpacity}
        pointerEvents="none"
      />
      {/* Left overlay */}
      <rect
        x={bounds.minX - 8 / viewport.zoom}
        y={bounds.minY + handlerSize + lineSeparation}
        width={overlaySize / viewport.zoom}
        height={Math.max(0, bounds.maxY - bounds.minY - 2 * handlerSize - 2 * lineSeparation)}
        fill="transparent"
        opacity="0.1"
        style={{ cursor: 'w-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'midpoint-l')}
        onPointerUp={onPointerUp}
      />
    </>
  );
};