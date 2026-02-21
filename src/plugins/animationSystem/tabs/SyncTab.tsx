import React, { useMemo, useState } from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { PanelTextInput } from '../../../ui/PanelTextInput';
import { CustomSelect } from '../../../ui/CustomSelect';
import { PanelStyledButton } from '../../../ui/PanelStyledButton';
import { PanelToggle } from '../../../ui/PanelToggle';
import { PanelActionButton } from '../../../ui/PanelActionButton';
import { SliderControl } from '../../../ui/SliderControl';
import { Trash2 } from 'lucide-react';
import type { AnimationPluginSlice, AnimationChainEntry, SVGAnimation } from '../types';
import { useCanvasStore } from '../../../store/canvasStore';

const computeTotalDurationSeconds = (anim?: SVGAnimation): number => {
  if (!anim) return 0;
  const durSec = parseFloat(String(anim.dur ?? '0').replace('s', '')) || 0;
  const repeatDur = anim.repeatDur ? parseFloat(String(anim.repeatDur).replace('s', '')) : null;
  const repeat = anim.repeatCount === 'indefinite'
    ? Infinity
    : typeof anim.repeatCount === 'number'
      ? anim.repeatCount
      : 1;
  if (repeatDur && repeatDur > 0) return repeatDur;
  if (repeat === Infinity) return Infinity;
  return durSec * repeat;
};

