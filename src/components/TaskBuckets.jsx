import {
  Box, Text, HStack, VStack, IconButton, Input,
  Image, Tag, Badge, Flex, Tooltip
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, DragHandleIcon } from '@chakra-ui/icons';
import { useState, useMemo, useEffect } from 'react';
import { keyframes } from '@emotion/react';
import {
  DndContext, closestCenter, useSensor, useSensors,
  PointerSensor, useDroppable, useDraggable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Comment out or remove WEEKDAYS

const BUCKETS = [
  'Unassigned',
  'Downstream',
  'Active Work',
  'Upstream',
  'Internal',
  'Complete',
];

const BUCKET_COLORS = {
  'Unassigned': 'gray',
  'Downstream': 'blue',
  'Upstream': 'orange',
  'Active Work': 'purple',
  'Internal': 'teal',
  'Complete': 'red',
};

const bounce = keyframes`
  0% { transform: scale(0.95); /* background: yellow.100; */ } // Adjusted bounce
  50% { transform: scale(1.05); }
  100% { transform: scale(1); background: none; }
`;

// New keyframes for completion animation
const completeAnimation = keyframes`
  0% { transform: scale(1); border-color: var(--chakra-colors-gray-200); }
  50% { transform: scale(1.05); border-color: var(--chakra-colors-green-400); box-shadow: var(--chakra-shadows-lg); }
  100% { transform: scale(1); border-color: var(--chakra-colors-green-500); }
`;

function getWeekDates(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getDateKey(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}

function parseDue(due) {
  const [m, d] = due.split('/').map(Number);
  return new Date(new Date().getFullYear(), m - 1, d);
}

function formatDateKeyToDue(key) {
  const d = new Date(key);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

function DroppableBucketColumn({ bucketName, deliverables, filter, animateId, onClientChange, onMarkComplete }) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketName });
  const colorScheme = BUCKET_COLORS[bucketName] || 'gray';

  return (
    <Box
      ref={setNodeRef}
      key={bucketName}
      bg={isOver ? `${colorScheme}.100` : `${colorScheme}.50`}
      border="2px solid"
      borderColor={`${colorScheme}.300`}
      borderRadius="xl"
      p={3}
      minW="300px"
    >
      <HStack spacing={2} mb={3} justify="space-between">
        <Text fontWeight="bold" color={`${colorScheme}.700`} textTransform="uppercase" fontSize="sm" letterSpacing="wider">
          {bucketName}
        </Text>
        <Tag size="sm" colorScheme={colorScheme} borderRadius="full" fontWeight="bold" px={2}>
          {deliverables?.length || 0}
        </Tag>
      </HStack>
      <VStack align="stretch" spacing={2} flexGrow={1} h="100%">
        {deliverables
          .map((deliverable) => (
            <DraggableDeliverableCard key={deliverable.id} deliverable={deliverable} animate={deliverable.id === animateId} onClientChange={onClientChange} onMarkComplete={onMarkComplete} />
          ))}
          {(!deliverables || deliverables.length === 0) && (
            <Box textAlign="center" p={4} color={`${colorScheme}.400`}>
              <Text fontSize="sm">Drop here</Text>
            </Box>
          )}
      </VStack>
    </Box>
  );
}

