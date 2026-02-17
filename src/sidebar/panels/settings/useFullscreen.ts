import { useCallback, useEffect, useState } from 'react';
import { createListenerContext, installGlobalPluginListeners } from '../../../utils/pluginListeners';
import { logger } from '../../../utils';
import { useCanvasStore } from '../../../store/canvasStore';

interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
  mozCancelFullScreen?: () => void;
  msExitFullscreen?: () => void;
}

interface HTMLElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => void;
  mozRequestFullScreen?: () => void;
  msRequestFullscreen?: () => void;
}

const isFullscreenActive = (): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }
  const doc = document as DocumentWithFullscreen;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
};

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isFullscreenActive());

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(isFullscreenActive());
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    return installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => document, event: 'fullscreenchange', handler: () => handleFullscreenChange() },
      { target: () => document, event: 'webkitfullscreenchange', handler: () => handleFullscreenChange() },
      { target: () => document, event: 'mozfullscreenchange', handler: () => handleFullscreenChange() },
      { target: () => document, event: 'MSFullscreenChange', handler: () => handleFullscreenChange() },
    ]);
  }, [handleFullscreenChange]);

  const requestFullscreen = useCallback(async () => {
    try {
      const element = document.documentElement as HTMLElementWithFullscreen;

      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } catch (error) {
      logger.error('Failed to enter fullscreen', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }

      const doc = document as DocumentWithFullscreen;
      if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } catch (error) {
      logger.error('Failed to exit fullscreen', error);
    }
  }, []);

  const setFullscreen = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await requestFullscreen();
      } else {
        await exitFullscreen();
      }
    },
    [exitFullscreen, requestFullscreen]
  );

  return {
    isFullscreen,
    setFullscreen,
  };
};
