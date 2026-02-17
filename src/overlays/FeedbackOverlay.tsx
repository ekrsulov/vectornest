import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { FEEDBACK_OVERLAY } from '../constants';

interface FeedbackOverlayProps {
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  rotationFeedback?: {
    degrees: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf15: boolean;
  };
  resizeFeedback?: {
    deltaX: number;
    deltaY: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf10: boolean;
  };
  shapeFeedback?: {
    width: number;
    height: number;
    visible: boolean;
    isShiftPressed: boolean;
    isMultipleOf10: boolean;
  };
  pointPositionFeedback?: {
    x: number;
    y: number;
    visible: boolean;
  };
  customFeedback?: {
    message: string;
    visible: boolean;
  };
  offsetY?: number; // Additional vertical offset in pixels
}

interface FeedbackBlockProps {
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  width: number;
  isHighlighted?: boolean;
  content: string;
  offsetY?: number;
}

const areFeedbackBlockPropsEqual = (
  previous: FeedbackBlockProps,
  next: FeedbackBlockProps
): boolean => (
  previous.width === next.width &&
  previous.isHighlighted === next.isHighlighted &&
  previous.content === next.content &&
  previous.offsetY === next.offsetY &&
  previous.viewport.zoom === next.viewport.zoom &&
  previous.viewport.panX === next.viewport.panX &&
  previous.viewport.panY === next.viewport.panY &&
  previous.canvasSize.width === next.canvasSize.width &&
  previous.canvasSize.height === next.canvasSize.height
);

const FeedbackBlockComponent: React.FC<FeedbackBlockProps> = ({
  viewport,
  canvasSize,
  width,
  isHighlighted = false,
  content,
  offsetY = 0,
}) => {
  const yPosition = -viewport.panY / viewport.zoom + canvasSize.height / viewport.zoom - FEEDBACK_OVERLAY.Y_OFFSET / viewport.zoom + offsetY / viewport.zoom;
  const transform = `translate(${-viewport.panX / viewport.zoom + 5 / viewport.zoom} ${yPosition}) scale(${1 / viewport.zoom})`;
  const baseFill = useColorModeValue('#1f2937', '#f1f5f9');
  const baseStroke = useColorModeValue('#374151', '#94a3b8');
  const highlightFill = useColorModeValue('#6b7280', '#4b5563');
  const highlightStroke = useColorModeValue('#9ca3af', '#6b7280');
  const textColor = useColorModeValue('#ffffff', isHighlighted ? '#ffffff' : '#0f172a');

  return (
    <g transform={transform}>
      <rect
        x="0"
        y="0"
        width={width}
        height={FEEDBACK_OVERLAY.BLOCK_HEIGHT}
        fill={isHighlighted ? highlightFill : baseFill}
        fillOpacity="0.9"
        rx={FEEDBACK_OVERLAY.BORDER_RADIUS}
        ry={FEEDBACK_OVERLAY.BORDER_RADIUS}
        stroke={isHighlighted ? highlightStroke : baseStroke}
        strokeWidth="1"
      />
      <text
        x={width / 2}
        y="16"
        textAnchor="middle"
        fontSize={FEEDBACK_OVERLAY.FONT_SIZE}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={textColor}
        fontWeight="500"
      >
        {content}
      </text>
    </g>
  );
};

const FeedbackBlock = React.memo(FeedbackBlockComponent, areFeedbackBlockPropsEqual);

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = React.memo(function FeedbackOverlay({
  viewport,
  canvasSize,
  rotationFeedback,
  resizeFeedback,
  shapeFeedback,
  pointPositionFeedback,
  customFeedback,
  offsetY = 0,
}: FeedbackOverlayProps) {
  // Calculate if we have a primary feedback visible (position, rotation, resize, shape)
  const hasPrimaryFeedback = pointPositionFeedback?.visible || 
                              rotationFeedback?.visible || 
                              resizeFeedback?.visible || 
                              shapeFeedback?.visible;
  
  // Custom feedback offset: if there's a primary feedback, show custom above it
  const customFeedbackOffset = hasPrimaryFeedback ? offsetY - FEEDBACK_OVERLAY.STACK_OFFSET : offsetY;

  return (
    <>
      {/* Rotation Feedback */}
      {rotationFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={rotationFeedback.isShiftPressed ? FEEDBACK_OVERLAY.ROTATION_WIDTH_SHIFT : FEEDBACK_OVERLAY.ROTATION_WIDTH_DEFAULT}
          isHighlighted={rotationFeedback.isMultipleOf15}
          content={`${rotationFeedback.degrees}°${rotationFeedback.isShiftPressed ? " ⇧" : ""}`}
          offsetY={offsetY}
        />
      )}

      {/* Resize Feedback */}
      {resizeFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={resizeFeedback.isShiftPressed ? FEEDBACK_OVERLAY.RESIZE_WIDTH_SHIFT : FEEDBACK_OVERLAY.RESIZE_WIDTH_DEFAULT}
          isHighlighted={resizeFeedback.isMultipleOf10}
          content={`x${resizeFeedback.deltaX >= 0 ? '+' : ''}${resizeFeedback.deltaX}, y${resizeFeedback.deltaY >= 0 ? '+' : ''}${resizeFeedback.deltaY}${resizeFeedback.isShiftPressed ? " ⇧" : ""}`}
          offsetY={offsetY}
        />
      )}

      {/* Shape Creation Feedback */}
      {shapeFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={shapeFeedback.isShiftPressed ? FEEDBACK_OVERLAY.SHAPE_WIDTH_SHIFT : FEEDBACK_OVERLAY.SHAPE_WIDTH_DEFAULT}
          isHighlighted={shapeFeedback.isMultipleOf10}
          content={`${shapeFeedback.width} × ${shapeFeedback.height}${shapeFeedback.isShiftPressed ? " ⇧" : ""}`}
          offsetY={offsetY}
        />
      )}

      {/* Point Position Feedback */}
      {pointPositionFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={FEEDBACK_OVERLAY.POINT_WIDTH}
          content={`${pointPositionFeedback?.x}, ${pointPositionFeedback?.y}`}
          offsetY={offsetY}
        />
      )}

      {/* Custom Feedback (snap type, etc.) - shown above primary feedback when both are visible */}
      {customFeedback?.visible && (
        <FeedbackBlock
          viewport={viewport}
          canvasSize={canvasSize}
          width={Math.max(FEEDBACK_OVERLAY.CUSTOM_MIN_WIDTH, customFeedback.message.length * FEEDBACK_OVERLAY.CUSTOM_CHAR_WIDTH)}
          content={customFeedback.message}
          offsetY={customFeedbackOffset}
        />
      )}
    </>
  );
});
