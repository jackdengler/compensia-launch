import {
  Box, Button, VStack, IconButton, Flex, HStack, Input, Text,
  Menu, MenuButton, MenuList, MenuItem, Checkbox, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure, useToast, Tag,
  TagLabel, TagCloseButton, Image, Heading
} from '@chakra-ui/react';
import { AddIcon, TimeIcon, RepeatIcon } from '@chakra-ui/icons';
import { useEffect, useState, useRef, useCallback } from 'react';
import CalendarView from './CalendarView';
import WeeklyView from './WeeklyView';
import MeetingBoard from './MeetingBoardBase';
import GlobalSearch from './GlobalSearch';
import SettingsDrawer from './SettingsDrawer';
import NotesDrawer from './NotesDrawer';
import TaskBuckets from './TaskBuckets';
import { SettingsProvider } from './SettingsProvider';
import * as chrono from 'chrono-node';
import { Users } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const badgeOptions = {
  sector: ['Tech', 'Life Sci', 'Other'],
  status: ['Active', 'On Hold', 'Other'],
  type: ['Public', 'Private'],
};

const badgeColors = {
  sector: ['purple', 'cyan', 'gray'],
  status: ['green', 'orange', 'gray'],
  type: ['blue', 'red'],
};

const defaultStatus = {
  sector: 0,
  status: 0,
  type: 0,
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function getSaturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function boostColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const sat = getSaturation(r, g, b);
  
  // If it's too close to grayscale, use vibrant defaults
  if (sat < 0.15) {
    if (r === Math.max(r, g, b)) return '#FF5252'; // Bolder red
    if (g === Math.max(r, g, b)) return '#69F0AE'; // Bolder green
    if (b === Math.max(r, g, b)) return '#448AFF'; // Bolder blue
    return '#448AFF'; // Default to bold blue
  }

  // Boost saturation and brightness
  const avgLightness = (r + g + b) / 3;
  const boost = 1.3; // Slightly more boost for bolder colors

  const newR = Math.round(r + (r - avgLightness) * boost);
  const newG = Math.round(g + (g - avgLightness) * boost);
  const newB = Math.round(b + (b - avgLightness) * boost);

  return rgbToHex(
    Math.min(255, Math.max(0, newR)),
    Math.min(255, Math.max(0, newG)),
    Math.min(255, Math.max(0, newB))
  );
}

function getVeryLightVariant(hex, factor = 0.95) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  
  const { r, g, b } = rgb;
  const sat = getSaturation(r, g, b);
  
  // If the color is too gray, use a default color
  if (sat < 0.15) {
    hex = boostColor(hex);
  }
  
  const boostedRgb = hexToRgb(hex);
  if (!boostedRgb) return '#ffffff';
  
  // Create a bolder but still light variant
  const lightnessFactor = 0.75; // Lower number = bolder result (was 0.92)
  const saturationFactor = 0.85; // Higher number = more saturated (was 0.7)
  
  const newR = Math.round(255 - (255 - boostedRgb.r) * saturationFactor * (1 - lightnessFactor));
  const newG = Math.round(255 - (255 - boostedRgb.g) * saturationFactor * (1 - lightnessFactor));
  const newB = Math.round(255 - (255 - boostedRgb.b) * saturationFactor * (1 - lightnessFactor));
  
  return rgbToHex(newR, newG, newB);
}

function generateId() {
  return 'client-' + Math.random().toString(36).substring(2, 10);
}

