import React from 'react';
import type { ReactNode } from 'react';
import {
    VStack,
    HStack,
    Text,
    SimpleGrid,
    Box,
    Divider,
    useColorModeValue,
} from '@chakra-ui/react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Panel } from './Panel';
import { PanelActionButton } from './PanelActionButton';
import { LibrarySectionHeader } from './LibrarySectionHeader';

export interface LibraryItem {
    id: string;
    name: string;
}

interface LibraryPanelHelperProps<T extends LibraryItem> {
    // Panel Configuration
    title: string;
    initialOpen?: boolean;

    // Data
    items: T[];
    selectedId: string | null;
    emptyMessage?: string;

    // Actions
    onSelect: (id: string | null) => void;
    onAdd?: () => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onItemDoubleClick?: (id: string) => void;

    // Renderers
    renderItem: (item: T, isSelected: boolean) => ReactNode;

    // Sections
    Editor?: ReactNode; // The "Details" or "Editor" section
    Actions?: ReactNode; // The "Actions" section (Apply, Clear, etc)
    ExtraContent?: ReactNode; // Extra sections like Presets

    // Optional ref that allows external components to scroll to the Details section
    detailsRef?: React.RefObject<HTMLDivElement | null>;
    // Optional key used to trigger a temporary visual flash on the Details area
    detailsFlashKey?: string | number | null;
    
    // New options for section customization
    /** Hide section dividers for more compact layout */
    hideDividers?: boolean;
    /** Custom title for Editor section */
    editorTitle?: string;
    /** Custom title for Actions section */
    actionsTitle?: string;
}

export function LibraryPanelHelper<T extends LibraryItem>(props: LibraryPanelHelperProps<T>) {
    const {
        title,
        initialOpen = false,
        items,
        selectedId,
        emptyMessage = "No items in library.",
        onSelect,
        onAdd,
        onDelete,
        onDuplicate,
        renderItem,
        Editor,
        Actions,
        ExtraContent,
        detailsRef,
        detailsFlashKey = null,
        hideDividers = false,
        editorTitle = 'Details',
        actionsTitle = 'Actions',
        onItemDoubleClick,
    } = props;

    const hasSelection = !!selectedId;

    const emptyColor = useColorModeValue('gray.500','gray.400');

    const handleDelete = () => {
        if (selectedId && onDelete) {
            onDelete(selectedId);
        }
    };

    const handleDuplicate = () => {
        if (selectedId && onDuplicate) {
            onDuplicate(selectedId);
        }
    };

    // Flash logic for Details area: when detailsFlashKey changes, briefly show a highlight
    const [isFlashing, setIsFlashing] = React.useState(false);
    const flashBg = useColorModeValue('yellow.100', 'yellow.700');
    React.useEffect(() => {
        if (detailsFlashKey == null) return;
        setIsFlashing(true);
        const t = setTimeout(() => setIsFlashing(false), 900);
        return () => clearTimeout(t);
    }, [detailsFlashKey]);

    const dividerColor = useColorModeValue('gray.200', 'gray.600');

    return (
        <Panel title={title} isCollapsible defaultOpen={initialOpen} panelKey={`sidebar:library:${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <VStack spacing={1.5} align="stretch">
                {/* Library Header Section */}
                <LibrarySectionHeader
                    title="Library"
                    compact
                    action={
                        <HStack spacing={0.5}>
                            {onAdd && (
                                <PanelActionButton
                                    label="Add item"
                                    icon={Plus}
                                    onClick={onAdd}
                                    tooltipDelay={100}
                                />
                            )}
                            {hasSelection && onDuplicate && (
                                <PanelActionButton
                                    label="Duplicate item"
                                    icon={Copy}
                                    onClick={handleDuplicate}
                                    tooltipDelay={100}
                                />
                            )}
                            {hasSelection && onDelete && (
                                <PanelActionButton
                                    label="Delete item"
                                    icon={Trash2}
                                    onClick={handleDelete}
                                    tooltipDelay={100}
                                />
                            )}
                        </HStack>
                    }
                />

                {/* List Section */}
                {items.length === 0 ? (
                    <Text fontSize="10px" color={emptyColor} lineHeight="1.3">
                        {emptyMessage}
                    </Text>
                ) : (
                    <SimpleGrid columns={2} gap={1}>
                        {items.map((item, idx) => {
                            const spanFull = items.length % 2 === 1 && idx === items.length - 1;
                            return (
                                <Box
                                    key={item.id}
                                    onClick={() => onSelect(item.id)}
                                    onDoubleClick={() => onItemDoubleClick?.(item.id)}
                                    cursor="pointer"
                                    w="100%"
                                    gridColumn={spanFull ? 'span 2' : 'auto'}
                                >
                                    {renderItem(item, item.id === selectedId)}
                                </Box>
                            );
                        })}
                    </SimpleGrid>
                )} 

                {/* Editor Section */}
                {hasSelection && Editor && (
                    <Box
                        ref={detailsRef as unknown as React.Ref<HTMLDivElement>}
                        bg={isFlashing ? flashBg : undefined}
                        transition="background-color 300ms ease"
                    >
                        {!hideDividers && <Divider borderColor={dividerColor} my={1} />}
                        <VStack spacing={1} align="stretch">
                            <LibrarySectionHeader title={editorTitle} compact />
                            {Editor}
                        </VStack>
                    </Box>
                )}

                {/* Actions Section */}
                {Actions && (
                    <Box>
                        {!hideDividers && <Divider borderColor={dividerColor} my={1} />}
                        <VStack spacing={1} align="stretch">
                            <LibrarySectionHeader title={actionsTitle} compact />
                            {Actions}
                        </VStack>
                    </Box>
                )}

                {/* Extra Content Section */}
                {ExtraContent && (
                    <Box>
                        {!hideDividers && <Divider borderColor={dividerColor} my={1} />}
                        {ExtraContent}
                    </Box>
                )}
            </VStack>
        </Panel>
    );
};
