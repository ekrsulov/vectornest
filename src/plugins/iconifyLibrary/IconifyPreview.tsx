import React, { useEffect, useMemo, useState } from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import { logger } from '../../utils/logger';
import {
  getCachedIconifySvg,
  getIconifyCacheKey,
  loadIconifySvg,
  prepareIconifySvgForPreview,
} from './iconifyApi';

interface IconifyPreviewProps {
  prefix: string;
  iconName: string;
  label: string;
  size: number;
}

export const IconifyPreview: React.FC<IconifyPreviewProps> = ({
  prefix,
  iconName,
  label,
  size,
}) => {
  const { colorMode } = useColorMode();
  const iconId = getIconifyCacheKey(prefix, iconName);
  const [rawSvg, setRawSvg] = useState<string | null>(() => getCachedIconifySvg(iconId));

  useEffect(() => {
    const cachedSvg = getCachedIconifySvg(iconId);
    if (cachedSvg) {
      setRawSvg(cachedSvg);
      return;
    }

    const controller = new AbortController();

    const loadPreviewSvg = async () => {
      try {
        const svg = await loadIconifySvg(prefix, iconName, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setRawSvg(svg);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logger.error('Failed to load Iconify preview SVG', error, { iconId });
        setRawSvg('');
      }
    };

    void loadPreviewSvg();

    return () => controller.abort();
  }, [iconId, iconName, prefix]);

  const previewSvg = useMemo(() => {
    if (!rawSvg) {
      return null;
    }

    return prepareIconifySvgForPreview(rawSvg, { colorMode });
  }, [colorMode, rawSvg]);

  return (
    <Box
      role="img"
      aria-label={label}
      width={`${size}px`}
      height={`${size}px`}
      color={colorMode === 'dark' ? 'white' : 'black'}
      sx={{
        '& > svg': {
          width: '100%',
          height: '100%',
          display: 'block',
        },
      }}
      dangerouslySetInnerHTML={previewSvg ? { __html: previewSvg } : undefined}
    />
  );
};
