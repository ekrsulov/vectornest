import React, { useMemo } from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import type { GuidelineMatch, DistanceGuidelineMatch, SizeMatch, HoverMeasurement, ManualGuide } from './types';
import { 
  calculateElementBoundsMap,
  calculatePerpendicularMidpoint,
  type Bounds
} from '../../utils/guidelinesHelpers';
import { guidelineDistanceScan } from '../../utils/guidelinesCore';
import { GuidelineLine, DistanceLabel, SizeMatchIndicator, ManualGuideLine } from './GuidelineComponents';

interface GuidelinesOverlayProps {
  guidelines: {
    enabled: boolean;
    distanceEnabled: boolean;
    sizeMatchingEnabled: boolean;
    manualGuidesEnabled: boolean;
    debugMode: boolean;
    guidelineColor: string;
    distanceColor: string;
    manualGuideColor: string;
    sizeMatchColor: string;
    currentMatches: GuidelineMatch[];
    currentDistanceMatches: DistanceGuidelineMatch[];
    currentSizeMatches: SizeMatch[];
    manualGuides: ManualGuide[];
    hoverMeasurements: HoverMeasurement[];
    isAltPressed: boolean;
    isDraggingGuide: boolean;
    draggingGuideType: 'horizontal' | 'vertical' | null;
    draggingGuidePosition: number | null;

  };
  isTransforming: boolean;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  elements: Array<{
    id: string;
    type: string;
    data: unknown;
  }>;
  selectedIds: string[];
  isElementHidden: (id: string) => boolean;
}