export const SyncTab: React.FC = () => {
  const animations = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animations ?? []);
  const animationSync = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).animationSync);
  const createAnimationChain = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).createAnimationChain);
  const removeAnimationChain = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).removeAnimationChain);
  const updateChainAnimationDelay = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).updateChainAnimationDelay);
  const updateChainAnimationTrigger = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).updateChainAnimationTrigger);
  const updateAnimationChain = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).updateAnimationChain);
  const processAnimationEvents = useCanvasStore((state) => (state as unknown as AnimationPluginSlice).processAnimationEvents);

  const [chainType, setChainType] = useState<'sequential' | 'parallel' | 'custom'>('sequential');
  const [selectedAnimations, setSelectedAnimations] = useState<string[]>([]);
  const [chainName, setChainName] = useState('Chain 1');

  const toggleSelection = (id: string) => {
    setSelectedAnimations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const nextChainName = useMemo(() => {
    if (animationSync?.chains?.length) {
      return `Chain ${animationSync.chains.length + 1}`;
    }
    return 'Chain 1';
  }, [animationSync?.chains?.length]);

  const handleCreateChain = () => {
    if (!selectedAnimations.length || !createAnimationChain) return;
    let entries: AnimationChainEntry[] = [];
    switch (chainType) {
      case 'parallel':
        entries = selectedAnimations.map((id) => ({
          animationId: id,
          delay: 0,
          trigger: 'start',
        }));
        break;
      case 'custom':
        entries = selectedAnimations.map((id) => ({
          animationId: id,
          delay: 0,
          trigger: 'start',
        }));
        break;
      case 'sequential':
      default:
        {
          let cursor = 0;
          entries = selectedAnimations.map((id, index) => {
            const anim = animations.find((a) => a.id === id);
            const dur = computeTotalDurationSeconds(anim);
            const safeDur = Number.isFinite(dur) ? dur : 0;
            const delay = index === 0 ? 0 : cursor + 0.5;
            cursor = delay + safeDur;
            return {
              animationId: id,
              delay,
              trigger: 'end',
              dependsOn: index === 0 ? undefined : selectedAnimations[index - 1],
            };
          });
        }
    }
    createAnimationChain(chainName || nextChainName, entries);
    setChainName(nextChainName);
    setSelectedAnimations([]);
    processAnimationEvents?.();
  };

  return (
    <VStack spacing={3} align="stretch">
      <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.300' }}>
        Create sequences or parallel groups to coordinate starts.
      </Text>

      <VStack spacing={0} align="stretch">
        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
          Chain Name
        </Text>
        <PanelTextInput
          value={chainName}
          onChange={(val) => setChainName(val)}
          placeholder="Chain name"
          width="100%"
        />
      </VStack>

      <CustomSelect
        value={chainType}
        onChange={(value) => setChainType(value as 'sequential' | 'parallel' | 'custom')}
        options={[
          { value: 'sequential', label: 'Sequential' },
          { value: 'parallel', label: 'Parallel' },
          { value: 'custom', label: 'Custom' },
        ]}
        size="sm"
      />

      <VStack spacing={1} align="stretch">
        <Text fontSize="12px" fontWeight="bold">
          Pick animations ({selectedAnimations.length})
        </Text>
        {animations.length === 0 ? (
          <Text fontSize="12px" color="gray.500" _dark={{ color: 'gray.400' }}>
            No animations yet
          </Text>
        ) : (
          animations.map((anim) => (
            <PanelToggle
              key={anim.id}
              isChecked={selectedAnimations.includes(anim.id)}
              onChange={() => toggleSelection(anim.id)}
            >
              <Text fontSize="12px" fontWeight="bold">
                {anim.type} • {anim.dur ?? '2s'}
              </Text>
              <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                {anim.attributeName ?? anim.transformType ?? 'motion'}
              </Text>
            </PanelToggle>
          ))
        )}
      </VStack>

      <PanelStyledButton
        onClick={handleCreateChain}
        isDisabled={!selectedAnimations.length}
      >
        Create Chain
      </PanelStyledButton>

      <VStack spacing={2} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="12px" fontWeight="bold" color="gray.700" _dark={{ color: 'gray.200' }}>
            Chains ({animationSync?.chains?.length ?? 0})
          </Text>
          <PanelStyledButton
            size="xs"
            onClick={() => processAnimationEvents?.()}
            isDisabled={!animationSync?.chains?.length}
          >
            Sync
          </PanelStyledButton>
        </HStack>
        {(animationSync?.chains ?? []).length === 0 ? (
          <Text fontSize="12px" color="gray.500" _dark={{ color: 'gray.400' }}>
            No chains yet
          </Text>
        ) : (
          animationSync?.chains?.map((chain) => (
            <VStack key={chain.id} spacing={2} align="stretch" borderWidth="1px" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }} borderRadius="md" p={2}>
              <HStack justify="space-between" align="center">
                <VStack spacing={0} align="stretch" flex="1">
                  <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                    Name
                  </Text>
                  <PanelTextInput
                    value={chain.name ?? chain.id.slice(-6)}
                    onChange={(val) => updateAnimationChain?.(chain.id, { name: val })}
                    width="100%"
                  />
                </VStack>
                <PanelActionButton
                  icon={Trash2}
                  iconSize={14}
                  label="Delete"
                  onClick={() => removeAnimationChain?.(chain.id)}
                />
              </HStack>
              {chain.animations.map((entry) => (
                <HStack key={`${chain.id}-${entry.animationId}`} spacing={1} align="center">
                  <Text fontSize="xs" flex="1">
                    {animations.find((a) => a.id === entry.animationId)?.attributeName ?? 'animation'}
                  </Text>
                  <SliderControl
                    label="Delay"
                    value={entry.delay}
                    min={0}
                    max={10}
                    step={0.1}
                    onChange={(value) => updateChainAnimationDelay?.(chain.id, entry.animationId, value)}
                    formatter={(v) => `${v.toFixed(1)}s`}
                    valueWidth="55px"
                    marginBottom="0"
                  />
                  <CustomSelect
                    value={entry.trigger}
                    onChange={(value) => updateChainAnimationTrigger?.(chain.id, entry.animationId, value as 'start' | 'end' | 'repeat')}
                    options={[
                      { value: 'start', label: 'Start' },
                      { value: 'end', label: 'After end' },
                      { value: 'repeat', label: 'On repeat' },
                    ]}
                    size="sm"
                  />
                </HStack>
              ))}
            </VStack>
          ))
        )}
      </VStack>
    </VStack>
  );
};
