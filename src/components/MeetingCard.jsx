// src/components/MeetingCard.jsx
import {
  Box, VStack, Input, HStack, Checkbox, IconButton, Tooltip,
  Collapse, Tag, TagLabel, TagCloseButton, Menu, MenuButton, MenuList, MenuItem
} from '@chakra-ui/react';
import {
  AddIcon, CloseIcon, ChevronDownIcon, DeleteIcon, DragHandleIcon, TimeIcon, RepeatIcon
} from '@chakra-ui/icons';
import { useState, useEffect, useRef } from 'react';
import {
  DndContext, closestCenter, useSensor, useSensors, PointerSensor
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User } from 'lucide-react';

function handleFocus(e) {
  e.target.select();
}

const colorPalette = ['blue.100', 'green.100', 'purple.100', 'orange.100', 'pink.100', 'teal.100', 'red.100'];
const nameColorMap = {};
function colorForName(name) {
  if (nameColorMap[name]) return nameColorMap[name];
  const usedColors = Object.values(nameColorMap);
  const availableColors = colorPalette.filter(c => !usedColors.includes(c));
  const color = availableColors.length > 0
    ? availableColors[0]
    : colorPalette[Math.abs(hashString(name)) % colorPalette.length];
  nameColorMap[name] = color;
  return color;
}
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return hash;
}

function ConfirmButton({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 2000);
    return () => clearTimeout(timer);
  }, [confirming]);
  return confirming ? (
    <IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" variant="outline" borderRadius="full" onClick={onConfirm} aria-label="Confirm delete" />
  ) : (
    <IconButton size="xs" variant="ghost" fontSize="10px" color="gray.300" icon={<CloseIcon />} aria-label="Delete" onClick={() => setConfirming(true)} />
  );
}

function DragHandle({ listeners, attributes }) {
  return (
    <IconButton
      icon={<DragHandleIcon />}
      size="xs"
      variant="ghost"
      aria-label="Drag"
      {...listeners}
      {...attributes}
    />
  );
}

function isDeliverableComplete(d) {
  return d.tasks.length > 0 && d.tasks.every((t) => t.complete);
}
function isMeetingComplete(meeting) {
  if (meeting.isAdHoc) return false;
  const hasDeliverables = meeting.deliverables.length > 0;
  const allDone = meeting.deliverables.every(isDeliverableComplete);
  return hasDeliverables && allDone;
}

