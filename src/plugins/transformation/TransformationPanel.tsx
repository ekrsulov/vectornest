import React, { useEffect, useRef, useState, useMemo } from 'react';
import { VStack, HStack, Tag, Text, Box, IconButton, Divider, Grid, GridItem } from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { Lock, LockOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelToggle } from '../../ui/PanelToggle';
import { NumberInput } from '../../ui/NumberInput';
import { usePanelToggleHandlers } from '../../hooks/usePanelToggleHandlers';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import type { CanvasElement } from '../../types';
import { decomposeMatrix, type Matrix, type MatrixDecomposition } from '../../utils/matrixUtils';

interface TransformationPanelProps { hideTitle?: boolean }

export const TransformationPanel: React.FC<TransformationPanelProps> = ({ hideTitle = false }) => {
  // Use individual selectors to prevent re-renders on unrelated changes
  const selectedIds = useCanvasStore(state => state.selectedIds);
  const selectedSubpaths = useCanvasStore(state => state.selectedSubpaths);
  const elements = useCanvasStore(state => state.elements); // Subscribe to elements for canvas changes
  const transformation = useCanvasStore(state => state.transformation);
  const updateTransformationState = useCanvasStore(state => state.updateTransformationState);
  const updateElement = useCanvasStore(state => state.updateElement);
  const isWorkingWithSubpaths = useCanvasStore(state => state.isWorkingWithSubpaths);
  const getTransformationBounds = useCanvasStore(state => state.getTransformationBounds);
  const applyResizeTransform = useCanvasStore(state => state.applyResizeTransform);
  const applyRotationTransform = useCanvasStore(state => state.applyRotationTransform);
  const applyAdvancedDistortTransform = useCanvasStore(state => state.applyAdvancedDistortTransform);
  const applyAdvancedSkewTransform = useCanvasStore(state => state.applyAdvancedSkewTransform);
  
  const { createToggleHandler } = usePanelToggleHandlers(updateTransformationState ?? (() => {}));
  
  const { showCoordinates, showRulers, maintainAspectRatio, advancedMode } = transformation ?? { 
    showCoordinates: false, 
    showRulers: false,
    maintainAspectRatio: true,
    advancedMode: false
  };

  const isSubpathMode = isWorkingWithSubpaths?.() ?? false;
  const selectedCount = isSubpathMode ? (selectedSubpaths?.length ?? 0) : selectedIds.length;

  // Get current bounds for transformation and store in state to trigger re-renders
  const [currentBounds, setCurrentBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  
  // Update bounds whenever selection changes or when forced
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  // Collapsible states for advanced sections
  const [showPerspective, setShowPerspective] = useState(false);
  const [showDistort, setShowDistort] = useState(false);

  // Helper to check if an element has any transformation applied
  const hasTransformation = (element: CanvasElement): boolean => {
    const data = element.data as {
      transform?: { scaleX?: number; scaleY?: number; rotation?: number; translateX?: number; translateY?: number };
      transformMatrix?: [number, number, number, number, number, number];
    };
    
    // Check for transformMatrix (not identity)
    if (data.transformMatrix) {
      const [a, b, c, d, e, f] = data.transformMatrix;
      const isIdentity = a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0;
      if (!isIdentity) return true;
    }
    
    // Check for transform object with non-default values
    if (data.transform) {
      const { scaleX = 1, scaleY = 1, rotation = 0, translateX = 0, translateY = 0 } = data.transform;
      if (scaleX !== 1 || scaleY !== 1 || rotation !== 0 || translateX !== 0 || translateY !== 0) {
        return true;
      }
    }
    
    return false;
  };

  // Check if any selected element has a transformation
  const selectedElementsHaveTransformation = useMemo(() => {
    if (isSubpathMode || selectedIds.length === 0) return false;
    
    const elementMap = new Map(elements.map(el => [el.id, el]));
    return selectedIds.some(id => {
      const element = elementMap.get(id);
      return element && hasTransformation(element);
    });
  }, [selectedIds, elements, isSubpathMode]);

  // Check if rotation pivot is custom (not at default center)
  const hasCustomRotationPivot = useMemo(() => {
    if (!transformation?.rotationPivot || !transformation?.rotationPivotTarget) return false;
    if (isSubpathMode || selectedIds.length !== 1) return false;

    const bounds = currentBounds;
    if (!bounds) return false;

    const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;

    // Check if current target matches selected element
    const elementMap = new Map(elements.map(el => [el.id, el]));
    const element = elementMap.get(selectedIds[0]);
    if (!element) return false;

    const pivotTarget = element.type === 'group' ? `group:${element.id}` : `element:${element.id}`;
    if (transformation.rotationPivotTarget !== pivotTarget) return false;

    // Check if pivot differs from center (with small tolerance for floating point)
    const tolerance = 0.01;
    const isDifferent = Math.abs(transformation.rotationPivot.x - centerX) > tolerance ||
                       Math.abs(transformation.rotationPivot.y - centerY) > tolerance;

    return isDifferent;
  }, [transformation, currentBounds, isSubpathMode, selectedIds, elements]);

  // Get the decomposed transformation matrix for display
  const transformationDecomposition = useMemo((): MatrixDecomposition | null => {
    if (isSubpathMode || selectedIds.length !== 1) return null;
    
    const elementMap = new Map(elements.map(el => [el.id, el]));
    const element = elementMap.get(selectedIds[0]);
    if (!element) return null;
    
    const data = element.data as {
      transform?: { scaleX?: number; scaleY?: number; rotation?: number; translateX?: number; translateY?: number };
      transformMatrix?: Matrix;
    };
    
    // Prefer transformMatrix if available
    if (data.transformMatrix) {
      const [a, b, c, d, e, f] = data.transformMatrix;
      const isIdentity = a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0;
      if (!isIdentity) {
        return decomposeMatrix(data.transformMatrix);
      }
    }
    
    // Fall back to transform object
    if (data.transform) {
      const { scaleX = 1, scaleY = 1, rotation = 0, translateX = 0, translateY = 0 } = data.transform;
      const hasTransform = scaleX !== 1 || scaleY !== 1 || rotation !== 0 || translateX !== 0 || translateY !== 0;
      if (hasTransform) {
        return {
          translateX: Math.round(translateX * 100) / 100,
          translateY: Math.round(translateY * 100) / 100,
          scaleX: Math.round(scaleX * 1000) / 1000,
          scaleY: Math.round(scaleY * 1000) / 1000,
          rotation: Math.round(rotation * 100) / 100,
          skewX: 0,
          skewY: 0,
        };
      }
    }
    
    return null;
  }, [selectedIds, elements, isSubpathMode]);

  // Reset transformation for selected elements
  const handleResetTransformation = () => {
    if (!updateElement) return;
    
    const elementMap = new Map(elements.map(el => [el.id, el]));
    selectedIds.forEach(id => {
      const element = elementMap.get(id);
      if (element && hasTransformation(element)) {
        // Set transform properties to undefined to effectively remove them
        // We need to explicitly set them since updateElement uses spread which won't remove properties
        updateElement(id, { 
          data: { 
            transform: undefined, 
            transformMatrix: undefined 
          } 
        });
      }
    });

    updateTransformationState?.({ rotationPivot: null });
    
    // Trigger bounds update
    setUpdateTrigger(prev => prev + 1);
  };

  // Reset rotation pivot to center
  const handleResetRotationPivot = () => {
    updateTransformationState?.({ rotationPivot: null, rotationPivotTarget: null });
  };
  
  useEffect(() => {
    const bounds = getTransformationBounds?.();
    setCurrentBounds(bounds ?? null);
  }, [selectedIds, selectedSubpaths, getTransformationBounds, updateTrigger, elements]);

  const width = currentBounds ? Math.round(currentBounds.maxX - currentBounds.minX) : 0;
  const height = currentBounds ? Math.round(currentBounds.maxY - currentBounds.minY) : 0;

  // Track the aspect ratio
  const aspectRatioRef = useRef(1);
  
  // Update aspect ratio when selection changes
  useEffect(() => {
    if (currentBounds && width > 0 && height > 0) {
      aspectRatioRef.current = width / height;
    }
  }, [selectedIds, selectedSubpaths, currentBounds?.minX, currentBounds?.minY, currentBounds?.maxX, currentBounds?.maxY, currentBounds, width, height]);

  const handleWidthChange = (newWidth: number) => {
    if (applyResizeTransform) {
      const currentBounds = getTransformationBounds?.();
      if (currentBounds) {
        let newHeight = currentBounds.maxY - currentBounds.minY;
        
        if (maintainAspectRatio && aspectRatioRef.current > 0) {
          newHeight = newWidth / aspectRatioRef.current;
        }
        
        applyResizeTransform(newWidth, newHeight);
        // Trigger bounds update
        setUpdateTrigger(prev => prev + 1);
      }
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (applyResizeTransform) {
      const currentBounds = getTransformationBounds?.();
      if (currentBounds) {
        let newWidth = currentBounds.maxX - currentBounds.minX;
        
        if (maintainAspectRatio && aspectRatioRef.current > 0) {
          newWidth = newHeight * aspectRatioRef.current;
        }
        
        applyResizeTransform(newWidth, newHeight);
        // Trigger bounds update
        setUpdateTrigger(prev => prev + 1);
      }
    }
  };

  const handleRotationChange = (degrees: number) => {
    if (degrees !== 0 && applyRotationTransform) {
      applyRotationTransform(degrees);
      // Trigger bounds update
      setUpdateTrigger(prev => prev + 1);
    }
  };

  // Advanced transforms: Skew and Distort (corner offsets)
  // Inputs used as transient deltas (like Rotation). UI value always resets to 0 after apply.
  const [tlOffset, setTlOffset] = useState({ x: 0, y: 0 });
  const [trOffset, setTrOffset] = useState({ x: 0, y: 0 });
  const [blOffset, setBlOffset] = useState({ x: 0, y: 0 });
  const [brOffset, setBrOffset] = useState({ x: 0, y: 0 });

  const handleSkewXChange = (degrees: number) => {
    // Apply a transient skew delta, UI value will reset to 0
    updateTransformationState?.( { activeHandler: 'skew' } );
    applyAdvancedSkewTransform?.('x', degrees);
    setUpdateTrigger(prev => prev + 1);
  };

  const handleSkewYChange = (degrees: number) => {
    // Apply a transient skew delta, UI value will reset to 0
    updateTransformationState?.( { activeHandler: 'skew' } );
    applyAdvancedSkewTransform?.('y', degrees);
    setUpdateTrigger(prev => prev + 1);
  };


  const handleDistortOffsetChange = (corner: 'tl' | 'tr' | 'bl' | 'br', axis: 'x' | 'y', delta: number) => {
    const bounds = getTransformationBounds?.();
    if (!bounds) return;

    // Source corners of the selection before offsets
    const srcCorners = {
      tl: { x: bounds.minX, y: bounds.minY },
      tr: { x: bounds.maxX, y: bounds.minY },
      bl: { x: bounds.minX, y: bounds.maxY },
      br: { x: bounds.maxX, y: bounds.maxY }
    };

    // Build current offsets while applying delta to the requested corner
    const currentOffsets = {
      tl: { ...tlOffset },
      tr: { ...trOffset },
      bl: { ...blOffset },
      br: { ...brOffset }
    };

    // delta is applied as a relative offset (like rotation), so add it on top of stored offsets
    currentOffsets[corner][axis] += delta;

    // Compose transformed corners from source corners + offsets
    const newTl = { x: srcCorners.tl.x + currentOffsets.tl.x, y: srcCorners.tl.y + currentOffsets.tl.y };
    const newTr = { x: srcCorners.tr.x + currentOffsets.tr.x, y: srcCorners.tr.y + currentOffsets.tr.y };
    const newBl = { x: srcCorners.bl.x + currentOffsets.bl.x, y: srcCorners.bl.y + currentOffsets.bl.y };
    const newBr = { x: srcCorners.br.x + currentOffsets.br.x, y: srcCorners.br.y + currentOffsets.br.y };

    // Persist the updated offsets
    setTlOffset(currentOffsets.tl);
    setTrOffset(currentOffsets.tr);
    setBlOffset(currentOffsets.bl);
    setBrOffset(currentOffsets.br);

    updateTransformationState?.( { activeHandler: 'distort' } );
    applyAdvancedDistortTransform?.({ tl: newTl, tr: newTr, bl: newBl, br: newBr });
    setUpdateTrigger(prev => prev + 1);
  };

  // Perspective edge change: apply delta to both corners of an edge
  const handlePerspectiveEdgeChange = (edge: 'top' | 'bottom' | 'left' | 'right', axis: 'x' | 'y', delta: number) => {
    const bounds = getTransformationBounds?.();
    if (!bounds) return;

    const srcCorners = {
      tl: { x: bounds.minX, y: bounds.minY },
      tr: { x: bounds.maxX, y: bounds.minY },
      bl: { x: bounds.minX, y: bounds.maxY },
      br: { x: bounds.maxX, y: bounds.maxY }
    };

    const currentOffsets = {
      tl: { ...tlOffset },
      tr: { ...trOffset },
      bl: { ...blOffset },
      br: { ...brOffset }
    };

    switch (edge) {
      case 'top':
        currentOffsets.tl[axis] += delta;
        currentOffsets.tr[axis] += delta;
        break;
      case 'bottom':
        currentOffsets.bl[axis] += delta;
        currentOffsets.br[axis] += delta;
        break;
      case 'left':
        currentOffsets.tl[axis] += delta;
        currentOffsets.bl[axis] += delta;
        break;
      case 'right':
        currentOffsets.tr[axis] += delta;
        currentOffsets.br[axis] += delta;
        break;
    }

    // Compose new corners
    const newTl = { x: srcCorners.tl.x + currentOffsets.tl.x, y: srcCorners.tl.y + currentOffsets.tl.y };
    const newTr = { x: srcCorners.tr.x + currentOffsets.tr.x, y: srcCorners.tr.y + currentOffsets.tr.y };
    const newBl = { x: srcCorners.bl.x + currentOffsets.bl.x, y: srcCorners.bl.y + currentOffsets.bl.y };
    const newBr = { x: srcCorners.br.x + currentOffsets.br.x, y: srcCorners.br.y + currentOffsets.br.y };

    // Persist offsets
    setTlOffset(currentOffsets.tl);
    setTrOffset(currentOffsets.tr);
    setBlOffset(currentOffsets.bl);
    setBrOffset(currentOffsets.br);

    updateTransformationState?.({ activeHandler: 'distort' });
    applyAdvancedDistortTransform?.({ tl: newTl, tr: newTr, bl: newBl, br: newBr });
    setUpdateTrigger(prev => prev + 1);
  };

  return (
    <Panel 
      title="Transform"
      hideHeader={hideTitle}
      headerActions={
        <HStack spacing={2}>
          {isSubpathMode && (
            <Tag size="sm" colorScheme="purple" fontSize="xs">
              Subpath
            </Tag>
          )}
          {selectedElementsHaveTransformation && (
            <PanelStyledButton onClick={handleResetTransformation} size="xs">
              Reset
            </PanelStyledButton>
          )}
        </HStack>
      }
    >
      <VStack spacing={3} align="stretch">
        {/* Toggles at the top */}
        <HStack spacing={3}>
          <PanelToggle
            isChecked={showCoordinates}
            onChange={createToggleHandler('showCoordinates')}
          >
            Coords
          </PanelToggle>

          <PanelToggle
            isChecked={showRulers}
            onChange={createToggleHandler('showRulers')}
          >
            Rulers
          </PanelToggle>
          
          <PanelToggle
            isChecked={advancedMode}
            onChange={createToggleHandler('advancedMode')}
          >
            Advanced
          </PanelToggle>
        </HStack>

        {selectedCount === 0 && (
          <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
            {`Select ${isSubpathMode ? 'a subpath' : 'an element'} to transform`}
          </Text>
        )}

        {selectedCount > 0 && (
          <VStack spacing={1.5} align="stretch">
            {/* Size controls with lock (hidden in Advanced Mode) */}
            {!advancedMode && (
              <Box position="relative">
              <HStack spacing={0} align="stretch">
                <VStack spacing={1.5} align="stretch" flex={1}>
                  <HStack spacing={2} position="relative">
                    <NumberInput
                      label="Width"
                      value={width}
                      onChange={handleWidthChange}
                      min={1}
                      step={1}
                      suffix="px"
                      labelWidth="50px"
                      inputWidth="65px"
                      testId="width-input"
                    />
                    {/* Horizontal line from Width to lock */}
                    <Box 
                      position="absolute"
                      right="-18px"
                      top="50%"
                      transform="translateY(-50%)"
                      w="25px"
                      h="2px"
                      bg={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                      _dark={{
                        bg: maintainAspectRatio ? 'gray.400' : 'gray.600'
                      }}
                      transition="background 0.2s"
                    />
                  </HStack>
                  
                  <HStack spacing={2} position="relative">
                    <NumberInput
                      label="Height"
                      value={height}
                      onChange={handleHeightChange}
                      min={1}
                      step={1}
                      suffix="px"
                      labelWidth="50px"
                      inputWidth="65px"
                      testId="height-input"
                    />
                    {/* Horizontal line from Height to lock */}
                    <Box 
                      position="absolute"
                      right="-18px"
                      top="50%"
                      transform="translateY(-50%)"
                      w="25px"
                      h="2px"
                      bg={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                      _dark={{
                        bg: maintainAspectRatio ? 'gray.400' : 'gray.600'
                      }}
                      transition="background 0.2s"
                    />
                  </HStack>
                </VStack>
                
                {/* Lock button with vertical connecting line forming a bracket ] */}
                <Box position="relative" ml="10px" display="flex" flexDirection="column" justifyContent="center">
                  {/* Vertical line spanning from top to bottom */}
                  <Box 
                    position="absolute"
                    left="2"
                    top="9px"
                    bottom="9px"
                    w="2px" 
                    bg={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                    _dark={{
                      bg: maintainAspectRatio ? 'gray.400' : 'gray.600'
                    }}
                    transition="background 0.2s"
                  />
                  
                  {/* Lock button */}
                  <ConditionalTooltip
                    label={maintainAspectRatio ? 'Locked - Proportional resize' : 'Unlocked - Free resize'}
                    placement="top"
                  >
                    <Box
                      as="button"
                      onClick={() => updateTransformationState?.({ maintainAspectRatio: !maintainAspectRatio })}
                      p={0.25}
                      borderRadius="full"
                      bg="white"
                      color={maintainAspectRatio ? 'gray.500' : 'gray.400'}
                      border="2px solid"
                      borderColor={maintainAspectRatio ? 'gray.500' : 'gray.300'}
                      _dark={{
                        bg: 'gray.700',
                        color: maintainAspectRatio ? 'gray.400' : 'gray.600',
                        borderColor: maintainAspectRatio ? 'gray.400' : 'gray.600'
                      }}
                      _hover={{ 
                        bg: 'rgb(247, 250, 252)',
                        borderColor: maintainAspectRatio ? 'gray.600' : 'gray.400',
                        _dark: {
                          bg: 'gray.600',
                          borderColor: maintainAspectRatio ? 'gray.300' : 'gray.500'
                        }
                      }}
                      transition="all 0.2s"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      minW="18px"
                      h="18px"
                      position="relative"
                      zIndex={1}
                    >
                      {maintainAspectRatio ? <Lock size={10} strokeWidth={4} /> : <LockOpen size={10} strokeWidth={4} />}
                    </Box>
                  </ConditionalTooltip>
                </Box>
              </HStack>
              </Box>
            )}

            {/* Rotation control (hidden in Advanced Mode) */}
            {!advancedMode && (
              <HStack spacing={2} align="stretch">
                <Box flex={1}>
                  <NumberInput
                    label="Rotation"
                    value={0}
                    onChange={handleRotationChange}
                    min={0}
                    max={360}
                    step={1}
                    suffix="deg"
                    labelWidth="50px"
                    inputWidth="65px"
                    testId="rotation-input"
                    resetAfterChange={true}
                  />
                </Box>
                {hasCustomRotationPivot && (
                  <ConditionalTooltip label="Reset pivot to center" placement="top">
                    <PanelStyledButton onClick={handleResetRotationPivot} size="xs" height="24px" mt="auto">
                      Reset Center
                    </PanelStyledButton>
                  </ConditionalTooltip>
                )}
              </HStack>
            )}
            {advancedMode && (
              <VStack spacing={1.5} align="stretch">
                {/* Skew controls - new horizontal row (Skew X [__] Y [__]) */}
                <HStack spacing={2} align="center" data-testid="skew-row">
                  <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>Skew</Text>
                  <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                  <NumberInput
                    testId="skew-x-input"
                    label=""
                    value={0}
                    onChange={handleSkewXChange}
                    min={-89}
                    max={89}
                    step={0.1}
                    labelWidth="0px"
                    inputWidth="56px"
                    resetAfterChange={true}
                  />
                  <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                  <NumberInput
                    testId="skew-y-input"
                    label=""
                    value={0}
                    onChange={handleSkewYChange}
                    min={-89}
                    max={89}
                    step={0.1}
                    labelWidth="0px"
                    inputWidth="56px"
                    resetAfterChange={true}
                  />
                  </HStack>

                  {/* Perspective edge controls - Top/Bottom/Left/Right with X/Y deltas */}
                  <HStack spacing={2} align="center" justifyContent="space-between">
                    <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>Perspective (edge deltas):</Text>
                    <IconButton
                      aria-label={showPerspective ? "Collapse Perspective" : "Expand Perspective"}
                      icon={showPerspective ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      onClick={() => setShowPerspective(!showPerspective)}
                      variant="ghost"
                      size="xs"
                      h="20px"
                      minW="20px"
                      borderRadius="full"
                      color="gray.600"
                      _dark={{ color: "gray.400" }}
                      _hover={{ color: "gray.800", _dark: { color: "gray.200" } }}
                    />
                  </HStack>
                  {showPerspective && (
                    <VStack spacing={1} align="stretch">
                    <HStack spacing={2} align="center" data-testid="perspective-row-top">
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>Top</Text>
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                      <NumberInput
                        testId="perspective-top-x-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('top', 'x', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                      <NumberInput
                        testId="perspective-top-y-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('top', 'y', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                    </HStack>
                    <HStack spacing={2} align="center" data-testid="perspective-row-bottom">
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>Bottom</Text>
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                      <NumberInput
                        testId="perspective-bottom-x-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('bottom', 'x', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                      <NumberInput
                        testId="perspective-bottom-y-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('bottom', 'y', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                    </HStack>
                    <HStack spacing={2} align="center" data-testid="perspective-row-left">
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>Left</Text>
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                      <NumberInput
                        testId="perspective-left-x-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('left', 'x', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                      <NumberInput
                        testId="perspective-left-y-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('left', 'y', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                    </HStack>
                    <HStack spacing={2} align="center" data-testid="perspective-row-right">
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>Right</Text>
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                      <NumberInput
                        testId="perspective-right-x-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('right', 'x', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                      <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                      <NumberInput
                        testId="perspective-right-y-input"
                        label=""
                        value={0}
                        onChange={(v) => handlePerspectiveEdgeChange('right', 'y', v)}
                        step={1}
                        labelWidth="0px"
                        inputWidth="56px"
                        resetAfterChange={true}
                      />
                    </HStack>
                  </VStack>
                  )}

                {/* Distort corner offsets (px) - Each corner: X/Y offset */}
                <HStack spacing={2} align="center" justifyContent="space-between">
                  <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>Distort (corner offsets):</Text>
                  <IconButton
                    aria-label={showDistort ? "Collapse Distort" : "Expand Distort"}
                    icon={showDistort ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    onClick={() => setShowDistort(!showDistort)}
                    variant="ghost"
                    size="xs"
                    h="20px"
                    minW="20px"
                    borderRadius="full"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                    _hover={{ color: "gray.800", _dark: { color: "gray.200" } }}
                  />
                </HStack>
                {showDistort && (
                  <VStack spacing={1} align="stretch">
                  <HStack spacing={2} align="center" data-testid="distort-row-tl">
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>TL</Text>
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                    <NumberInput
                      testId="distort-tl-x-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('tl', 'x', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                    <NumberInput
                      testId="distort-tl-y-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('tl', 'y', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                  </HStack>
                  <HStack spacing={2} align="center" data-testid="distort-row-tr">
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>TR</Text>
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                    <NumberInput
                      testId="distort-tr-x-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('tr', 'x', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                    <NumberInput
                      testId="distort-tr-y-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('tr', 'y', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                  </HStack>
                  <HStack spacing={2} align="center" data-testid="distort-row-bl">
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>BL</Text>
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                    <NumberInput
                      testId="distort-bl-x-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('bl', 'x', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                    <NumberInput
                      testId="distort-bl-y-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('bl', 'y', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                  </HStack>
                  <HStack spacing={2} align="center" data-testid="distort-row-br">
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="42px" flexShrink={0}>BR</Text>
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>X</Text>
                    <NumberInput
                      testId="distort-br-x-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('br', 'x', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                    <Text fontSize="12px" color="gray.600" _dark={{ color: "gray.400" }} minW="8px" flexShrink={0}>Y</Text>
                    <NumberInput
                      testId="distort-br-y-input"
                      label=""
                      value={0}
                      onChange={(v) => handleDistortOffsetChange('br', 'y', v)}
                      step={1}
                      labelWidth="0px"
                      inputWidth="56px"
                      resetAfterChange={true}
                    />
                  </HStack>
                  {/* Reset button removed; distort inputs act as relative deltas and persist offsets (similar UX to Rotation). */}
                </VStack>
                )}
              </VStack>
            )}
            
            {/* Transform Matrix Decomposition Display */}
            {transformationDecomposition && (
              <>
                <Divider borderColor="gray.200" _dark={{ borderColor: 'gray.600' }} />
                <VStack spacing={1} align="stretch">
                  <Text fontSize="10px" fontWeight="medium" color="gray.500" _dark={{ color: 'gray.400' }} textTransform="uppercase" letterSpacing="wider">
                    Applied Transform
                  </Text>
                  <Grid templateColumns="1fr 1fr" gap={1}>
                    {(transformationDecomposition.translateX !== 0 || transformationDecomposition.translateY !== 0) && (
                      <>
                        <GridItem>
                          <HStack spacing={1}>
                            <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.400' }} minW="28px">Tx</Text>
                            <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.200' }} fontFamily="mono">
                              {transformationDecomposition.translateX}
                            </Text>
                          </HStack>
                        </GridItem>
                        <GridItem>
                          <HStack spacing={1}>
                            <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.400' }} minW="28px">Ty</Text>
                            <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.200' }} fontFamily="mono">
                              {transformationDecomposition.translateY}
                            </Text>
                          </HStack>
                        </GridItem>
                      </>
                    )}
                    {transformationDecomposition.rotation !== 0 && (
                      <GridItem colSpan={2}>
                        <HStack spacing={1}>
                          <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.400' }} minW="28px">Rot</Text>
                          <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.200' }} fontFamily="mono">
                            {transformationDecomposition.rotation}°
                          </Text>
                        </HStack>
                      </GridItem>
                    )}
                    {(transformationDecomposition.scaleX !== 1 || transformationDecomposition.scaleY !== 1) && (
                      <>
                        <GridItem>
                          <HStack spacing={1}>
                            <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.400' }} minW="28px">Sx</Text>
                            <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.200' }} fontFamily="mono">
                              {transformationDecomposition.scaleX}
                            </Text>
                          </HStack>
                        </GridItem>
                        <GridItem>
                          <HStack spacing={1}>
                            <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.400' }} minW="28px">Sy</Text>
                            <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.200' }} fontFamily="mono">
                              {transformationDecomposition.scaleY}
                            </Text>
                          </HStack>
                        </GridItem>
                      </>
                    )}
                    {(transformationDecomposition.skewX !== 0 || transformationDecomposition.skewY !== 0) && (
                      <>
                        <GridItem>
                          <HStack spacing={1}>
                            <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.400' }} minW="28px">SkX</Text>
                            <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.200' }} fontFamily="mono">
                              {transformationDecomposition.skewX}°
                            </Text>
                          </HStack>
                        </GridItem>
                        <GridItem>
                          <HStack spacing={1}>
                            <Text fontSize="10px" color="gray.500" _dark={{ color: 'gray.400' }} minW="28px">SkY</Text>
                            <Text fontSize="10px" color="gray.700" _dark={{ color: 'gray.200' }} fontFamily="mono">
                              {transformationDecomposition.skewY}°
                            </Text>
                          </HStack>
                        </GridItem>
                      </>
                    )}
                  </Grid>
                </VStack>
              </>
            )}
          </VStack>
        )}
      </VStack>
    </Panel>
  );
};