function DraggableDeliverableCard({ deliverable, animate, onClientChange, onMarkComplete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({ id: deliverable.id });
  const [isCompleting, setIsCompleting] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isCompleting ? 'all 0.3s ease-in-out' : transition, // Allow animation to override dnd transition temporarily
    animation: isCompleting ? `${completeAnimation} 0.8s ease-in-out forwards` : (animate ? `${bounce} 0.4s ease` : undefined),
    width: '100%',
    touchAction: 'none',
    opacity: isDragging ? 0.75 : 1,
    zIndex: isDragging ? 1000 : undefined,
    // Dynamic border color based on completion state will be handled by sx prop or direct style if needed
  };

  const tasks = deliverable.tasks || [];
  const taskCount = tasks.length;

  const taskDetailsTooltip = (
    <VStack spacing={1} align="start" p={1}>
      {taskCount > 0 ? (
        tasks.map((task, index) => (
          <Text key={index} fontSize="xs">
            - {task.taskName || task.name}{task.due ? ` (Due: ${task.due})` : ''}
          </Text>
        ))
      ) : (
        <Text fontSize="xs">No tasks</Text>
      )}
    </VStack>
  );

  const handleDoubleClick = () => {
    if (isCompleting) return; // Prevent multiple triggers
    setIsCompleting(true);
    setTimeout(() => {
      onMarkComplete(deliverable.id);
      // No need to setIsCompleting(false) here, as the card will unmount
    }, 800); // Duration of the animation
  };

  return (
    <Tooltip 
      label={taskDetailsTooltip} 
      placement="top" 
      hasArrow 
      bg="gray.700" 
      color="white" 
      borderRadius="md" 
      fontSize="xs" 
      p={1.5} 
      isDisabled={taskCount === 0}
    >
      <Box
        ref={setNodeRef}
        style={style}
        onDoubleClick={handleDoubleClick} // Added double-click handler
        mb={2}
        bg="white"
        borderRadius="md"
        boxShadow={isDragging ? "lg" : (isCompleting ? "xl" : "sm")}
        borderWidth="1px"
        borderColor={isCompleting ? "green.500" : "gray.200"} // Dynamic border color
        _hover={!isCompleting ? { borderColor: "blue.300", boxShadow: "md" } : {}} // Disable hover effect during completion
        p={1.5} 
        overflow="hidden"
        minH={"auto"}
      >
        <Flex direction="row" align="center"> 
          <Box 
            {...attributes} 
            {...listeners}  
            cursor={isDragging ? "grabbing" : "grab"} 
            pr={1.5} 
            display="flex"
            alignItems="center"
            flexShrink={0}
          >
            <DragHandleIcon color="gray.400" _hover={{ color: "gray.600"}} boxSize={4} />
          </Box>
          
          {deliverable.logo && (
            <Image
              src={deliverable.logo}
              alt={deliverable.clientName || 'Client'}
              boxSize="18px" 
              objectFit="contain"
              borderRadius="sm"
              flexShrink={0}
              mr={1.5} 
            />
          )}
          <Box flex="1" minW="0" pr={1}> 
            <HStack spacing={1.5} align="center"> 
              <Text
                fontSize="sm"
                fontWeight="medium" 
                whiteSpace="nowrap" 
                overflow="hidden"   
                textOverflow="ellipsis" 
                lineHeight="normal" 
                flexShrink={1} 
                minW="0" 
              >
                {deliverable.deliverableName || 'Deliverable Name'}
              </Text>
              {taskCount > 0 && (
                <Badge 
                  colorScheme="gray" 
                  variant="solid" 
                  fontSize="0.65em" 
                  px={1} 
                  py={0.25}
                  borderRadius="full" 
                  flexShrink={0} 
                  lineHeight={1} 
                >
                  {taskCount}
                </Badge>
              )}
            </HStack>
          </Box>
        </Flex>
      </Box>
    </Tooltip>
  );
}

