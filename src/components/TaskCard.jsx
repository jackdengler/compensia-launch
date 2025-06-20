import {
  Box,
  Text,
  Flex,
  Badge,
  Tooltip,
  useToken,
  Image
} from '@chakra-ui/react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { keyframes } from '@emotion/react';

const bounce = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export default function TaskCard({ task, animate, isDragging = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isDraggingCardInternal } = useDraggable({
    id: task.id,
    data: { type: 'task' } // Add type for potential differentiation if other draggables exist
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animation: animate ? `${bounce} 0.4s ease` : undefined,
    opacity: isDraggingCardInternal ? 0.5 : 1, // Show a bit of the card even when dragging over it
    cursor: 'grab',
    touchAction: 'none',
  };

  const TaskContent = () => (
    <Flex
      direction="column"
      p={2}
      bg="white"
      borderRadius="md"
      boxShadow={isDragging ? "xl" : "sm"} // Enhanced shadow for dragged item
      borderWidth="1px"
      borderColor="gray.200"
      w="full"
      minW="200px"
      h="auto"
      overflow="hidden"
    >
      <Text fontSize="sm" fontWeight="semibold" noOfLines={2} wordBreak="break-word" mb={1}>
        {task.taskName}
      </Text>
      <Text fontSize="xs" color="gray.500" noOfLines={1}>
        {task.clientName} - {task.deliverableName}
      </Text>
      {task.assignees && task.assignees.length > 0 && (
        <Flex mt={1} wrap="wrap">
          {task.assignees.map(assignee => (
            <Badge key={assignee} colorScheme="teal" fontSize="0.6rem" mr={1} mb={1}>
              {assignee}
            </Badge>
          ))}
        </Flex>
      )}
      {task.due && (
        <Text fontSize="xs" color="pink.500" mt={1}>
          Due: {task.due}
        </Text>
      )}
    </Flex>
  );

  if (isDragging) { // This is for the DragOverlay version
    return (
      <Box borderRadius="md" boxShadow="xl" width="250px" maxW="100%" overflow="hidden" bg="white">
        <TaskContent />
      </Box>
    );
  }

  return (
    <Tooltip
      hasArrow
      placement="top"
      label={
        <Box p={1.5} textAlign="left" maxW="280px">
          <Text><strong>Client:</strong> {task.clientName}</Text>
          <Text><strong>Deliverable:</strong> {task.deliverableName}</Text>
          <Text><strong>Task:</strong> {task.taskName}</Text>
          {task.due && <Text><strong>Due:</strong> {task.due}</Text>}
          {task.assignees?.length > 0 && <Text><strong>Assignees:</strong> {task.assignees.join(', ')}</Text>}
        </Box>
      }
      bg="gray.700"
      color="white"
      borderRadius="md"
      fontSize="xs"
      boxShadow="lg"
      openDelay={300}
      isDisabled={isDraggingCardInternal}
      closeOnClick={true}
    >
      <Box
        ref={setNodeRef}
        style={style}
        _active={{ cursor: "grabbing", boxShadow: "lg" }}
        mb={2}
        transition="all 0.2s ease-in-out"
        _hover={{ borderColor: "blue.400", boxShadow: "md" }}
        {...attributes}
        {...listeners}
      >
        <TaskContent />
      </Box>
    </Tooltip>
  );
} 