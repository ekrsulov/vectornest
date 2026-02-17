import { useCallback, useState } from 'react';

/**
 * Hook for managing keyframe selection and editing.
 */
export function useKeyframeEditor(
  keyframes: string[],
  onUpdate: (newKeyframes: string[]) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const updateKeyframe = useCallback(
    (index: number, newValue: string) => {
      const newKeyframes = [...keyframes];
      newKeyframes[index] = newValue;
      onUpdate(newKeyframes);
    },
    [keyframes, onUpdate]
  );

  const selectKeyframe = useCallback(
    (index: number) => {
      setSelectedIndex(Math.max(0, Math.min(index, keyframes.length - 1)));
    },
    [keyframes.length]
  );

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, keyframes.length - 1));
  }, [keyframes.length]);

  const selectPrev = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const addKeyframe = useCallback(
    (afterIndex: number, value?: string) => {
      const newKeyframes = [...keyframes];
      const insertIndex = afterIndex + 1;
      const defaultValue = value ?? keyframes[afterIndex] ?? '';
      newKeyframes.splice(insertIndex, 0, defaultValue);
      onUpdate(newKeyframes);
      setSelectedIndex(insertIndex);
    },
    [keyframes, onUpdate]
  );

  const removeKeyframe = useCallback(
    (index: number) => {
      if (keyframes.length <= 2) return; // Must keep at least 2 keyframes
      const newKeyframes = keyframes.filter((_, i) => i !== index);
      onUpdate(newKeyframes);
      setSelectedIndex(Math.min(index, newKeyframes.length - 1));
    },
    [keyframes, onUpdate]
  );

  return {
    selectedIndex,
    selectedValue: keyframes[selectedIndex] ?? '',
    selectKeyframe,
    selectNext,
    selectPrev,
    updateKeyframe,
    addKeyframe,
    removeKeyframe,
    isFirst: selectedIndex === 0,
    isLast: selectedIndex === keyframes.length - 1,
  };
}