export default function MeetingCard({
  meeting, onUpdate, onDelete, onMoveToPast, onMoveToCurrent,
  onMoveDeliverableToPast, onMoveDeliverableToCurrent, team, isReadOnly = false, client
}) {
  const complete = isMeetingComplete(meeting);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDeliverableChange = (index, updated) => {
    const newDeliverables = [...meeting.deliverables];
    newDeliverables[index] = updated;
    onUpdate(meeting.id, { ...meeting, deliverables: newDeliverables });
  };

  const reorderDeliverables = (oldIndex, newIndex) => {
    const reordered = arrayMove(meeting.deliverables, oldIndex, newIndex);
    onUpdate(meeting.id, { ...meeting, deliverables: reordered });
  };

  const addDeliverable = () => {
    const d = { id: Date.now().toString(), name: '', tasks: [] };
    onUpdate(meeting.id, { ...meeting, deliverables: [...meeting.deliverables, d] });
  };

  const removeDeliverable = (index) => {
    const updated = meeting.deliverables.filter((_, i) => i !== index);
    onUpdate(meeting.id, { ...meeting, deliverables: updated });
  };

  const updateMeetingName = (e) => onUpdate(meeting.id, { ...meeting, name: e.target.value });

  return (
    <Box
      w="550px"
      bg="white"
      borderRadius="xl"
      boxShadow="lg"
      border="1px solid"
      borderColor={meeting.isAdHoc ? client?.sidebarColor || 'gray.200' : isReadOnly ? 'gray.300' : complete ? 'green.200' : client?.sidebarColor || 'blue.200'}
      transition="all 0.2s ease-in-out"
      _hover={{
        boxShadow: 'xl',
        transform: 'translateY(-1px)',
      }}
      position="relative"
      overflow="hidden"
    >
      <Box
        bg={meeting.isAdHoc ? client?.headerColor || 'gray.100' : isReadOnly ? 'gray.200' : complete ? 'green.100' : client?.headerColor || 'blue.50'}
        px={6}
        py={4}
        borderBottom="2px solid"
        borderColor={meeting.isAdHoc ? client?.sidebarColor || 'gray.200' : isReadOnly ? 'gray.300' : complete ? 'green.200' : client?.sidebarColor || 'blue.200'}
    >
        <HStack justify="space-between" align="center">
          <Box flex="1">
        <Input
          variant="unstyled"
          fontWeight="bold"
              fontSize="xl"
          placeholder={meeting.isAdHoc ? 'Ad-Hoc Tasks' : 'Meeting title'}
          value={meeting.name}
          isReadOnly={meeting.isAdHoc || isReadOnly}
          onChange={updateMeetingName}
          onFocus={handleFocus}
          px={0}
              _placeholder={{ color: 'gray.400', fontWeight: 'medium' }}
              color={meeting.isAdHoc ? 'gray.700' : isReadOnly ? 'gray.700' : complete ? 'green.700' : 'blue.800'}
        />
          </Box>
          <HStack spacing={3}>
            {!isReadOnly && (
              <Tooltip label="Add deliverable" placement="top">
                <IconButton 
                  icon={<AddIcon />} 
                  size="md"
                  colorScheme={complete ? 'green' : 'blue'}
                  variant="ghost"
                  onClick={addDeliverable} 
                  aria-label="Add deliverable"
                />
              </Tooltip>
            )}
          {!meeting.isAdHoc && onMoveToPast && !isReadOnly && (
              <Tooltip label="Move to Past" placement="top">
                <IconButton 
                  icon={<TimeIcon />} 
                  size="md"
                  colorScheme={complete ? 'green' : 'blue'}
                  variant="ghost"
                  aria-label="Move to past" 
                  onClick={() => onMoveToPast?.()} 
                />
            </Tooltip>
          )}
          {!meeting.isAdHoc && onMoveToCurrent && (
              <Tooltip label="Move to Current" placement="top">
                <IconButton 
                  icon={<RepeatIcon />} 
                  size="md"
                  colorScheme={complete ? 'green' : 'blue'}
                  variant="ghost"
                  aria-label="Move to current" 
                  onClick={() => onMoveToCurrent?.()} 
                />
            </Tooltip>
          )}
            {!meeting.isAdHoc && onDelete && !isReadOnly && (
              <Box>
                <ConfirmButton onConfirm={() => onDelete(meeting.id)} />
              </Box>
            )}
          </HStack>
        </HStack>
      </Box>

      <Box px={6} py={4} bg="white">
      <DndContext sensors={sensors} collisionDetection={closestCenter}>
        <SortableContext items={meeting.deliverables.map((d) => `${meeting.id}::${d.id}`)} strategy={verticalListSortingStrategy}>
          <VStack spacing={4} align="stretch">
            {meeting.deliverables.map((d, i) => (
              <SortableDeliverable
                key={d.id}
                data={d}
                meetingId={meeting.id}
                onUpdate={(u) => handleDeliverableChange(i, u)}
                onRemove={!isReadOnly ? () => removeDeliverable(i) : undefined}
                team={team}
                onMoveToArchive={
                  meeting.isAdHoc && onMoveDeliverableToPast && !isReadOnly
                    ? () => onMoveDeliverableToPast(d)
                    : undefined
                }
                onMoveToCurrentDeliverable={
                  meeting.isAdHoc && isReadOnly && onMoveDeliverableToCurrent
                    ? () => onMoveDeliverableToCurrent(d)
                    : undefined
                }
                isReadOnly={isReadOnly}
              />
            ))}
          </VStack>
        </SortableContext>
      </DndContext>
      </Box>
    </Box>
  );
}

function SortableDeliverable({ data, meetingId, onUpdate, onRemove, team, onMoveToArchive, onMoveToCurrentDeliverable, isReadOnly }) {
  const id = `${meetingId}::${data.id}`;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Box ref={setNodeRef} style={style}>
      <Box display="flex" alignItems="start">
        <Box mt={1} mr={2}><DragHandle listeners={listeners} attributes={attributes} /></Box>
        <Box flex="1">
          <Deliverable
            data={data}
            onUpdate={onUpdate}
            onRemove={onRemove}
            team={team}
            onMoveToArchive={onMoveToArchive}
            onMoveToCurrentDeliverable={onMoveToCurrentDeliverable}
            isReadOnly={isReadOnly}
          />
        </Box>
      </Box>
    </Box>
  );
}

