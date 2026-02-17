import React, { useState } from 'react';
import { HStack, SimpleGrid, VStack, Text } from '@chakra-ui/react';
import { MousePointer2, Settings, Sparkles, Type } from 'lucide-react';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelActionButton } from '../../ui/PanelActionButton';
import { SidebarUtilityButton } from '../../ui/SidebarUtilityButton';
import { ToolbarIconButton } from '../../ui/ToolbarIconButton';
import { SectionHeader } from '../../ui/SectionHeader';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { NumberInput } from '../../ui/NumberInput';
import { CustomSelect } from '../../ui/CustomSelect';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { LinecapSelector } from '../../ui/LinecapSelector';
import { LinejoinSelector } from '../../ui/LinejoinSelector';
import { FillRuleSelector } from '../../ui/FillRuleSelector';

export const PrimitivesTab: React.FC = () => {
    const [switchVal, setSwitchVal] = useState(true);
    const [toggleVal, setToggleVal] = useState(false);
    const [sliderVal, setSliderVal] = useState(50);
    const [numVal, setNumVal] = useState(10);
    const [textVal, setTextVal] = useState('');
    const [joinedVal, setJoinedVal] = useState('left');

    return (
        <VStack align="stretch" spacing={8}>
            <SectionHeader title="Buttons" />
            <HStack spacing={4} wrap="wrap">
                <PanelStyledButton>Default Button</PanelStyledButton>
                <PanelStyledButton isActive>Active Button</PanelStyledButton>
                <PanelStyledButton size="sm">Small Button</PanelStyledButton>
                <PanelStyledButton size="xs">XS Button</PanelStyledButton>
            </HStack>
            <HStack spacing={4} wrap="wrap">
                <PanelActionButton label="Action" icon={Sparkles} onClick={() => { }} />
                <PanelActionButton label="Active" icon={Sparkles} onClick={() => { }} />
                <SidebarUtilityButton icon={Settings} label="Settings" onClick={() => { }} />
                <ToolbarIconButton icon={MousePointer2} label="Select" onClick={() => { }} />
                <ToolbarIconButton icon={MousePointer2} label="Select Active" isActive onClick={() => { }} />
            </HStack>

            <SectionHeader title="Inputs & Controls" />
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>
                <VStack align="stretch" spacing={4}>
                    <PanelTextInput
                        value={textVal}
                        onChange={setTextVal}
                        placeholder="Text Input"
                        leftIcon={<Type size={14} />}
                    />
                    <NumberInput
                        label="Number"
                        value={numVal}
                        onChange={setNumVal}
                    />
                    <CustomSelect
                        value={joinedVal}
                        onChange={setJoinedVal}
                        options={[
                            { value: 'left', label: 'Left align' },
                            { value: 'center', label: 'Center align' },
                            { value: 'right', label: 'Right align' },
                        ]}
                    />
                </VStack>
                <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                        <Text fontSize="sm">Switch Label</Text>
                        <PanelSwitch
                            isChecked={switchVal}
                            onChange={(e) => setSwitchVal(e.target.checked)}
                        />
                    </HStack>
                    <PanelToggle
                        isChecked={toggleVal}
                        onChange={() => setToggleVal(!toggleVal)}
                    >
                        Toggle Button
                    </PanelToggle>
                    <SliderControl
                        label="Slider"
                        value={sliderVal}
                        min={0}
                        max={100}
                        onChange={setSliderVal}
                    />
                    <JoinedButtonGroup
                        value={joinedVal}
                        onChange={setJoinedVal}
                        options={[
                            { value: 'left', label: 'Left' },
                            { value: 'center', label: 'Center' },
                            { value: 'right', label: 'Right' },
                        ]}
                    />
                </VStack>
            </SimpleGrid>


            <SectionHeader title="Shape Tools" />
            <HStack spacing={4} wrap="wrap">
                <LinecapSelector value="butt" onChange={() => { }} />
                <LinejoinSelector value="miter" onChange={() => { }} />
                <FillRuleSelector value="nonzero" onChange={() => { }} />
            </HStack>
        </VStack>
    );
};