export const GuidelinesOverlay: React.FC<GuidelinesOverlayProps> = ({
  guidelines,
  viewport,
  elements,
  selectedIds,
  isElementHidden,
  isTransforming,
}) => {
  const labelBackgroundColor = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(26, 32, 44, 0.9)');
  const distanceTextColor = useColorModeValue('black', '#CCCCCC');
  
  // Debug mode calculations
  const { debugGuidelines, debugDistances } = useMemo(() => {
    if (!guidelines.enabled || !guidelines.debugMode) {
      return { debugGuidelines: [], debugDistances: [] };
    }

    const boundsMap = calculateElementBoundsMap(elements, selectedIds, viewport.zoom, { includeStroke: true, isElementHidden });
    
    const debugGuidelinesArray: GuidelineMatch[] = [];

    boundsMap.forEach((info) => {
      debugGuidelinesArray.push({ type: 'left', position: info.bounds.minX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'right', position: info.bounds.maxX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'top', position: info.bounds.minY, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'bottom', position: info.bounds.maxY, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'centerX', position: info.centerX, elementIds: [info.id] });
      debugGuidelinesArray.push({ type: 'centerY', position: info.centerY, elementIds: [info.id] });
    });

    const boundsArray = Array.from(boundsMap.values());
    const distanceResults = guidelineDistanceScan(boundsArray, { roundDistance: true });
    
    const debugDistancesArray = distanceResults.map((result) => ({
      axis: result.axis,
      distance: result.distance,
      referenceStart: result.referenceStart,
      referenceEnd: result.referenceEnd,
      referenceElementIds: result.referenceElementIds,
      currentStart: result.referenceStart,
      currentEnd: result.referenceEnd,
      currentElementId: result.referenceElementIds[0],
      bounds1: result.bounds1,
      bounds2: result.bounds2,
    }));

    return { debugGuidelines: debugGuidelinesArray, debugDistances: debugDistancesArray };
  }, [guidelines.enabled, guidelines.debugMode, elements, selectedIds, viewport.zoom, isElementHidden]);

  if (!guidelines.enabled) {
    return null;
  }

  const strokeWidth = 1 / viewport.zoom;
  const activeGuidelineStrokeWidth = 2 / viewport.zoom;
  const debugGuidelineColor = 'rgba(255, 0, 255, 0.15)';
  const centerGuidelineColor = '#0066FF'; // Blue for center alignments

  const canvasWidth = 10000;
  const canvasHeight = 10000;

  // Use centralized bounds calculation for distance labels
  const elementBoundsInfo = calculateElementBoundsMap(elements, [], viewport.zoom, { includeStroke: true, isElementHidden });
  const elementBoundsMap = new Map<string, Bounds>();
  elementBoundsInfo.forEach((info, id) => {
    elementBoundsMap.set(id, info.bounds);
  });

  return (
    <g>
      {/* Manual guides (always visible when enabled) */}
      {guidelines.manualGuidesEnabled && guidelines.manualGuides.map((guide) => (
        <ManualGuideLine
          key={guide.id}
          guide={guide}
          canvasSize={{ width: canvasWidth, height: canvasHeight }}
          strokeWidth={strokeWidth}
          zoom={viewport.zoom}
        />
      ))}

      {/* Debug Guidelines */}
      {debugGuidelines.map((match, index) => (
        <GuidelineLine
          key={`debug-${index}`}
          type={match.type}
          position={match.position}
          canvasSize={{ width: canvasWidth, height: canvasHeight }}
          strokeWidth={strokeWidth}
          color={debugGuidelineColor}
          dashArray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
          opacity={1}
        />
      ))}

      {/* Debug Distance Guidelines */}
      {guidelines.distanceEnabled && debugDistances.map((match, index) => {
        const bounds1 = match.bounds1;
        const bounds2 = match.bounds2;
        
        if (!bounds1 || !bounds2) return null;
        
        const perpendicularMid = calculatePerpendicularMidpoint(
          match.axis,
          bounds1,
          bounds2
        );
        
        return (
          <DistanceLabel
            key={`debug-distance-${index}`}
            axis={match.axis}
            start={match.referenceStart}
            end={match.referenceEnd}
            distance={match.distance}
            otherAxisPosition={perpendicularMid}
            strokeWidth={strokeWidth}
            color="rgba(0, 255, 255, 0.3)"
            zoom={viewport.zoom}
            opacity={0.15}
            withBackground={false}
          />
        );
      })}

      {/* Active Alignment Guidelines */}
      {guidelines.currentMatches.map((match, index) => {
        // Use different colors for centers vs edges
        const isCenter = match.type === 'centerX' || match.type === 'centerY';
        const color = match.isManualGuide 
          ? guidelines.manualGuideColor 
          : isCenter 
            ? centerGuidelineColor 
            : guidelines.guidelineColor;
        
        return (
          <GuidelineLine
            key={`alignment-${index}`}
            type={match.type}
            position={match.position}
            canvasSize={{ width: canvasWidth, height: canvasHeight }}
            strokeWidth={activeGuidelineStrokeWidth}
            color={color}
            opacity={1}
          />
        );
      })}

      {/* Distance Guidelines */}
      {guidelines.distanceEnabled && guidelines.currentDistanceMatches.length > 0 && (() => {
        const minDistance = Math.min(...guidelines.currentDistanceMatches.map(m => m.distance));
        const matchesWithMinDistance = guidelines.currentDistanceMatches.filter(
          m => Math.abs(m.distance - minDistance) < 0.1
        );
        
        return matchesWithMinDistance.map((match, index) => {
          const refBounds1 = elementBoundsMap.get(match.referenceElementIds[0]);
          const refBounds2 = elementBoundsMap.get(match.referenceElementIds[1]);
          const currentBounds = elementBoundsMap.get(match.currentElementId);
          
          if (!refBounds1 || !refBounds2 || !currentBounds) {
            return null;
          }

          const isTwoElementCase = 
            match.referenceStart === match.currentStart && 
            match.referenceEnd === match.currentEnd;
          
          const refPerpendicularMid = calculatePerpendicularMidpoint(
            match.axis,
            refBounds1,
            refBounds2
          );
          
          const otherElement = elements.find(el => {
            if (el.id === match.currentElementId || el.type !== 'path') return false;
            const bounds = elementBoundsMap.get(el.id);
            if (!bounds) return false;
            
            if (match.axis === 'horizontal') {
              return Math.abs(bounds.maxX - match.currentStart) < 0.1 ||
                     Math.abs(bounds.minX - match.currentEnd) < 0.1;
            } else {
              return Math.abs(bounds.maxY - match.currentStart) < 0.1 ||
                     Math.abs(bounds.minY - match.currentEnd) < 0.1;
            }
          });
          
          const otherBounds = otherElement ? elementBoundsMap.get(otherElement.id) : null;
          
          const currentPerpendicularMid = otherBounds 
            ? calculatePerpendicularMidpoint(match.axis, currentBounds, otherBounds)
            : refPerpendicularMid;
          
          if (isTwoElementCase) {
            return (
              <DistanceLabel
                key={`distance-single-${index}`}
                axis={match.axis}
                start={match.currentStart}
                end={match.currentEnd}
                distance={match.distance}
                otherAxisPosition={currentPerpendicularMid}
                strokeWidth={activeGuidelineStrokeWidth}
                color={guidelines.distanceColor}
                zoom={viewport.zoom}
                opacity={1}
                withBackground={true}
                backgroundColor={labelBackgroundColor}
                textColor={distanceTextColor}
              />
            );
          } else {
            return (
              <React.Fragment key={`distance-group-${index}`}>
                <DistanceLabel
                  axis={match.axis}
                  start={match.referenceStart}
                  end={match.referenceEnd}
                  distance={match.distance}
                  otherAxisPosition={refPerpendicularMid}
                  strokeWidth={activeGuidelineStrokeWidth}
                  color={guidelines.distanceColor}
                  zoom={viewport.zoom}
                  opacity={1}
                  withBackground={true}
                  backgroundColor={labelBackgroundColor}
                  textColor={distanceTextColor}
                />
                <DistanceLabel
                  axis={match.axis}
                  start={match.currentStart}
                  end={match.currentEnd}
                  distance={match.distance}
                  otherAxisPosition={currentPerpendicularMid}
                  strokeWidth={activeGuidelineStrokeWidth}
                  color={guidelines.distanceColor}
                  zoom={viewport.zoom}
                  opacity={1}
                  withBackground={true}
                  backgroundColor={labelBackgroundColor}
                  textColor={distanceTextColor}
                />
              </React.Fragment>
            );
          }
        });
      })()}

      {/* Size Matches (render only during transformations) */}
      {isTransforming && guidelines.sizeMatchingEnabled && guidelines.currentSizeMatches.map((match, index) => (
        <SizeMatchIndicator
          key={`size-${index}`}
          match={match}
          elementBoundsMap={elementBoundsMap}
          strokeWidth={strokeWidth}
          color={guidelines.sizeMatchColor}
          zoom={viewport.zoom}
          backgroundColor={labelBackgroundColor}
          textColor={distanceTextColor}
        />
      ))}



      {/* Hover Measurements (Alt + hover) */}
      {guidelines.isAltPressed && guidelines.hoverMeasurements.map((measurement, index) => (
        <DistanceLabel
          key={`hover-${index}`}
          axis={measurement.axis}
          start={measurement.start}
          end={measurement.end}
          distance={measurement.distance}
          otherAxisPosition={measurement.perpendicularPosition}
          strokeWidth={strokeWidth}
          color="#FF6600"
          zoom={viewport.zoom}
          opacity={0.9}
          withBackground={true}
          backgroundColor={labelBackgroundColor}
          textColor={distanceTextColor}
        />
      ))}

      {/* Dragging guide preview (rendered in canvas coordinates) */}
      {guidelines.isDraggingGuide && guidelines.draggingGuidePosition !== null && (
        <line
          x1={guidelines.draggingGuideType === 'horizontal' ? -canvasWidth / 2 : guidelines.draggingGuidePosition}
          y1={guidelines.draggingGuideType === 'horizontal' ? guidelines.draggingGuidePosition : -canvasHeight / 2}
          x2={guidelines.draggingGuideType === 'horizontal' ? canvasWidth * 1.5 : guidelines.draggingGuidePosition}
          y2={guidelines.draggingGuideType === 'horizontal' ? guidelines.draggingGuidePosition : canvasHeight * 1.5}
          stroke={guidelines.manualGuideColor}
          strokeWidth={2 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
          opacity={0.8}
          pointerEvents="none"
        />
      )}
    </g>
  );
};
