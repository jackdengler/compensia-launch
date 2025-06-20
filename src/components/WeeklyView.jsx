// src/WeeklyView.jsx
import {
  Box, Text, HStack, VStack, IconButton, Input,
  Tooltip, Image, Checkbox, Tag
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, DragHandleIcon } from '@chakra-ui/icons';
import { useState, useMemo, useEffect } from 'react';
import { keyframes } from '@emotion/react';
import {
  DndContext, closestCenter, useSensor, useSensors,
  PointerSensor, useDroppable, useDraggable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function getClientLogo(clientName) {
  if (!clientName) return "";
  const domain = clientName.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '') + ".com";
  return `https://logo.clearbit.com/${domain}`;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const bounce = keyframes`
  0% { transform: scale(0.95); background: yellow.100; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); background: none; }
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

function DroppableDayColumn({ dateKey, isToday, weekdayLabel, displayDate, tasks, filter, animateId, onClientChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <Box
      ref={setNodeRef}
      key={dateKey}
      bg={isToday ? 'blue.50' : isOver ? 'blue.25' : 'gray.50'}
      border="2px solid"
      borderColor={isToday ? 'blue.300' : 'gray.200'}
      boxShadow={isToday ? 'xl' : 'none'}
      borderRadius="xl"
      p={3}
      minW="260px"
      animation={isToday ? 'fadeToday 0.4s ease-out' : undefined}
      sx={{ '@keyframes fadeToday': { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } } }}
    >
      <HStack spacing={2} mb={2}>
        <Text fontWeight="bold" color={isToday ? 'blue.700' : 'gray.700'}>
          {weekdayLabel}, {displayDate}
        </Text>
        {isToday && (
          <Tag size="sm" colorScheme="blue" borderRadius="full" fontWeight="bold" px={2}>TODAY</Tag>
        )}
      </HStack>
      <VStack align="start" spacing={2}>
        {tasks
          .filter((t) => !filter || (Array.isArray(t.assignees) ? t.assignees : [t.assignee || ''])
            .some((n) => n.toLowerCase() === filter.toLowerCase()))
          .map((t) => (
            <DraggableTask key={t.id} task={t} animate={t.id === animateId} onClientChange={onClientChange} />
          ))}
      </VStack>
    </Box>
  );
}

function DraggableTask({ task, animate, onClientChange }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animation: animate ? `${bounce} 0.4s ease` : undefined,
  };

  const toggleComplete = () => {
    const [clientId, meetingId, deliverableId, taskId] = task.id.split('::');
    const client = structuredClone(task.fullClient);
    for (const listKey of ['meetings', 'pastMeetings']) {
      for (const m of client[listKey]) {
        if (m.id !== meetingId) continue;
        for (const d of m.deliverables) {
          if (d.id !== deliverableId) continue;
          for (const t of d.tasks) {
            if (t.id === taskId) {
              t.complete = !t.complete;
              onClientChange(clientId, client);
              return;
            }
          }
        }
      }
    }
  };

  const assigneeStr = Array.isArray(task.assignees) ? task.assignees.join(', ') : task.assignee || '';

  return (
    <Tooltip
      hasArrow
      placement="right"
      label={
        <Box p={2} textAlign="left">
          <Text><strong>Client:</strong> {task.clientName}</Text>
          <Text><strong>Deliverable:</strong> {task.deliverable}</Text>
          <Text><strong>Task:</strong> {task.task}</Text>
          <Text><strong>Due:</strong> {task.due}</Text>
          <Text><strong>Assignees:</strong> {assigneeStr}</Text>
        </Box>
      }
      bg="gray.700"
      color="white"
      borderRadius="md"
      fontSize="sm"
      boxShadow="lg"
    >
      <HStack
        ref={setNodeRef}
        style={style}
        spacing={2}
        align="center"
        borderRadius="md"
        px={1}
        opacity={task.complete ? 0.5 : 1}
      >
        <Box {...attributes} {...listeners} cursor="grab">
          <DragHandleIcon boxSize={3} color="gray.500" />
        </Box>
        <Checkbox
          isChecked={task.complete}
          onChange={(e) => {
            e.stopPropagation();
            toggleComplete();
          }}
          size="sm"
        />
        <Image src={task.logo} alt={task.clientName} boxSize="18px" borderRadius="md" />
        <Text
          fontSize="sm"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
          maxW="160px"
          color={task.complete ? 'gray.400' : 'gray.800'}
          textDecoration={task.complete ? 'line-through' : 'none'}
        >
          {task.task}
        </Text>
      </HStack>
    </Tooltip>
  );
}

export default function WeeklyView({ clientList, onClientChange }) {
  const [selected, setSelected] = useState(new Date());
  const [filter, setFilter] = useState('');
  const [recentlyDroppedId, setRecentlyDroppedId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const weekDates = useMemo(() => getWeekDates(selected), [selected]);
  const todayKey = getDateKey(new Date());

  useEffect(() => {
    console.log("WeeklyView clientList received:", clientList);
    if (clientList) {
      Object.values(clientList).forEach(client => {
        if (client && !client.logo) {
          console.warn(`Client ${client.name || client.id} is missing a logo in WeeklyView.`);
        }
      });
    }
  }, [clientList]);

  const animateDrop = (id) => {
    setRecentlyDroppedId(id);
    setTimeout(() => setRecentlyDroppedId(null), 400);
  };

  const taskMap = useMemo(() => {
    const map = {};
    for (const clientId in clientList) {
      const c = clientList[clientId];
      for (const m of [...c.meetings, ...c.pastMeetings]) {
        for (const d of m.deliverables) {
          for (const t of d.tasks) {
            if (!t.due) continue;
            const date = parseDue(t.due);
            const key = getDateKey(date);
            if (!map[key]) map[key] = [];
            map[key].push({
              id: `${clientId}::${m.id}::${d.id}::${t.id}`,
              clientId,
              meetingId: m.id,
              deliverableId: d.id,
              taskId: t.id,
              clientName: c.name,
              logo: getClientLogo(c.name),
              deliverable: d.name,
              task: t.name,
              assignees: t.assignees || [t.assignee || 'Unassigned'],
              due: t.due,
              complete: t.complete,
              fullClient: c,
            });
          }
        }
      }
    }
    return map;
  }, [clientList]);

  const handleDragEnd = ({ active, over }) => {
    if (!over || !over.id || over.id === active.id) return;
    const dateKeys = weekDates.map(getDateKey);
    if (!dateKeys.includes(over.id)) return;

    const sourceId = active.id;
    const destDateKey = over.id;
    const newDue = formatDateKeyToDue(destDateKey);

    const [clientId, meetingId, deliverableId, taskId] = sourceId.split('::');
    const client = structuredClone(clientList[clientId]);
    for (const listKey of ['meetings', 'pastMeetings']) {
      for (const m of client[listKey]) {
        if (m.id !== meetingId) continue;
        for (const d of m.deliverables) {
          if (d.id !== deliverableId) continue;
          for (const t of d.tasks) {
            if (t.id === taskId) {
              t.due = newDue;
              onClientChange(clientId, client);
              animateDrop(active.id);
              return;
            }
          }
        }
      }
    }
  };

  const goPrev = () => {
    const prev = new Date(selected);
    prev.setDate(prev.getDate() - 7);
    setSelected(prev);
  };

  const goNext = () => {
    const next = new Date(selected);
    next.setDate(next.getDate() + 7);
    setSelected(next);
  };

  return (
    <Box p={6}>
      <HStack justify="center" mb={4} spacing={6}>
        <IconButton icon={<ChevronLeftIcon />} onClick={goPrev} aria-label="Prev Week" />
        <Text fontSize="2xl" fontWeight="bold">
          Week of {weekDates[0].toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
        </Text>
        <IconButton icon={<ChevronRightIcon />} onClick={goNext} aria-label="Next Week" />
      </HStack>

      <Box textAlign="center" mb={4}>
        <Input
          placeholder="Filter by assignee"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          maxW="300px"
          mx="auto"
        />
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <HStack align="start" spacing={4} overflowX="auto">
          {weekDates.map((d, idx) => {
            const key = getDateKey(d);
            const isToday = key === todayKey;
            const tasks = taskMap[key] || [];
            return (
              <DroppableDayColumn
                key={key}
                dateKey={key}
                isToday={isToday}
                weekdayLabel={WEEKDAYS[idx]}
                displayDate={d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                tasks={tasks}
                filter={filter}
                animateId={recentlyDroppedId}
                onClientChange={onClientChange}
              />
            );
          })}
        </HStack>
      </DndContext>
    </Box>
  );
}
