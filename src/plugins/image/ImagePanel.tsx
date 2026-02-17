import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, HStack, Input, VStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { NumberInput } from '../../ui/NumberInput';
import { useCanvasStore } from '../../store/canvasStore';
import { CustomSelect } from '../../ui/CustomSelect';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { Lock as LockIcon, Unlock as UnlockIcon } from 'lucide-react';
import type { PluginImageElement as ImageElement } from './types';
import { duplicateElements } from '../../utils/duplicationUtils';

interface ImagePanelProps {
  hideTitle?: boolean;
}

export const ImagePanel: React.FC<ImagePanelProps> = ({ hideTitle = false }) => {
  const elements = useCanvasStore((state) => state.elements);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const image = useCanvasStore((state) => state.image);
  const setImageSettings = useCanvasStore((state) => state.setImageSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastLoadedUrl, setLastLoadedUrl] = useState<string | null>(null);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const aspectRatioRef = useRef<number>(1);

  const selectedImage = (elements.find((el) => selectedIds.includes(el.id) && el.type === 'image') ?? null) as ImageElement | null;
  const isEditing = Boolean(selectedImage);

  const handleDuplicate = useCallback(() => {
    if (selectedImage) {
      const elementMap = new Map(elements.map(el => [el.id, el]));
      const addElement = useCanvasStore.getState().addElement;
      const updateElement = useCanvasStore.getState().updateElement;
      duplicateElements([selectedImage.id], elementMap, addElement, updateElement);
    }
  }, [selectedImage, elements]);

  const currentUrl = isEditing ? (selectedImage?.data.href ?? '') : (image?.url ?? '');
  const currentWidth = isEditing ? (selectedImage?.data.width ?? 0) : (image?.width ?? 0);
  const currentHeight = isEditing ? (selectedImage?.data.height ?? 0) : (image?.height ?? 0);
  const currentOpacity = isEditing ? (selectedImage?.data.opacity ?? 1) : (image?.opacity ?? 1);
  const currentPreserveAspectRatio = isEditing
    ? (selectedImage?.data.preserveAspectRatio ?? 'none')
    : (image?.preserveAspectRatio ?? 'none');

  useEffect(() => {
    if (currentWidth > 0 && currentHeight > 0) {
      aspectRatioRef.current = currentWidth / currentHeight;
    }
  }, [currentWidth, currentHeight]);

  useEffect(() => {
    if (isEditing) {
      setHasLoaded(true);
      setIsLoading(false);
      setLastLoadedUrl(selectedImage?.data.href ?? null);
    }
  }, [isEditing, selectedImage?.data.href]);

  const applySizeChange = useCallback((newWidth: number, newHeight: number) => {
    if (isEditing && selectedImage) {
      updateElement(selectedImage.id, { data: { ...selectedImage.data, width: newWidth, height: newHeight } });
    } else {
      setImageSettings({ width: newWidth, height: newHeight });
    }
  }, [isEditing, selectedImage, setImageSettings, updateElement]);

  // Load the image to extract intrinsic dimensions before enabling size inputs
  useEffect(() => {
    if (!currentUrl) {
      setIsLoading(false);
      setHasLoaded(false);
      setLastLoadedUrl(null);
      return;
    }

    // If we already loaded this URL, don't re-fetch
    if (currentUrl === lastLoadedUrl) {
      setIsLoading(false);
      setHasLoaded(true);
      return;
    }

    setIsLoading(true);
    setHasLoaded(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const nextWidth = img.naturalWidth || currentWidth || 1;
      const nextHeight = img.naturalHeight || currentHeight || 1;

      applySizeChange(nextWidth, nextHeight);
      setIsLoading(false);
      setHasLoaded(true);
      setLastLoadedUrl(currentUrl);
    };
    img.onerror = () => {
      setIsLoading(false);
      setHasLoaded(false);
    };

    img.src = currentUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [currentUrl, isEditing, selectedImage, lastLoadedUrl, currentWidth, currentHeight, applySizeChange]);

  if (!image || !setImageSettings) {
    return null;
  }

  const disableSizeInputs = !hasLoaded || isLoading;

  const handleFieldChange = <K extends keyof ImageElement['data']>(
    field: K,
    value: ImageElement['data'][K]
  ) => {
    if (isEditing && selectedImage) {
      updateElement(selectedImage.id, { data: { ...selectedImage.data, [field]: value } });
    } else {
      const mappedField = field === 'href' ? 'url' : field;
      setImageSettings({ [mappedField]: value } as Record<string, unknown>);
    }
  };

  const handleUrlChange = (value: string) => {
    setHasLoaded(false);
    setIsLoading(false);
    setLastLoadedUrl(null);
    handleFieldChange('href', value);
  };

  const handleWidthChange = (value: number) => {
    const newWidth = Math.max(1, value);
    let newHeight = currentHeight;

    if (maintainAspectRatio && aspectRatioRef.current > 0) {
      newHeight = Math.max(1, newWidth / aspectRatioRef.current);
    }

    applySizeChange(newWidth, newHeight);
  };

  const handleHeightChange = (value: number) => {
    const newHeight = Math.max(1, value);
    let newWidth = currentWidth;

    if (maintainAspectRatio && aspectRatioRef.current > 0) {
      newWidth = Math.max(1, newHeight * aspectRatioRef.current);
    }

    applySizeChange(newWidth, newHeight);
  };

  return (
    <Panel title="Image" hideHeader={hideTitle}>
      <VStack spacing={2} align="stretch">
        <Box pt={0.5} px={0.5}>
          <Input
            size="sm"
            value={currentUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/image.png"
            borderRadius="0"
            h="20px"
            _focus={{
              borderColor: 'gray.600',
              boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
            }}
          />
        </Box>

        <Box position="relative">
          <HStack spacing={0} align="stretch">
            <VStack spacing={1.5} align="stretch" flex={1}>
              <HStack spacing={2} position="relative">
                <NumberInput
                  label="Width"
                  value={currentWidth}
                  onChange={handleWidthChange}
                  min={1}
                  step={1}
                  suffix="px"
                  labelWidth="50px"
                  inputWidth="65px"
                  isDisabled={disableSizeInputs}
                />
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
                  value={currentHeight}
                  onChange={handleHeightChange}
                  min={1}
                  step={1}
                  suffix="px"
                  labelWidth="50px"
                  inputWidth="65px"
                  isDisabled={disableSizeInputs}
                />
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

            <Box position="relative" ml="10px" display="flex" flexDirection="column" justifyContent="center">
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

              <Box
                as="button"
                onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
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
                {maintainAspectRatio ? <LockIcon size={10} strokeWidth={4} /> : <UnlockIcon size={10} strokeWidth={4} />}
              </Box>
            </Box>
          </HStack>
        </Box>

        <Box pr={0.5}>
          <PercentSliderControl
            label="Opacity"
            value={currentOpacity}
            onChange={(value) => handleFieldChange('opacity', Math.max(0, Math.min(1, value)) as never)}
            step={0.05}
            labelWidth="60px"
            minWidth="80px"
            valueWidth="48px"
          />
        </Box>

        <CustomSelect
          size="sm"
          value={currentPreserveAspectRatio}
          onChange={(value) => handleFieldChange('preserveAspectRatio', value as never)}
          options={[
            { value: 'xMidYMid meet', label: 'Scale & center' },
            { value: 'none', label: 'Stretch' },
            { value: 'xMinYMin meet', label: 'Top-left' },
            { value: 'xMaxYMax meet', label: 'Bottom-right' },
          ]}
        />

        {isEditing && (
          <PanelStyledButton
            onClick={handleDuplicate}
            w="full"
          >
            Duplicate
          </PanelStyledButton>
        )}

        <HStack justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500">
            {isEditing ? 'Edit selected image attributes' : 'Set URL & size, then use the Image tool to place'}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {isLoading ? 'Loading…' : hasLoaded ? 'Ready' : 'Waiting for image'}
          </Text>
        </HStack>
      </VStack>
    </Panel>
  );
};