function ClientManagerInner({ username }) {
  const [clientList, setClientList] = useState({});
  const [activeClientId, setActiveClientId] = useState('__calendar__');
  const [viewingPast, setViewingPast] = useState(false);
  const [sharedChoices, setSharedChoices] = useState([]);
  const [selectedSharedIds, setSelectedSharedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [tempName, setTempName] = useState('');
  const [currentColors, setCurrentColors] = useState({
    baseColor: '#4A5568',
    headerColor: '#F7FAFC',
    sidebarColor: '#EDF2F7'
  });
  
  const imgRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const {
    isOpen: isSharedModalOpen,
    onOpen: openSharedModal,
    onClose: closeSharedModal,
  } = useDisclosure();
  const toast = useToast();

  const saveToServer = async (combinedData) => {
    const personal = {};
    const shared = {};

    for (const [id, client] of Object.entries(combinedData)) {
      if (client.shared) shared[id] = client;
      else personal[id] = client;
    }

    setClientList(combinedData);

    await fetch(`${BACKEND_URL}/api/data/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personal),
    });

    await fetch(`${BACKEND_URL}/api/shared`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shared),
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const personalRes = await fetch(`${BACKEND_URL}/api/data/${username}`);
        const personal = await personalRes.json();

        setClientList(personal);

        const storedActive = localStorage.getItem(`LastActiveClientId_${username}`);
        if (storedActive && personal[storedActive]) {
          setActiveClientId(storedActive);
        } else {
          const ids = Object.keys(personal);
          if (ids.length > 0) setActiveClientId(ids[0]);
        }
      } catch (err) {
        console.error('Failed to load data from server:', err);
        setClientList({});
      }
    };

    fetchData();
  }, [username]);

  useEffect(() => {
    if (activeClientId) {
      localStorage.setItem(`LastActiveClientId_${username}`, activeClientId);
    }
  }, [activeClientId]);

  const extractColor = useCallback((img) => {
    if (!img || !img.complete || img.width === 0 || img.height === 0) {
      return null;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    try {
      canvas.width = Math.min(img.width, 100);
      canvas.height = Math.min(img.height, 100);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, count = 0;
      let maxSat = 0;
      let mostSaturatedColor = null;
      let brightestSaturatedColor = null;
      let maxBrightness = 0;

      // Sample pixels and find most saturated bright color
      for (let i = 0; i < imageData.length; i += 16) {
        const pixelR = imageData[i];
        const pixelG = imageData[i + 1];
        const pixelB = imageData[i + 2];
        const sat = getSaturation(pixelR, pixelG, pixelB);
        const brightness = (pixelR + pixelG + pixelB) / 3;
        
        if (sat > 0.2 && brightness > maxBrightness && brightness > 40) { // Lower brightness threshold
          maxBrightness = brightness;
          brightestSaturatedColor = { r: pixelR, g: pixelG, b: pixelB };
        }
        
        if (sat > maxSat) {
          maxSat = sat;
          mostSaturatedColor = { r: pixelR, g: pixelG, b: pixelB };
        }

        r += pixelR;
        g += pixelG;
        b += pixelB;
        count++;
      }

      if (count === 0) return null;

      // Prefer bright saturated colors, fall back to most saturated
      let baseColor;
      if (brightestSaturatedColor) {
        baseColor = rgbToHex(
          brightestSaturatedColor.r,
          brightestSaturatedColor.g,
          brightestSaturatedColor.b
        );
      } else if (mostSaturatedColor && maxSat > 0.2) {
        baseColor = rgbToHex(
          mostSaturatedColor.r,
          mostSaturatedColor.g,
          mostSaturatedColor.b
        );
      } else {
        baseColor = rgbToHex(
          Math.round(r / count),
          Math.round(g / count),
          Math.round(b / count)
        );
      }

      baseColor = boostColor(baseColor);

      return {
        baseColor,
        headerColor: getVeryLightVariant(baseColor, 0.85), // Bolder header
        sidebarColor: getVeryLightVariant(baseColor, 0.82) // Even bolder sidebar
      };
    } catch (err) {
      console.error('Error in color extraction:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const client = clientList[activeClientId];
    if (!client?.name || ['__calendar__', '__weekly__'].includes(activeClientId)) {
      setLogoUrl('');
      setCurrentColors({
        baseColor: '#4A5568',
        headerColor: '#F7FAFC',
        sidebarColor: '#EDF2F7'
      });
      setTempName('');
      return;
    }

    // Set name and colors immediately
    setTempName(client.name);
    setCurrentColors({
      baseColor: client.baseColor || '#4A5568',
      headerColor: client.headerColor || '#F7FAFC',
      sidebarColor: client.sidebarColor || '#EDF2F7'
    });

    // Handle logo loading
    const domain = client.name.trim().replace(/\s+/g, '').toLowerCase();
    const url = `https://logo.clearbit.com/${domain}.com`;
    let img;
    
    if (client.logo === url) {
      setLogoUrl(url);
      setLogoError(false);
    } else {
      setLogoUrl('');
      setLogoError(false);
      
      img = new window.Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        setLogoUrl(url);
        setLogoError(false);
        
        const colors = extractColor(img);
        if (colors && !client.headerColor) {
          setCurrentColors(colors);
          updateClientData(activeClientId, {
            ...client,
            logo: url,
            ...colors
          });
        }
      };
      
      img.onerror = () => {
        setLogoError(true);
        if (client?.logo) {
          updateClientData(activeClientId, {
            ...client,
            logo: ''
          });
        }
      };
      
      img.src = url;
    }

    return () => {
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [activeClientId, clientList[activeClientId]?.name, extractColor]);

  const addClient = () => {
    const newId = generateId();
    const newClient = {
      name: 'Unnamed Client',
      logo: '',
      baseColor: '#4A5568',
      headerColor: '#F7FAFC',
      sidebarColor: '#EDF2F7',
      team: [],
      status: {},
      notes: '',
      shared: false,
      owner: username,
      meetings: [{ id: 'adhoc', isAdHoc: true, name: '', date: '', deliverables: [] }],
      pastMeetings: [{ id: 'adhoc_past', isAdHoc: true, name: '', date: '', deliverables: [] }],
    };
    const updated = { ...clientList, [newId]: newClient };
    saveToServer(updated);
    setActiveClientId(newId);
  };

  const openSharedClientModal = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/shared`);
      const shared = await res.json();

      const existingIds = new Set(Object.keys(clientList));
      const newShared = Object.entries(shared)
        .filter(([id]) => !existingIds.has(id))
        .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || ''));

      setSharedChoices(newShared);
      setSelectedSharedIds([]);
      setSearchTerm('');
      openSharedModal();
    } catch (err) {
      console.error('Failed to fetch shared clients', err);
      toast({
        title: 'Error',
        description: 'Unable to fetch shared clients.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleToggleSharedClient = (id) => {
    setSelectedSharedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddSelectedSharedClients = () => {
    const selectedEntries = sharedChoices.filter(([id]) => selectedSharedIds.includes(id));
    const updated = { ...clientList };
    selectedEntries.forEach(([id, client]) => {
      updated[id] = client;
    });
    saveToServer(updated);
    if (selectedEntries.length === 1) setActiveClientId(selectedEntries[0][0]);
    closeSharedModal();
  };

  const deleteClient = (id) => {
    const updated = { ...clientList };
    delete updated[id];
    saveToServer(updated);
    const fallback = Object.keys(updated)[0] || '__calendar__';
    setActiveClientId(fallback);
  };

  const updateClientData = (id, data) => {
    const updated = { ...clientList, [id]: data };
    saveToServer(updated);
  };

  const handleClientChange = (id, updatedClient) => {
    updateClientData(id, updatedClient);
  };

  const handleNameChange = (e) => {
    setTempName(e.target.value);
  };

  const saveName = () => {
    const final = tempName.trim();
    if (final && final !== clientList[activeClientId]?.name) {
      updateClientData(activeClientId, { 
        ...clientList[activeClientId], 
        name: final 
      });
    }
    setEditingName(false);
  };

  const addTeamMember = () => {
    const client = clientList[activeClientId];
    if (!client) return;
    
    const team = Array.isArray(client.team) ? client.team : [];
    updateClientData(activeClientId, { 
      ...client, 
      team: [...team, ''] 
    });
    setEditingMemberIndex(team.length);
  };

  const updateTeamMember = (index, value) => {
    const client = clientList[activeClientId];
    if (!client) return;
    
    const team = Array.isArray(client.team) ? [...client.team] : [];
    team[index] = value;
    updateClientData(activeClientId, { ...client, team });
  };

  const removeTeamMember = (index) => {
    const client = clientList[activeClientId];
    if (!client) return;
    
    const team = Array.isArray(client.team) ? client.team : [];
    const updated = team.filter((_, i) => i !== index);
    updateClientData(activeClientId, { ...client, team: updated });
  };

  const cycleBadge = (key) => {
    const client = clientList[activeClientId];
    if (!client) return;

    const status = { ...defaultStatus, ...(client.status || {}) };
    const next = (status[key] + 1) % badgeOptions[key].length;
    updateClientData(activeClientId, {
      ...client,
      status: { ...status, [key]: next },
    });
  };

  const sortedClientIds = Object.keys(clientList).sort((a, b) => {
    const nameA = (clientList[a]?.name || '').toLowerCase();
    const nameB = (clientList[b]?.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const filteredShared = sharedChoices.filter(([_, client]) =>
    (client.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeClient = clientList[activeClientId];
  const status = activeClient ? { ...defaultStatus, ...(activeClient.status || {}) } : defaultStatus;
  const team = Array.isArray(activeClient?.team) ? activeClient.team : [];

  return (
    <Box bg="white" minH="100vh">
      <Box 
        position="fixed" 
        left="0" 
        top="0" 
        bottom="0" 
        w="220px" 
        bg="gray.100"
        borderRight="1px solid"
        borderColor="gray.200"
        px={3} 
        py={4} 
        overflowY="auto" 
        zIndex="300"
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '2px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <VStack spacing={1.5} align="stretch">
          <Button 
            size="sm" 
            colorScheme={activeClientId === '__calendar__' ? 'gray' : 'gray'} 
            variant={activeClientId === '__calendar__' ? 'solid' : 'ghost'}
            onClick={() => setActiveClientId('__calendar__')}
            borderRadius="md"
            fontWeight="medium"
            color={activeClientId === '__calendar__' ? 'black' : 'gray.600'}
            bg={activeClientId === '__calendar__' ? 'white' : 'transparent'}
            _hover={{
              bg: activeClientId === '__calendar__' ? 'white' : 'gray.200',
              color: 'gray.900',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            transition="all 0.2s"
            boxShadow={activeClientId === '__calendar__' ? 'sm' : 'none'}
            leftIcon={<span role="img" aria-label="calendar">📅</span>}
          >
            Monthly
          </Button>
          <Button 
            size="sm" 
            colorScheme={activeClientId === '__weekly__' ? 'gray' : 'gray'} 
            variant={activeClientId === '__weekly__' ? 'solid' : 'ghost'}
            onClick={() => setActiveClientId('__weekly__')}
            borderRadius="md"
            fontWeight="medium"
            color={activeClientId === '__weekly__' ? 'black' : 'gray.600'}
            bg={activeClientId === '__weekly__' ? 'white' : 'transparent'}
            _hover={{
              bg: activeClientId === '__weekly__' ? 'white' : 'gray.200',
              color: 'gray.900',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            transition="all 0.2s"
            boxShadow={activeClientId === '__weekly__' ? 'sm' : 'none'}
            leftIcon={<span role="img" aria-label="weekly">📆</span>}
          >
            Weekly
          </Button>
          <Button 
            size="sm" 
            colorScheme={activeClientId === '__tasks__' ? 'gray' : 'gray'} 
            variant={activeClientId === '__tasks__' ? 'solid' : 'ghost'}
            onClick={() => setActiveClientId('__tasks__')}
            borderRadius="md"
            fontWeight="medium"
            color={activeClientId === '__tasks__' ? 'black' : 'gray.600'}
            bg={activeClientId === '__tasks__' ? 'white' : 'transparent'}
            _hover={{
              bg: activeClientId === '__tasks__' ? 'white' : 'gray.200',
              color: 'gray.900',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            transition="all 0.2s"
            boxShadow={activeClientId === '__tasks__' ? 'sm' : 'none'}
            leftIcon={<span role="img" aria-label="tasks">📋</span>}
          >
            Tasks
          </Button>

          <Box borderBottom="1px solid" borderColor="gray.200" my={2} opacity={0.5} />

          {sortedClientIds.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={activeClientId === id ? 'solid' : 'ghost'}
              onClick={() => setActiveClientId(id)}
              textAlign="center"
              justifyContent="center"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              borderRadius="md"
              fontWeight="medium"
              color={activeClientId === id ? 'black' : 'gray.600'}
              bg={activeClientId === id ? (clientList[id]?.sidebarColor || 'white') : 'transparent'}
              _hover={{
                bg: activeClientId === id ? (clientList[id]?.sidebarColor || 'white') : 'gray.200',
                color: 'gray.900',
              }}
              _active={{
                transform: 'none'
              }}
              boxShadow={activeClientId === id ? 'sm' : 'none'}
            >
              <HStack spacing={2} width="auto">
                {clientList[id]?.shared && (
                  <Users size={14} color={activeClientId === id ? 'black' : '#666666'} />
                )}
                <Text 
                  fontSize="sm"
                  isTruncated
                >
                  {clientList[id]?.name?.trim() || 'Unnamed Client'}
                </Text>
              </HStack>
            </Button>
          ))}

          <Menu>
            <MenuButton
              as={IconButton}
              icon={<AddIcon />}
              size="sm"
              variant="ghost"
              colorScheme="gray"
              alignSelf="center"
              mt={2}
              borderRadius="md"
              color="gray.600"
              _hover={{
                bg: 'gray.200',
                color: 'gray.900',
              }}
              _active={{
                transform: 'translateY(0)',
              }}
              transition="all 0.2s"
            />
            <MenuList 
              zIndex={999}
              p={1}
              borderRadius="md"
              boxShadow="lg"
              border="1px solid"
              borderColor="gray.100"
            >
              <MenuItem 
                onClick={addClient}
                borderRadius="sm"
                _hover={{ bg: 'gray.50' }}
                p={2}
              >
                <HStack spacing={2}>
                  <span role="img" aria-label="new">🆕</span>
                  <Text fontSize="sm">Add New Client</Text>
                </HStack>
              </MenuItem>
              <MenuItem 
                onClick={openSharedClientModal}
                borderRadius="sm"
                _hover={{ bg: 'gray.50' }}
                p={2}
              >
                <HStack spacing={2}>
                  <span role="img" aria-label="shared">🏢</span>
                  <Text fontSize="sm">Add From Shared Clients</Text>
                </HStack>
              </MenuItem>
            </MenuList>
          </Menu>
        </VStack>
      </Box>

      <Box pl="220px">
        <Box 
          position="fixed" 
          top="0" 
          left="220px" 
          right="0" 
          height="48px" 
          bg="gray.100"
          borderBottom="1px solid"
          borderColor="gray.200"
          px={4}
          zIndex="200"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <HStack spacing={3} flex={1} maxW="800px">
            <QuickTaskBar clientList={clientList} onClientChange={handleClientChange} />
            <Box flex={1} position="relative">
              <GlobalSearch 
                clientList={clientList}
                inputProps={{
                  size: "sm",
                  bg: "white",
                  borderRadius: "md",
                  borderColor: "gray.200",
                  color: "gray.900",
                  _hover: { borderColor: 'gray.300' },
                  _focus: {
                    borderColor: 'gray.400',
                    boxShadow: 'none'
                  },
                  _placeholder: { color: 'gray.400' },
                  fontSize: "sm",
                  height: "32px",
                  pl: 3,
                  pr: 3,
                }}
              />
            </Box>
          </HStack>

          <HStack spacing={2}>
            {!['__calendar__', '__weekly__'].includes(activeClientId) && (
              <Button 
                size="sm" 
                variant="ghost" 
                leftIcon={viewingPast ? <RepeatIcon /> : <TimeIcon />}
                color="gray.600"
                fontSize="sm"
                fontWeight="medium"
                onClick={() => setViewingPast(v => !v)}
                _hover={{ 
                  bg: 'gray.200',
                  color: 'gray.900'
                }}
              >
                {viewingPast ? 'View Current' : 'View Past'}
              </Button>
            )}
            {activeClientId && !['__calendar__', '__weekly__'].includes(activeClientId) && (
              <NotesDrawer
                notes={activeClient?.notes || ''}
                onChange={(val) => updateClientData(activeClientId, {
                  ...activeClient,
                  notes: val,
                })}
              />
            )}
            <SettingsDrawer
              username={username}
              clientId={activeClientId}
              clientData={activeClient}
              onClientChange={handleClientChange}
              onDeleteClient={deleteClient}
            />
          </HStack>
        </Box>

        {activeClient && !['__calendar__', '__weekly__'].includes(activeClientId) && (
          <Box 
            position="fixed" 
            top="48px" 
            left="220px" 
            right="0" 
            height="56px" 
            bg={currentColors.headerColor}
            px={4}
            zIndex="200"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            borderBottom="1px solid rgba(0, 0, 0, 0.06)"
          >
            <HStack spacing={0} align="center" width="100%">
              <Box 
                pr={4} 
                minW="280px"
                borderRight="1px solid"
                borderColor="gray.200"
                h="36px"
                display="flex"
                alignItems="center"
              >
                <HStack spacing={3}>
                  {logoUrl && !logoError && (
                    <Image
                      ref={imgRef}
                      src={logoUrl}
                      alt="Client Logo"
                      height="32px"
                      width="auto"
                      objectFit="contain"
                      fallbackSrc=""
                      onError={() => setLogoError(true)}
                      crossOrigin="anonymous"
                      style={{ filter: 'grayscale(0.2)' }}
                    />
                  )}
                  <Box
                    onClick={() => !editingName && setEditingName(true)}
                    cursor="pointer"
                    position="relative"
                  >
                    {editingName ? (
                      <Input
                        fontSize="xl"
                        fontWeight="semibold"
                        value={tempName}
                        onChange={handleNameChange}
                        onBlur={saveName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveName();
                          }
                        }}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        variant="flushed"
                        textAlign="left"
                        color="gray.900"
                        _placeholder={{ color: 'gray.400' }}
                        letterSpacing="-0.02em"
                        borderColor="blue.400"
                        _focus={{
                          borderColor: 'blue.500',
                          boxShadow: '0 1px 0 0 var(--chakra-colors-blue-500)'
                        }}
                        px={2}
                        mx={-2}
                      />
                    ) : (
                      <Heading
                        as="h1"
                        fontSize="xl"
                        fontWeight="semibold"
                        color="gray.900"
                        letterSpacing="-0.02em"
                        display="flex"
                        alignItems="center"
                        position="relative"
                      >
                        {activeClient.name?.trim() || 'Unnamed Client'}
                      </Heading>
            )}
                  </Box>
          </HStack>
      </Box>

              {/* Section 2: Industry & Status Info */}
              <Box 
                px={4} 
                minW="200px"
                borderRight="1px solid"
                borderColor="gray.200"
                h="36px"
                display="flex"
                alignItems="center"
              >
                <HStack spacing={2}>
                  {Object.entries(badgeOptions).map(([key, options]) => (
                    <Tag
                      key={key}
                      size="sm"
                      variant="subtle"
                      colorScheme={badgeColors[key][status[key]]}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="medium"
                      px={2}
                      py={0.5}
                      cursor="pointer"
                      onClick={() => cycleBadge(key)}
                      opacity={0.8}
                      _hover={{ opacity: 1 }}
                      transition="all 0.2s"
                    >
                      {options[status[key]]}
                    </Tag>
                  ))}
                </HStack>
              </Box>

              {/* Section 3: Team Members */}
              <Box 
                px={4} 
                minW="240px"
                borderRight="1px solid"
                borderColor="gray.200"
                h="36px"
                display="flex"
                alignItems="center"
              >
                <HStack spacing={1}>
                  {team.map((member, i) => (
                    <Tag
                      key={i}
                      size="sm"
                      borderRadius="full"
                      variant="subtle"
                      colorScheme="gray"
                      fontSize="xs"
                      fontWeight="medium"
                      px={2}
                      py={0.5}
                      opacity={0.8}
                      _hover={{ opacity: 1 }}
                      transition="all 0.2s"
                    >
                      <TagLabel>
                        {editingMemberIndex === i ? (
                          <Input
                            size="xs"
                            variant="unstyled"
                            value={member}
                            onChange={(e) => updateTeamMember(i, e.target.value)}
                            onBlur={() => setEditingMemberIndex(null)}
                            autoFocus
                            textAlign="center"
                            width="auto"
                            color="gray.900"
                          />
                        ) : (
                          <Box onClick={() => setEditingMemberIndex(i)}>
                            {member}
                          </Box>
                        )}
                      </TagLabel>
                      <TagCloseButton 
                        opacity={0.5} 
                        _hover={{ opacity: 1 }}
                        transition="all 0.2s"
                        onClick={() => removeTeamMember(i)} 
                      />
                    </Tag>
                  ))}
                  <IconButton
                    icon={<AddIcon />}
                    size="xs"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={addTeamMember}
                    aria-label="Add team member"
                    opacity={0.6}
                    _hover={{ 
                      opacity: 1,
                      bg: 'gray.100'
                    }}
                    transition="all 0.2s"
                  />
                </HStack>
              </Box>

              {/* Section 4: Action Buttons */}
              <Box 
                pl={4} 
                flex={1}
                h="36px"
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
              >
                <HStack spacing={2}>
                  <Button 
                    size="sm" 
                    variant="solid"
                    bg="white"
                    color="gray.700"
                    leftIcon={<AddIcon />}
                    fontSize="sm"
                    fontWeight="medium"
                    minW="120px"
                    border="1px solid"
                    borderColor="gray.200"
                    backdropFilter="blur(8px)"
                    _hover={{ 
                      bg: 'gray.50',
                      borderColor: 'gray.300',
                      transform: 'translateY(-1px)',
                      boxShadow: 'sm'
                    }}
                    _active={{
                      bg: 'gray.100',
                      transform: 'translateY(0)',
                      boxShadow: 'none'
                    }}
                    transition="all 0.2s"
                    onClick={() => {
                      const client = clientList[activeClientId];
                      if (!client) return;
                      const listKey = 'meetings';
                      const targetId = 'adhoc';
                      const updatedList = client[listKey].map((m) =>
                        m.id === targetId
                          ? { ...m, deliverables: [...m.deliverables, { id: Date.now().toString(), name: '', tasks: [] }] }
                          : m
                      );
                      updateClientData(activeClientId, { ...client, [listKey]: updatedList });
                    }}
                  >
                    Add Ad-hoc
                  </Button>
                  <Button 
                    size="sm" 
                    variant="solid"
                    bg="white"
                    color="gray.700"
                    leftIcon={<AddIcon />}
                    fontSize="sm"
                    fontWeight="medium"
                    minW="120px"
                    border="1px solid"
                    borderColor="gray.200"
                    backdropFilter="blur(8px)"
                    _hover={{ 
                      bg: 'gray.50',
                      borderColor: 'gray.300',
                      transform: 'translateY(-1px)',
                      boxShadow: 'sm'
                    }}
                    _active={{
                      bg: 'gray.100',
                      transform: 'translateY(0)',
                      boxShadow: 'none'
                    }}
                    transition="all 0.2s"
                    onClick={() => {
                      const client = clientList[activeClientId];
                      if (!client) return;
                      const dateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                      const newMeeting = { id: `${Date.now()}`, date: dateStr, name: '', isAdHoc: false, deliverables: [] };
                      updateClientData(activeClientId, { 
                        ...client, 
                        meetings: [...client.meetings, newMeeting] 
                      });
                    }}
                  >
                    New Meeting
                  </Button>
                </HStack>
              </Box>
            </HStack>
          </Box>
        )}

        <Box 
          pt={activeClient && !['__calendar__', '__weekly__'].includes(activeClientId) ? "124px" : "68px"}
          px={6} 
          pb={8}
          bg="white"
        >
        {activeClientId === '__calendar__' && (
          <CalendarView clientList={clientList} onClientChange={handleClientChange} />
        )}
        {activeClientId === '__weekly__' && (
          <WeeklyView clientList={clientList} onClientChange={handleClientChange} />
        )}
          {activeClientId === '__tasks__' && (
            <TaskBuckets clientList={clientList} onClientChange={handleClientChange} />
        )}
        {sortedClientIds.map((id) =>
          activeClientId === id ? (
            <MeetingBoard
              key={id}
              clientId={id}
              clientData={clientList[id]}
              onClientChange={(data) => updateClientData(id, data)}
                viewingPast={viewingPast}
            />
          ) : null
        )}
        </Box>
      </Box>

      <Modal isOpen={isSharedModalOpen} onClose={closeSharedModal} size="md">
        <ModalOverlay bg="rgba(0, 0, 0, 0.2)" backdropFilter="blur(5px)" />
        <ModalContent 
          borderRadius="lg" 
          boxShadow="xl"
          overflow="hidden"
        >
          <ModalHeader 
            fontSize="lg" 
            fontWeight="medium"
            pb={2}
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            Add Shared Clients
          </ModalHeader>
          <ModalCloseButton top={3} />
          <ModalBody pt={4}>
            <Input
              placeholder="Search clients..."
              mb={4}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="md"
              borderRadius="md"
              borderColor="gray.200"
              _focus={{ 
                borderColor: 'gray.400',
                boxShadow: 'none'
              }}
              fontSize="sm"
            />
            {filteredShared.length === 0 ? (
              <Text 
                fontSize="sm" 
                color="gray.500" 
                textAlign="center" 
                py={8}
              >
                No available clients.
              </Text>
            ) : (
              <VStack 
                align="start" 
                spacing={1} 
                maxH="300px" 
                overflowY="auto"
                css={{
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: '2px',
                  },
                }}
              >
                {filteredShared.map(([id, client]) => (
                  <Checkbox
                    key={id}
                    isChecked={selectedSharedIds.includes(id)}
                    onChange={() => handleToggleSharedClient(id)}
                    width="100%"
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: 'gray.50' }}
                    spacing={3}
                    size="sm"
                  >
                    <Text fontSize="sm">
                    {client.name || 'Unnamed Client'}
                    </Text>
                  </Checkbox>
                ))}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter 
            borderTop="1px solid"
            borderColor="gray.100"
            bg="gray.50"
          >
            <Button 
              onClick={handleAddSelectedSharedClients} 
              isDisabled={selectedSharedIds.length === 0}
              size="sm"
              width="full"
              bg="black"
              color="white"
              _hover={{ bg: 'gray.800' }}
              fontWeight="medium"
            >
              Add Selected
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function QuickTaskBar({ clientList, onClientChange }) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [parsed, setParsed] = useState(null);

  const parseInput = (str) => {
    const lower = str.toLowerCase();
    const clientMatch = Object.entries(clientList).find(([id, c]) =>
      lower.includes(c.name?.toLowerCase())
    );
    if (!clientMatch) return null;

    const [clientId, client] = clientMatch;
    const chronoResult = chrono.parseDate(str);
    const due = chronoResult
      ? `${(chronoResult.getMonth() + 1).toString().padStart(2, '0')}/${chronoResult.getDate().toString().padStart(2, '0')}`
      : '';

    const assigneeMatch = str.match(/\b(?:to|for)\s+([A-Z][a-z]+)/);
    const assignee = assigneeMatch ? assigneeMatch[1] : '';

    const task = str
      .replace(new RegExp(client.name, 'i'), '')
      .replace(assigneeMatch?.[0], '')
      .replace(/\bdue\b/i, '')
      .replace(/\bnext\b\s+\w+/gi, '')
      .replace(/\btomorrow\b/gi, '')
      .replace(/\btoday\b/gi, '')
      .replace(/\bthis\b\s+\w+/gi, '')
      .trim();

    return {
      clientId,
      clientName: client.name,
      task: task || 'Untitled Task',
      assignees: assignee ? [assignee] : [],
      due,
    };
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const result = parseInput(val);
    setParsed(result);
  };

  const handleAdd = () => {
    if (!parsed) return;
    const { clientId, task, assignees, due } = parsed;
    const client = clientList[clientId];
    const timestamp = Date.now().toString();

    let meetings = [...client.meetings];
    let adHoc = meetings.find((m) => m.isAdHoc);
    if (!adHoc) {
      adHoc = { id: 'adhoc', isAdHoc: true, name: '', date: '', deliverables: [] };
      meetings = [adHoc, ...meetings];
    }

    if (adHoc.deliverables.length === 0) {
      adHoc.deliverables.push({ id: `${timestamp}-d`, name: '', tasks: [] });
    }

    adHoc.deliverables[0].tasks.push({
      id: `${timestamp}-t`,
      name: task,
      assignees,
      due,
      complete: false,
    });

    const updatedClient = { ...client, meetings };
    onClientChange(clientId, updatedClient);
    setInput('');
    setParsed(null);
  };

  return (
    <Box position="relative" flex={1}>
      <Box position="relative">
      <Input
          placeholder="Add task..."
        value={input}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
        }}
        size="sm"
        bg="white"
          borderRadius="md"
          borderColor="gray.200"
          _hover={{ borderColor: 'gray.300' }}
          _focus={{
            borderColor: 'gray.300',
            boxShadow: 'none'
          }}
          fontSize="sm"
          height="32px"
          pl={3}
          pr={3}
      />
      </Box>
      {parsed && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt={2}
          bg="white"
          p={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          zIndex="100"
          boxShadow="sm"
          animation="fadeIn 0.2s ease-out"
          sx={{
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(-10px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}
        >
          <VStack align="stretch" spacing={3}>
            <HStack>
              <Box flex="1">
                <Text color="gray.500" fontSize="sm" fontWeight="medium" mb={1}>Client</Text>
                <Text fontWeight="semibold">{parsed.clientName}</Text>
          </Box>
              <Box flex="1">
                <Text color="gray.500" fontSize="sm" fontWeight="medium" mb={1}>Due</Text>
                <Text fontWeight="semibold">{parsed.due || 'Not specified'}</Text>
              </Box>
            </HStack>
            
            <Box>
              <Text color="gray.500" fontSize="sm" fontWeight="medium" mb={1}>Task</Text>
              <Text fontWeight="semibold">{parsed.task}</Text>
            </Box>
            
            {parsed.assignees.length > 0 && (
              <Box>
                <Text color="gray.500" fontSize="sm" fontWeight="medium" mb={1}>Assignee</Text>
                <HStack spacing={2}>
                  {parsed.assignees.map((assignee, index) => (
                    <Tag
                      key={index}
                      size="md"
                      borderRadius="full"
                      colorScheme="blue"
                      variant="subtle"
                    >
                      {assignee}
                    </Tag>
                  ))}
                </HStack>
              </Box>
            )}
            
            <Button
              size="sm"
              colorScheme="blue"
              onClick={handleAdd}
              width="full"
              mt={2}
              _hover={{
                transform: 'translateY(-1px)',
                boxShadow: 'sm'
              }}
              transition="all 0.2s"
            >
              Add Task
            </Button>
          </VStack>
        </Box>
      )}
    </Box>
  );
}

export default function ClientManager({ username, onLogout }) {
  return (
    <SettingsProvider>
      <ClientManagerInner username={username} onLogout={onLogout} />
    </SettingsProvider>
  );
}
