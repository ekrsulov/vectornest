import React from 'react';

interface AdvancedTransformationOverlayProps {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  elementId: string;
  subpathIndex?: number;
  viewport: { zoom: number };
  onPointerDown: (e: React.PointerEvent, targetId: string, handlerType: string) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  selectionColor: string;
}

/**
 * Advanced transformation overlay for distort, skew, and perspective transformations
 * - Corner handles: distort (free-form corner movement)
 * - Edge handles: skew (parallel edge movement)
 * - With Cmd/Alt: perspective transformation
 */
export const AdvancedTransformationOverlay: React.FC<AdvancedTransformationOverlayProps> = ({
  bounds,
  elementId,
  subpathIndex,
  viewport,
  onPointerDown,
  onPointerUp,
  selectionColor
}) => {
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

  const handleSize = 8 / viewport.zoom;
  const handleStroke = 2 / viewport.zoom;
  const overlaySize = 20 / viewport.zoom;

  return (
    <>
      {/* Bounding box outline */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.maxX - bounds.minX}
        height={bounds.maxY - bounds.minY}
        fill="none"
        stroke={selectionColor}
        strokeWidth={1 / viewport.zoom}
        strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
        pointerEvents="none"
      />

      {/* Corner handles for distort */}
      {/* Top-left corner */}
      <circle
        cx={bounds.minX}
        cy={bounds.minY}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={bounds.minX - overlaySize / 2}
        y={bounds.minY - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'move', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-corner-tl')}
        onPointerUp={onPointerUp}
      />

      {/* Top-right corner */}
      <circle
        cx={bounds.maxX}
        cy={bounds.minY}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={bounds.maxX - overlaySize / 2}
        y={bounds.minY - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'move', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-corner-tr')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-left corner */}
      <circle
        cx={bounds.minX}
        cy={bounds.maxY}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={bounds.minX - overlaySize / 2}
        y={bounds.maxY - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'move', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-corner-bl')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom-right corner */}
      <circle
        cx={bounds.maxX}
        cy={bounds.maxY}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={bounds.maxX - overlaySize / 2}
        y={bounds.maxY - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'move', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-corner-br')}
        onPointerUp={onPointerUp}
      />

      {/* Edge handles for skew */}
      {/* Top edge */}
      <circle
        cx={(bounds.minX + bounds.maxX) / 2}
        cy={bounds.minY}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={(bounds.minX + bounds.maxX) / 2 - overlaySize / 2}
        y={bounds.minY - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'ns-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-edge-top')}
        onPointerUp={onPointerUp}
      />

      {/* Bottom edge */}
      <circle
        cx={(bounds.minX + bounds.maxX) / 2}
        cy={bounds.maxY}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={(bounds.minX + bounds.maxX) / 2 - overlaySize / 2}
        y={bounds.maxY - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'ns-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-edge-bottom')}
        onPointerUp={onPointerUp}
      />

      {/* Left edge */}
      <circle
        cx={bounds.minX}
        cy={(bounds.minY + bounds.maxY) / 2}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={bounds.minX - overlaySize / 2}
        y={(bounds.minY + bounds.maxY) / 2 - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-edge-left')}
        onPointerUp={onPointerUp}
      />

      {/* Right edge */}
      <circle
        cx={bounds.maxX}
        cy={(bounds.minY + bounds.maxY) / 2}
        r={handleSize / 2}
        fill="white"
        stroke={selectionColor}
        strokeWidth={handleStroke}
        pointerEvents="none"
      />
      <rect
        x={bounds.maxX - overlaySize / 2}
        y={(bounds.minY + bounds.maxY) / 2 - overlaySize / 2}
        width={overlaySize}
        height={overlaySize}
        fill="transparent"
        style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
        onPointerDown={(e) => handlePointerDown(e, 'advanced-edge-right')}
        onPointerUp={onPointerUp}
      />
    </>
  );
};
