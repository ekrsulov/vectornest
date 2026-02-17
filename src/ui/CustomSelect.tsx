import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Input,
} from '@chakra-ui/react';
import { ChevronDown, Search } from 'lucide-react';
import { useThemeColors } from '../hooks';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  size?: 'sm' | 'md';
  isDisabled?: boolean;
  flex?: string | number;
  searchable?: boolean;
}

const CustomSelectComponent: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  size = 'sm',
  isDisabled = false,
  flex,
  searchable = false,
}) => {
  const { input: { bg, menuBg, borderColor, textColor, hoverBg, selectedBg, selectedColor } } = useThemeColors();
  const selectedRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const fontSize = size === 'sm' ? '12px' : '14px';
  const padding = size === 'sm' ? '4px 8px' : '6px 12px';
  const height = size === 'sm' ? '20px' : '32px';

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : options;

  const handleOpen = () => {
    // Reset search when opening
    setSearchQuery('');

    // Clear any pending timers from a previous open
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // We disable autoSelect={false} on Menu so Chakra doesn't force scroll to the first item.
    // We then use multiple attempts to ensure the scroll happens after the menu is fully opened and focused.
    const scroll = () => {
      if (selectedRef.current) {
        selectedRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'center',
        });
      }
    };

    // Multiple attempts to beat any competing focus/rendering cycles
    timersRef.current.push(setTimeout(scroll, 50));
    timersRef.current.push(setTimeout(scroll, 150));
    timersRef.current.push(setTimeout(scroll, 300));

    // Focus search input if searchable
    if (searchable) {
      timersRef.current.push(setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100));
    }
  };

  // Clean up timers on unmount
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClose = () => {
    setSearchQuery('');
  };

  return (
    <Menu onOpen={handleOpen} onClose={handleClose} autoSelect={false}>
      <MenuButton
        as={Box}
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="full"
        color={textColor}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        display="flex"
        alignItems="center"
        flex={flex}
        fontSize={fontSize}
        h={height}
        minW="120px"
        opacity={isDisabled ? 0.5 : 1}
        p={padding}
        pointerEvents={isDisabled ? 'none' : 'auto'}
        position="relative"
        whiteSpace="nowrap"
        _hover={{ bg: hoverBg }}
        _focus={{ outline: 'none', ring: 2, ringColor: 'blue.500' }}
      >
        <Text>{displayText}</Text>
        <Box
          position="absolute"
          right="8px"
          top="50%"
          transform="translateY(-50%)"
        >
          <ChevronDown size={14} />
        </Box>
      </MenuButton>
      <MenuList
        bg={menuBg}
        borderColor={borderColor}
        borderRadius="md"
        boxShadow="lg"
        minW="120px"
        maxH="300px"
        overflowY="auto"
        zIndex={9999}
      >
        {searchable && (
          <Box px={2} py={2} borderBottom="1px solid" borderColor={borderColor}>
            <Box position="relative">
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search..."
                size="sm"
                fontSize={fontSize}
                bg={bg}
                borderColor={borderColor}
                color={textColor}
                pl="28px"
                _focus={{ outline: 'none', borderColor: 'blue.500' }}
                onKeyDown={(e) => {
                  // Prevent menu from closing on arrow key navigation
                  e.stopPropagation();
                }}
              />
              <Box
                position="absolute"
                left="8px"
                top="50%"
                transform="translateY(-50%)"
                pointerEvents="none"
                opacity={0.5}
              >
                <Search size={14} />
              </Box>
            </Box>
          </Box>
        )}
        {filteredOptions.length === 0 ? (
          <MenuItem isDisabled fontSize={fontSize} color={textColor} opacity={0.5}>
            No results found
          </MenuItem>
        ) : (
          filteredOptions.map(option => (
            <MenuItem
              key={option.value}
              ref={option.value === value ? selectedRef : null}
              bg={option.value === value ? selectedBg : 'transparent'}
              color={option.value === value ? selectedColor : textColor}
              fontSize={fontSize}
              onClick={() => onChange(option.value)}
              _hover={{ bg: hoverBg }}
            >
              {option.label}
            </MenuItem>
          ))
        )}
      </MenuList>
    </Menu>
  );
};

export const CustomSelect = React.memo(CustomSelectComponent);
CustomSelect.displayName = 'CustomSelect';