function Deliverable({ data, onUpdate, onRemove, team, onMoveToArchive, onMoveToCurrentDeliverable, isReadOnly }) {
  const [expanded, setExpanded] = useState(true);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const inputRef = useRef(null);
  const complete = isDeliverableComplete(data);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    const checkTruncation = () => {
      if (inputRef.current) {
        const isOverflowing = inputRef.current.scrollWidth > inputRef.current.clientWidth;
        setIsTextTruncated(isOverflowing);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [data.name]);

  const handleTaskChange = (i, t) => {
    const tasks = [...data.tasks];
    tasks[i] = t;
    onUpdate({ ...data, tasks });
  };

  const reorderTasks = (oldIndex, newIndex) => {
    const reordered = arrayMove(data.tasks, oldIndex, newIndex);
    onUpdate({ ...data, tasks: reordered });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.tasks.findIndex(t => t.id === active.id);
    const newIndex = data.tasks.findIndex(t => t.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderTasks(oldIndex, newIndex);
    }
  };

  const addTask = () =>
    onUpdate({
      ...data,
      tasks: [
        ...data.tasks,
        {
          id: Date.now().toString(),
          name: '',
          assignees: [],
          due: '',
          complete: false,
        },
      ],
    });

  const removeTask = (i) =>
    onUpdate({ ...data, tasks: data.tasks.filter((_, idx) => idx !== i) });

  return (
    <Box 
      bg={complete ? 'green.50' : 'gray.50'} 
      borderRadius="md" 
      px={3} 
      pt={2} 
      pb={2}
      transition="all 0.15s"
      _hover={{
        bg: complete ? 'green.100' : 'gray.100'
      }}
    >
      <HStack justify="space-between" mb={2}>
        <HStack spacing={1} flex="1" minW="0">
          <IconButton 
            icon={<ChevronDownIcon 
              transform={expanded ? 'rotate(-180deg)' : undefined}
              transition="transform 0.15s"
            />} 
            size="xs" 
            variant="ghost" 
            onClick={() => setExpanded(!expanded)} 
            aria-label="Toggle tasks"
            color="gray.500"
            flexShrink={0}
          />
          <Tooltip 
            label={data.name}
            isDisabled={!isTextTruncated}
            placement="top"
            hasArrow
          >
          <Input
              ref={inputRef}
            variant="unstyled"
              fontWeight="medium"
            fontSize="md"
            placeholder="Deliverable name"
            value={data.name}
            onChange={(e) => onUpdate({ ...data, name: e.target.value })}
            onFocus={handleFocus}
            isReadOnly={isReadOnly}
              color="gray.700"
              _placeholder={{ color: 'gray.400' }}
              flex="1"
              minW="0"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
          />
          </Tooltip>
        </HStack>
        <HStack spacing={1} flexShrink={0}>
          {!isReadOnly && (
            <IconButton 
              icon={<AddIcon />} 
              size="xs" 
              variant="ghost" 
              onClick={addTask} 
              aria-label="Add task"
              color="gray.600"
              _hover={{ bg: 'gray.200' }}
            />
          )}
          {onMoveToArchive && !isReadOnly && (
            <Tooltip label="Archive Deliverable">
              <IconButton 
                icon={<TimeIcon />} 
                size="xs" 
                variant="ghost" 
                colorScheme="gray" 
                aria-label="Archive" 
                onClick={() => onMoveToArchive(data)}
                _hover={{ bg: 'gray.200' }}
              />
            </Tooltip>
          )}
          {onMoveToCurrentDeliverable && isReadOnly && (
            <Tooltip label="Return to Current">
              <IconButton 
                icon={<RepeatIcon />} 
                size="xs" 
                variant="ghost" 
                colorScheme="gray" 
                aria-label="Return" 
                onClick={() => onMoveToCurrentDeliverable(data)}
                _hover={{ bg: 'gray.200' }}
              />
            </Tooltip>
          )}
          {!isReadOnly && onRemove && <ConfirmButton onConfirm={onRemove} />}
        </HStack>
      </HStack>

      <Collapse in={expanded}>
        <VStack spacing={1} align="stretch" mt={1}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={data.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {data.tasks.map((task, idx) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onChange={(updated) => handleTaskChange(idx, updated)}
                  onRemove={() => removeTask(idx)}
                  team={team}
                  isReadOnly={isReadOnly}
                />
              ))}
          </SortableContext>
        </DndContext>
        </VStack>
      </Collapse>
    </Box>
  );
}

function SortableTask({ task, onChange, onRemove, team, isReadOnly }) {
  const [newName, setNewName] = useState('');
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const inputRef = useRef(null);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  useEffect(() => {
    const checkTruncation = () => {
      if (inputRef.current) {
        const isOverflowing = inputRef.current.scrollWidth > inputRef.current.clientWidth;
        setIsTextTruncated(isOverflowing);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [task.name]);

  const toggleAssignee = (name) => {
    const assignees = task.assignees || [];
    const updated = assignees.includes(name)
      ? assignees.filter((n) => n !== name)
      : [...assignees, name];
      onChange({ ...task, assignees: updated });
  };

  const removeAssignee = (e, name) => {
    e.preventDefault();
    e.stopPropagation();
    const assignees = task.assignees || [];
    onChange({ ...task, assignees: assignees.filter(n => n !== name) });
  };

  const addCustomAssignee = () => {
    if (!newName.trim()) return;
    const name = newName.trim();
    toggleAssignee(name);
    setNewName('');
  };

  return (
    <HStack
      ref={setNodeRef}
      style={style}
      spacing={2}
      wrap="wrap"
      align="center"
      bg="white"
      p={1.5}
      borderRadius="sm"
      borderWidth="1px"
      borderColor={task.complete ? 'green.200' : 'gray.200'}
      opacity={task.complete ? 0.8 : 1}
      transition="all 0.15s"
      _hover={{
        borderColor: task.complete ? 'green.300' : 'gray.300',
      }}
    >
      <Box w="20px">
        <DragHandle listeners={listeners} attributes={attributes} />
      </Box>
      
      <Checkbox
        isChecked={task.complete}
        onChange={(e) => onChange({ ...task, complete: e.target.checked })}
        isDisabled={isReadOnly}
        colorScheme="green"
        size="md"
      />
      
      <Tooltip
        label={task.name}
        isDisabled={!isTextTruncated}
        placement="top"
        hasArrow
      >
      <Input
          ref={inputRef}
        variant="unstyled"
        placeholder="Task name"
        value={task.name}
        onChange={(e) => onChange({ ...task, name: e.target.value })}
        onFocus={handleFocus}
        flex="2"
        minW="0"
        isReadOnly={isReadOnly}
          textDecoration={task.complete ? 'line-through' : 'none'}
          color={task.complete ? 'gray.500' : 'gray.700'}
          fontSize="sm"
          _placeholder={{ color: 'gray.400' }}
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        />
      </Tooltip>
      
          <HStack spacing={1} wrap="wrap" maxW="200px">
            {(task.assignees || []).map((name, idx) => (
          <Box 
            key={idx}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isReadOnly) removeAssignee(e, name);
            }}
            cursor={isReadOnly ? 'default' : 'pointer'}
          >
            <Tag 
              size="sm" 
              borderRadius="md" 
              bg={colorForName(name)}
              color="gray.700"
              px={2}
              py={0.5}
              transition="all 0.2s"
              _hover={{
                opacity: !isReadOnly ? 0.7 : 1,
                bg: !isReadOnly ? 'red.100' : colorForName(name)
              }}
            >
                <TagLabel>{name}</TagLabel>
              </Tag>
          </Box>
            ))}
        {!isReadOnly && (
          <Menu closeOnSelect={false}>
            <MenuButton
              as={Tag}
              size="sm"
              borderRadius="md"
              variant="outline"
              colorScheme="gray"
              cursor="pointer"
            >
              <Box as={User} size={14} />
        </MenuButton>
        <MenuList>
          {team.map((name) => (
                <MenuItem 
                  key={name}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAssignee(name);
                  }}
                  closeOnSelect={false}
                  px={2}
                >
                  <HStack spacing={2} width="100%" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      isChecked={task.assignees?.includes(name)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleAssignee(name);
                      }}
                      colorScheme="gray"
                    >
                      {name}
                    </Checkbox>
                  </HStack>
            </MenuItem>
          ))}
              <MenuItem onClick={(e) => e.preventDefault()} closeOnSelect={false}>
            <Input
                  size="sm"
                  placeholder="Type name and press Enter"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                      e.stopPropagation();
                  addCustomAssignee();
                }
              }}
                  onClick={(e) => e.stopPropagation()}
                  borderRadius="sm"
                  autoFocus
            />
          </MenuItem>
        </MenuList>
      </Menu>
        )}
      </HStack>
      
      <Input
        variant="unstyled"
        placeholder="MM/DD"
        size="sm"
        width="70px"
        value={task.due}
        onChange={(e) => onChange({ ...task, due: e.target.value })}
        onFocus={handleFocus}
        isReadOnly={isReadOnly}
        textAlign="center"
        fontFamily="mono"
        fontSize="sm"
        color="gray.600"
        _placeholder={{ color: 'gray.400' }}
      />
      
      {!isReadOnly && onRemove && <ConfirmButton onConfirm={onRemove} />}
    </HStack>
  );
}
