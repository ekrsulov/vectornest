import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  useColorModeValue,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';

// Tabs
import { TypographyTab } from './tabs/TypographyTab';
import { ColorsTab } from './tabs/ColorsTab';
import { PrimitivesTab } from './tabs/PrimitivesTab';
import { PanelsTab } from './tabs/PanelsTab';
import { EditorTab } from './tabs/EditorTab';
import { OverlayTab } from './tabs/OverlayTab';
import { ActionBarTab } from './tabs/ActionBarTab';

const DesignSystemPage: React.FC = () => {
  const bg = useColorModeValue('gray.50', '#020408'); // Darker background for dark mode to match app
  const tabSelectedColor = useColorModeValue('blue.600', 'blue.400');

  return (
    <Box bg={bg} minH="100vh" py={8}>
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="lg" mb={2}>Design System</Heading>
            <Text color="gray.500">
              Component library and style guide for Vectornest.
            </Text>
          </Box>

          <Tabs variant="enclosed" colorScheme="blue" isLazy>
            <TabList mb={4} overflowX="auto" overflowY="hidden" pb={1}>
              <Tab fontWeight="semibold" _selected={{ color: tabSelectedColor, borderColor: 'inherit', borderBottomColor: bg }}>Typography</Tab>
              <Tab fontWeight="semibold" _selected={{ color: tabSelectedColor, borderColor: 'inherit', borderBottomColor: bg }}>Colors</Tab>
              <Tab fontWeight="semibold" _selected={{ color: tabSelectedColor, borderColor: 'inherit', borderBottomColor: bg }}>Primitives</Tab>
              <Tab fontWeight="semibold" _selected={{ color: tabSelectedColor, borderColor: 'inherit', borderBottomColor: bg }}>Panels</Tab>
              <Tab fontWeight="semibold" _selected={{ color: tabSelectedColor, borderColor: 'inherit', borderBottomColor: bg }}>Editor</Tab>
              <Tab fontWeight="semibold" _selected={{ color: tabSelectedColor, borderColor: 'inherit', borderBottomColor: bg }}>Overlay</Tab>
              <Tab fontWeight="semibold" _selected={{ color: tabSelectedColor, borderColor: 'inherit', borderBottomColor: bg }}>Action Bar</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0}>
                <TypographyTab />
              </TabPanel>
              <TabPanel px={0}>
                <ColorsTab />
              </TabPanel>
              <TabPanel px={0}>
                <PrimitivesTab />
              </TabPanel>
              <TabPanel px={0}>
                <PanelsTab />
              </TabPanel>
              <TabPanel px={0}>
                <EditorTab />
              </TabPanel>
              <TabPanel px={0}>
                <OverlayTab />
              </TabPanel>
              <TabPanel px={0}>
                <ActionBarTab />
              </TabPanel>
            </TabPanels>
          </Tabs>

        </VStack>
      </Container>
    </Box>
  );
};

export default DesignSystemPage;