export default function TaskBuckets({ clientList, onClientChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyDroppedId, setRecentlyDroppedId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    console.log("TaskBuckets clientList received:", clientList);
    if (clientList) {
      Object.values(clientList).forEach(client => {
        if (client && !client.logo) {
          console.warn(`Client ${client.name || client.id} is missing a logo in TaskBuckets.`);
        }
      });
    }
  }, [clientList]);

  const animateDrop = (id) => {
    setRecentlyDroppedId(id);
    setTimeout(() => setRecentlyDroppedId(null), 400);
  };

  const handleMarkDeliverableComplete = (deliverableIdToComplete) => {
    const [clientId, meetingId, originalDeliverableId] = deliverableIdToComplete.split('::');
    const clientToUpdate = structuredClone(clientList[clientId]);
    if (!clientToUpdate) {
      console.error("Client not found for completion:", clientId);
      return;
    }

    let deliverableUpdated = false;
    for (const listKey of ['meetings', 'pastMeetings']) {
      const meetingsList = clientToUpdate[listKey];
      if (meetingsList) {
        for (const m of meetingsList) {
          if (m.id === meetingId && m.deliverables) {
            for (const d of m.deliverables) {
              if (d.id === originalDeliverableId) {
                d.isDeliverableComplete = true;
                deliverableUpdated = true;
                break;
              }
            }
          }
          if (deliverableUpdated) break;
        }
      }
      if (deliverableUpdated) break;
    }

    if (deliverableUpdated) {
      onClientChange(clientId, clientToUpdate);
      // No animation call here, the card handles its own disappearing act via state update
      console.log("Deliverable marked complete:", deliverableIdToComplete);
    } else {
      console.warn("Failed to find and mark deliverable complete:", deliverableIdToComplete);
    }
  };

  const deliverablesByBucket = useMemo(() => {
    const allDeliverables = [];
    if (clientList) {
      Object.entries(clientList).forEach(([clientId, client]) => {
        if (!client) return;
        ['meetings', 'pastMeetings'].forEach(listKey => {
          client[listKey]?.forEach(meeting => {
            if (!meeting || !meeting.deliverables) return;
            meeting.deliverables.forEach(d => {
              if (d.isDeliverableComplete) return; // Filter out completed deliverables here

              const tasks = d.tasks?.filter(task => !task.complete) || [];
              allDeliverables.push({
                id: `${clientId}::${meeting.id}::${d.id}`,
                clientId,
                clientName: client.name,
                logo: client.logo?.trim() || `https://logo.clearbit.com/${client.name.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '')}.com`,
                meetingId: meeting.id,
                deliverableId: d.id,
                deliverableName: d.name,
                bucket: d.bucket || 'Unassigned',
                tasks: tasks,
                // isDeliverableComplete: d.isDeliverableComplete, // Not strictly needed in this flattened object if filtered above
              });
            });
          });
        });
      });
    }
    
    const filteredDeliverables = searchQuery
      ? allDeliverables.filter(d => 
          (d.deliverableName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (d.clientName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        )
      : allDeliverables;

    const grouped = {};
    BUCKETS.forEach(bucket => {
      grouped[bucket] = filteredDeliverables.filter(d => d.bucket === bucket);
    });
    return grouped;
  }, [clientList, searchQuery]);

  const handleDragEnd = ({ active, over }) => {
    console.log("DragEnd: active=", active, "over=", over);
    if (!over || !over.id) {
      console.log("No valid drop target or drag cancelled.");
      return;
    }

    const deliverableId = active.id;
    const newBucket = over.id.toString();

    if (!BUCKETS.includes(newBucket)) {
        console.warn("Dropped on an invalid target:", newBucket);
        return;
    }

    let deliverableToMove = null;
    for (const bucketKey in deliverablesByBucket) {
        const found = deliverablesByBucket[bucketKey].find(d => d.id === deliverableId);
        if (found) {
            deliverableToMove = found;
            break;
        }
    }

    if (!deliverableToMove) {
        console.error("Could not find the dragged deliverable:", deliverableId);
        return;
    }

    if (deliverableToMove.bucket === newBucket) {
        console.log("Dropped in the same bucket, no change.");
        return;
    }

    console.log(`Moving ${deliverableId} from ${deliverableToMove.bucket} to ${newBucket}`);

    const [clientId, meetingId, originalDeliverableId] = deliverableId.split('::');
    const clientToUpdate = structuredClone(clientList[clientId]);

    let deliverableUpdatedInClient = false;
    for (const listKey of ['meetings', 'pastMeetings']) {
        if (deliverableUpdatedInClient) break;
        const meetingsList = clientToUpdate[listKey];
        if (meetingsList) {
            for (const m of meetingsList) {
                if (m.id === meetingId && m.deliverables) {
                    for (const d of m.deliverables) {
                        if (d.id === originalDeliverableId) {
                            d.bucket = newBucket;
                            deliverableUpdatedInClient = true;
                            break;
                        }
                    }
                }
                if (deliverableUpdatedInClient) break;
            }
        }
    }

    if (deliverableUpdatedInClient) {
        onClientChange(clientId, clientToUpdate);
        animateDrop(active.id);
        console.log("onClientChange called for update.");
    } else {
        console.warn("Failed to find and update the deliverable in clientList for onClientChange.");
    }
  };

  return (
    <Box p={6}>
      <Box mb={6} maxW="400px">
          <Input
            placeholder="Search by deliverable, client, or task..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="white"
            size="md"
            borderRadius="lg"
            borderColor="gray.200"
            _hover={{ borderColor: "gray.300" }}
            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
          />
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <HStack align="flex-start" spacing={4} overflowX="auto" pb={4} minH="calc(100vh - 200px)">
          {BUCKETS.map(bucketName => {
            const deliverablesInBucket = deliverablesByBucket[bucketName] || [];
            return (
              <DroppableBucketColumn
                key={bucketName}
                bucketName={bucketName}
                deliverables={deliverablesInBucket}
                filter={searchQuery}
                animateId={recentlyDroppedId}
                onClientChange={onClientChange}
                onMarkComplete={handleMarkDeliverableComplete}
              />
            );
          })}
        </HStack>
      </DndContext>
    </Box>
  );
} 