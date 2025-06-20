import React, { useState } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  rectIntersection
} from '@dnd-kit/core';

function DraggableItem({ id }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      bg={isDragging ? 'purple.400' : 'purple.600'}
      color="white"
      p={4}
      borderRadius="md"
      boxShadow="md"
      cursor="grab"
      w="120px"
      textAlign="center"
      m={2}
      fontWeight="bold"
    >
      Drag me!
    </Box>
  );
}

function DroppableBucket({ id, children, isOver }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <Box
      ref={setNodeRef}
      bg={isOver ? 'green.200' : 'gray.200'}
      border="2px solid"
      borderColor={isOver ? 'green.500' : 'gray.400'}
      borderRadius="lg"
      minH="120px"
      minW="160px"
      p={4}
      m={2}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{ pointerEvents: 'all !important' }}
    >
      <Text fontWeight="bold" mb={2}>{id}</Text>
      {children}
    </Box>
  );
}

export default function DndKitMinimalTest() {
  const [bucket, setBucket] = useState('A');
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <Box p={8}>
      <Text fontSize="xl" mb={4} fontWeight="bold">Minimal dnd-kit Test</Text>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          if (over && over.id !== bucket) {
            setBucket(over.id);
          }
        }}
      >
        <Flex direction="row" gap={8}>
          {['A', 'B'].map((id) => (
            <DroppableBucket key={id} id={id} isOver={activeId && id !== bucket && activeId === 'draggable' && bucket !== id}>
              {bucket === id && <DraggableItem id="draggable" />}
            </DroppableBucket>
          ))}
        </Flex>
        <DragOverlay>
          {activeId && <DraggableItem id={activeId} />}
        </DragOverlay>
      </DndContext>
    </Box>
  );
} 