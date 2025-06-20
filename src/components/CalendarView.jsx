// src/CalendarView.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box, Image, VStack, Tooltip, useBreakpointValue, Text,
  Input, HStack, IconButton, Checkbox, Flex, Tag, useToast, Checkbox as ChakraCheckbox, Fade
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import {
  DndContext, closestCenter, useSensor, useSensors, PointerSensor,
  useDroppable
} from '@dnd-kit/core';
import { Clock, X } from 'lucide-react';

function getDateKey(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toDateString();
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getTrimmedWeekdayGrid(selectedDate) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const getMonday = (d) => {
    const copy = new Date(d);
    const day = copy.getDay();
    const diff = (day + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    return copy;
  };
  const start = getMonday(first);
  const end = getMonday(last);
  end.setDate(end.getDate() + 28);

  const days = [];
  let week = [];
  let day = new Date(start);
  while (day <= end) {
    if (day.getDay() >= 1 && day.getDay() <= 5) {
      week.push({ date: new Date(day), inMonth: day.getMonth() === month });
    }
    if (week.length === 5) {
      if (week.some((d) => d.inMonth)) days.push(...week);
      week = [];
    }
    day.setDate(day.getDate() + 1);
  }
  return days;
}

function parseDueDate(due) {
  try {
    const [month, day] = due.split('/').map(Number);
    return new Date(new Date().getFullYear(), month - 1, day);
  } catch {
    return new Date(3000, 0, 1);
  }
}

function formatDateKeyToDue(key) {
  const d = new Date(key);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

function DroppableDayBox({ day, inMonth, isToday, children }) {
  const dateKey = getDateKey(day);
  const { setNodeRef } = useDroppable({ id: dateKey });
  return (
    <Box
      ref={setNodeRef}
      key={dateKey}
      bg={isToday ? 'blue.50' : inMonth ? 'gray.50' : 'gray.100'}
      borderRadius="xl"
      border="2px solid"
      borderColor={isToday ? 'blue.300' : 'gray.200'}
      minH="100px"
      p={2}
      opacity={inMonth ? 1 : 0.6}
      boxShadow={isToday ? 'xl' : 'none'}
      position="relative"
      _hover={{ bg: isToday ? 'blue.100' : 'gray.200' }}
    >
      <Text fontWeight="bold" fontSize="sm" mb={1}>
        {day.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}
      </Text>
      {isToday && (
        <Tag
          size="xs"
          colorScheme="blue"
          borderRadius="full"
          position="absolute"
          top="6px"
          right="6px"
          fontWeight="semibold"
          fontSize="xs"
          textTransform="uppercase"
          px={2}
          py={0.5}
        >
          TODAY
        </Tag>
      )}
      <Flex gap={1} flexWrap="wrap" align="start">
        {children}
      </Flex>
    </Box>
  );
}

export default function CalendarView({ clientList, onClientChange }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterName, setFilterName] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
  const [fadingTasks, setFadingTasks] = useState([]);
  const [showCompletedInCalendar, setShowCompletedInCalendar] = useState(() => {
    return localStorage.getItem('mona_showCompletedTasks') === 'true';
  });
  useEffect(() => {
    localStorage.setItem('mona_showCompletedTasks', showCompletedInCalendar.toString());
  }, [showCompletedInCalendar]);

  const toast = useToast();
  const logoSize = useBreakpointValue({ base: '20px', md: '24px' });
  const sensors = useSensors(useSensor(PointerSensor));
  const todayKey = getDateKey(new Date());

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      setSidebarWidth(Math.max(250, Math.min(e.clientX, 800)));
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const taskMap = useMemo(() => {
    const map = {};
    const year = new Date().getFullYear();
    for (const clientId in clientList) {
      const client = clientList[clientId];
      const allMeetings = [...client.meetings, ...client.pastMeetings];
      for (const meeting of allMeetings) {
        for (const deliverable of meeting.deliverables) {
          for (const task of deliverable.tasks) {
            if (!task.due) continue;
            const [month, day] = task.due.split('/').map(Number);
            if (!month || !day) continue;
            const date = new Date(year, month - 1, day);
            const key = getDateKey(date);
            if (!map[key]) map[key] = [];
            map[key].push({
              id: `${clientId}::${meeting.id}::${deliverable.id}::${task.id}`,
              clientId,
              logo: client.logo?.trim() || `https://logo.clearbit.com/${client.name.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '')}.com`,
              clientName: client.name || 'Unnamed Client',
              assignees: task.assignees || [task.assignee || 'Unassigned'],
              taskName: task.name || 'Untitled Task',
              deliverableName: deliverable.name || 'Untitled Deliverable',
              due: task.due,
              complete: task.complete,
            });
          }
        }
      }
    }
    return map;
  }, [clientList]);

  const allUpcomingTasks = useMemo(() => {
    const all = [];
    Object.values(taskMap).forEach((tasks) => all.push(...tasks));
    return all
      .filter((t) => {
        if (!t.due || t.complete) return false;
        if (filterName.trim()) {
          return t.assignees?.some((n) =>
            n.toLowerCase() === filterName.trim().toLowerCase()
          );
        }
        return true;
      })
      .sort((a, b) => parseDueDate(a.due) - parseDueDate(b.due));
  }, [taskMap, filterName]);

  const toggleComplete = (taskIdParts) => {
    const id = taskIdParts.join('::');
    setFadingTasks((prev) => [...prev, id]);

    const undoRef = { cancelled: false };

    toast({
      title: 'Task marked complete',
      description: (
        <Text
          cursor="pointer"
          fontWeight="bold"
          color="blue.200"
          onClick={() => {
            undoRef.cancelled = true;
            setFadingTasks((prev) => prev.filter((tid) => tid !== id));
            toast.closeAll();
          }}
        >
          Undo
        </Text>
      ),
      status: 'info',
      duration: 4000,
      isClosable: true,
      position: 'bottom-left',
    });

    setTimeout(() => {
      if (undoRef.cancelled) return;
      const [clientId, meetingId, deliverableId, taskId] = taskIdParts;
      const client = structuredClone(clientList[clientId]);
      for (const listKey of ['meetings', 'pastMeetings']) {
        for (const m of client[listKey]) {
          if (m.id !== meetingId) continue;
          for (const d of m.deliverables) {
            if (d.id !== deliverableId) continue;
            for (const t of d.tasks) {
              if (t.id === taskId) {
                t.complete = true;
                onClientChange(clientId, client);
                setFadingTasks((prev) => prev.filter((tid) => tid !== id));
                return;
              }
            }
          }
        }
      }
    }, 300);
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || !over.id || over.id === active.id) return;
    const newDue = formatDateKeyToDue(over.id);
    const [clientId, meetingId, deliverableId, taskId] = active.id.split('::');
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
              return;
            }
          }
        }
      }
    }
  };

  const gridDays = useMemo(() => getTrimmedWeekdayGrid(selectedDate), [selectedDate]);
  const goPrev = () => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)));
  const goNext = () => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)));

  return (
    <Flex height="100vh" overflow="hidden">
      <Box
        width={`${sidebarWidth}px`}
        minWidth="250px"
        maxWidth="500px"
        px={4}
        pr={6}
        borderRight="1px solid"
        borderColor="gray.300"
        overflowY="auto"
        bg="white"
      >
        <Text fontSize="xl" fontWeight="bold" mb={3}>Upcoming Tasks</Text>
        <VStack align="start" spacing={2}>
          {allUpcomingTasks.map((task, idx) => (
            <Tooltip
              key={idx}
              hasArrow
              placement="right"
              label={
                <Box p={2} textAlign="left" maxW="300px">
                  <Text><strong>Due:</strong> {task.due}</Text>
                  <Text><strong>Client:</strong> {task.clientName}</Text>
                  <Text whiteSpace="normal" wordBreak="break-word"><strong>Deliverable:</strong> {task.deliverableName}</Text>
                  <Text whiteSpace="normal" wordBreak="break-word"><strong>Task:</strong> {task.taskName}</Text>
                  <Text><strong>Assignees:</strong> {task.assignees?.join(', ') || 'None'}</Text>
                </Box>
              }
              bg="gray.700"
              color="white"
              borderRadius="md"
              fontSize="sm"
              boxShadow="lg"
            >
              <HStack
                spacing={2}
                align="center"
                opacity={fadingTasks.includes(task.id) ? 0 : 1}
                transition="opacity 0.3s ease"
              >
                <Checkbox
                  isChecked={task.complete}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleComplete(task.id.split('::'));
                  }}
                  size="sm"
                  colorScheme="green"
                />
                <Box
                  cursor="pointer"
                  onClick={() => {
                    localStorage.setItem('LastActiveClientId', task.clientId);
                    location.reload();
                  }}
                >
                  <Text
                    fontSize="sm"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    textDecoration={task.complete ? 'line-through' : 'none'}
                    color={task.complete ? 'gray.500' : 'black'}
                  >
                    {task.due}:{' '}
                    <Image
                      src={task.logo}
                      alt={task.clientName}
                      boxSize="16px"
                      display="inline-block"
                      mr="1"
                      borderRadius="sm"
                    />{' '}
                    {task.taskName} [{task.assignees?.join(', ') || 'Unassigned'}]
                  </Text>
                </Box>
              </HStack>
            </Tooltip>
          ))}
        </VStack>
      </Box>

      <Box
        width="4px"
        cursor="col-resize"
        bg="gray.200"
        _hover={{ bg: "gray.400" }}
        onMouseDown={() => { isResizing.current = true; }}
      />

      <Box flex="1" px={6} overflow="auto">
        <HStack justify="center" mb={4} spacing={6} position="relative">
          <IconButton icon={<ChevronLeftIcon />} onClick={goPrev} aria-label="Prev Month" />
          <Text fontSize="3xl" fontWeight="extrabold">
            {selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <IconButton icon={<ChevronRightIcon />} onClick={goNext} aria-label="Next Month" />
          <Tooltip
            label={`${showCompletedInCalendar ? 'Hide' : 'Show'} completed tasks`}
            placement="bottom"
          >
            <Box position="absolute" right="0">
              <IconButton
                icon={<Clock size={18} />}
                aria-label="Toggle completed tasks"
                size="sm"
                variant="ghost"
                color={showCompletedInCalendar ? "blue.500" : "gray.400"}
                onClick={() => setShowCompletedInCalendar(prev => !prev)}
                position="relative"
                _hover={{ color: showCompletedInCalendar ? "blue.600" : "gray.600" }}
                transition="all 0.2s"
              >
                {!showCompletedInCalendar && (
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    color="red.400"
                    opacity={0.9}
                    pointerEvents="none"
                    style={{ marginTop: '1px' }}
                  >
                    <X size={20} strokeWidth={2} />
                  </Box>
                )}
              </IconButton>
            </Box>
          </Tooltip>
        </HStack>

        <Box mb={6} textAlign="center">
            <Input
            placeholder="Filter by assignee"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              width="300px"
              size="md"
              mx="auto"
            />
        </Box>

        <HStack spacing={4} mb={2} px={1}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} fontWeight="bold" fontSize="md" flex="1" textAlign="center">
              {label}
            </Text>
          ))}
        </HStack>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Box display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={4}>
            {gridDays.map(({ date, inMonth }) => {
              const key = getDateKey(date);
              const isToday = key === todayKey;
              const tasks = taskMap[key] || [];
              const filteredTasks = tasks.filter(t => {
                if (!showCompletedInCalendar && t.complete) return false;
                if (filterName.trim()) {
                  return t.assignees?.some(n => 
                    n.toLowerCase() === filterName.trim().toLowerCase()
                  );
                }
                return true;
              });
              
              return (
                <DroppableDayBox key={key} day={date} inMonth={inMonth} isToday={isToday}>
                  {filteredTasks.map((t) => (
                    <Fade in={showCompletedInCalendar || !t.complete} key={t.id}>
                      {(!showCompletedInCalendar && t.complete) ? null : (
                        <Tooltip
                          hasArrow
                          placement="top"
                          label={
                            <Box p={2} textAlign="left" maxW="300px">
                              <Text><strong>Due:</strong> {t.due}</Text>
                              <Text><strong>Client:</strong> {t.clientName}</Text>
                              <Text whiteSpace="normal" wordBreak="break-word"><strong>Deliverable:</strong> {t.deliverableName}</Text>
                              <Text whiteSpace="normal" wordBreak="break-word"><strong>Task:</strong> {t.taskName}</Text>
                              <Text><strong>Assignees:</strong> {t.assignees?.join(', ') || 'None'}</Text>
                            </Box>
                          }
                          bg="gray.700"
                          color="white"
                          borderRadius="md"
                          fontSize="sm"
                          boxShadow="lg"
                        >
                          <Image
                            src={t.logo}
                            alt={t.clientName}
                            boxSize={logoSize}
                            objectFit="contain"
                            borderRadius="md"
                            border="1px solid #ccc"
                            opacity={t.complete ? 0.4 : 1}
                            filter={t.complete ? 'grayscale(100%)' : 'none'}
                          />
                        </Tooltip>
                      )}
                    </Fade>
                  ))}
                </DroppableDayBox>
              );
            })}
          </Box>
        </DndContext>
      </Box>
    </Flex>
  );
}
