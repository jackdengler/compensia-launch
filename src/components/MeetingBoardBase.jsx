// src/components/MeetingBoardBase.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  Button,
  IconButton,
  Flex,
  Heading,
  VStack,
  Text
} from '@chakra-ui/react';
import {
  AddIcon, DragHandleIcon, TimeIcon, RepeatIcon
} from '@chakra-ui/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MeetingCard from './MeetingCard';

function SortableMeeting({ meeting, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: meeting.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Box ref={setNodeRef} style={style} position="relative">
      <Box position="absolute" top={2} left={2} zIndex={1} {...attributes} {...listeners}>
        <IconButton icon={<DragHandleIcon />} size="xs" variant="ghost" aria-label="Drag meeting" />
      </Box>
      <Box pl={8}>
        <MeetingCard meeting={meeting} {...props} />
      </Box>
    </Box>
  );
}

function darken(hex, amount = 40) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(((num >> 16) & 255) - amount, 0);
  const g = Math.max(((num >> 8) & 255) - amount, 0);
  const b = Math.max((num & 255) - amount, 0);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export default function MeetingBoardBase({ clientId, clientData, onClientChange, viewingPast }) {
  // Initialize clientData if it's undefined or missing required properties
  const safeClientData = {
    meetings: [],
    pastMeetings: [],
    team: [],
    ...clientData
  };

  const updateClient = (updates) => {
    onClientChange({ ...safeClientData, ...updates });
  };

  const themeColor = safeClientData.themeColor || (viewingPast ? 'purple.100' : 'blue.100');
  const themeBorder = safeClientData.themeColor ? darken(safeClientData.themeColor, 40) : (viewingPast ? 'purple.300' : 'blue.300');

  const ensureAdHocCards = () => {
    let updated = false;
    const updatedData = { ...safeClientData };

    if (!safeClientData.meetings.some((m) => m.isAdHoc)) {
      updatedData.meetings = [
        { id: 'adhoc', isAdHoc: true, name: '', date: '', deliverables: [] },
        ...safeClientData.meetings,
      ];
      updated = true;
    }

    if (!safeClientData.pastMeetings.some((m) => m.isAdHoc)) {
      updatedData.pastMeetings = [
        { id: 'adhoc_past', isAdHoc: true, name: '', date: '', deliverables: [] },
        ...safeClientData.pastMeetings,
      ];
      updated = true;
    }

    if (updated) {
      onClientChange(updatedData);
    }
  };

  useEffect(() => {
    ensureAdHocCards();
  }, []);

  const addAdHocDeliverable = () => {
    const listKey = viewingPast ? 'pastMeetings' : 'meetings';
    const targetId = viewingPast ? 'adhoc_past' : 'adhoc';
    const updatedList = safeClientData[listKey].map((m) =>
      m.id === targetId
        ? { ...m, deliverables: [...m.deliverables, { id: Date.now().toString(), name: '', tasks: [] }] }
        : m
    );
    updateClient({ [listKey]: updatedList });
  };

  const addMeeting = () => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const newMeeting = { id: `${Date.now()}`, date: dateStr, name: '', isAdHoc: false, deliverables: [] };
    updateClient({ meetings: [...safeClientData.meetings, newMeeting] });
  };

  const updateMeeting = (id, updated) => {
    const listKey = viewingPast ? 'pastMeetings' : 'meetings';
    const updatedList = safeClientData[listKey].map((m) => (m.id === id ? updated : m));
    updateClient({ [listKey]: updatedList });
  };

  const deleteMeeting = (id) => {
    updateClient({ meetings: safeClientData.meetings.filter((m) => m.id !== id) });
  };

  const moveToPast = (id) => {
    const m = safeClientData.meetings.find((m) => m.id === id);
    if (!m) return;
    updateClient({
      meetings: safeClientData.meetings.filter((m) => m.id !== id),
      pastMeetings: [...safeClientData.pastMeetings, m],
    });
  };

  const moveToCurrent = (id) => {
    const m = safeClientData.pastMeetings.find((m) => m.id === id);
    if (!m) return;
    updateClient({
      pastMeetings: safeClientData.pastMeetings.filter((m) => m.id !== id),
      meetings: [...safeClientData.meetings, m],
    });
  };

  const moveAdHocDeliverableToPast = (deliverable) => {
    const current = safeClientData.meetings.find((m) => m.isAdHoc);
    const past = safeClientData.pastMeetings.find((m) => m.isAdHoc);
    if (!current || !past) return;
    updateClient({
      meetings: safeClientData.meetings.map((m) =>
        m.isAdHoc ? { ...m, deliverables: m.deliverables.filter((d) => d.id !== deliverable.id) } : m
      ),
      pastMeetings: safeClientData.pastMeetings.map((m) =>
        m.isAdHoc ? { ...m, deliverables: [...m.deliverables, deliverable] } : m
      ),
    });
  };

  const moveAdHocDeliverableToCurrent = (deliverable) => {
    const current = safeClientData.meetings.find((m) => m.isAdHoc);
    const past = safeClientData.pastMeetings.find((m) => m.isAdHoc);
    if (!current || !past) return;
    updateClient({
      pastMeetings: safeClientData.pastMeetings.map((m) =>
        m.isAdHoc ? { ...m, deliverables: m.deliverables.filter((d) => d.id !== deliverable.id) } : m
      ),
      meetings: safeClientData.meetings.map((m) =>
        m.isAdHoc ? { ...m, deliverables: [...m.deliverables, deliverable] } : m
      ),
    });
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const [fromMeetingId, deliverableId] = active.id.split('::');
    const toMeetingId = over.id;
    if (!deliverableId || !fromMeetingId || !toMeetingId) return;

    const listKey = viewingPast ? 'pastMeetings' : 'meetings';
    const from = safeClientData[listKey].find((m) => m.id === fromMeetingId);
    const to = safeClientData[listKey].find((m) => m.id === toMeetingId);
    if (!from || !to) return;

    const deliverable = from.deliverables.find((d) => d.id === deliverableId);
    if (!deliverable) return;

    updateClient({
      [listKey]: safeClientData[listKey].map((m) => {
        if (m.id === fromMeetingId) {
          return { ...m, deliverables: m.deliverables.filter((d) => d.id !== deliverableId) };
        }
        if (m.id === toMeetingId) {
          return { ...m, deliverables: [...m.deliverables, deliverable] };
        }
        return m;
      }),
    });
  };

  const listKey = viewingPast ? 'pastMeetings' : 'meetings';
  const visibleMeetings = safeClientData[listKey]?.filter((m) => !m.isAdHoc || m.deliverables.length > 0) || [];
  const adHoc = safeClientData[listKey]?.find((m) => m.isAdHoc);

  return (
    <Box bg={viewingPast ? 'gray.50' : 'white'} minH="100vh">
      <Box py={6} px={6}>
        <Box overflowX="auto" pb={4}>
          <HStack spacing={8} align="start" minW="fit-content">
            {/* Ad-hoc Section - Always First */}
            {(viewingPast ? safeClientData.pastMeetings : safeClientData.meetings)
              ?.filter(m => m.isAdHoc)
              .map(meeting => meeting.deliverables.length > 0 && (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onUpdate={(id, updated) => {
                    const listKey = viewingPast ? 'pastMeetings' : 'meetings';
                    const updatedList = safeClientData[listKey].map((m) =>
                      m.id === id ? updated : m
                    );
                    updateClient({ [listKey]: updatedList });
                  }}
                  onMoveDeliverableToPast={
                    !viewingPast ? moveAdHocDeliverableToPast : undefined
                  }
                  onMoveDeliverableToCurrent={
                    viewingPast ? moveAdHocDeliverableToCurrent : undefined
                  }
                  team={safeClientData.team || []}
                isReadOnly={viewingPast}
                  client={safeClientData}
              />
            ))}

            {/* Regular Meetings */}
            {(viewingPast ? safeClientData.pastMeetings : safeClientData.meetings)
              ?.filter(m => !m.isAdHoc)
              .map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onUpdate={(id, updated) => {
                    const listKey = viewingPast ? 'pastMeetings' : 'meetings';
                    const updatedList = safeClientData[listKey].map((m) =>
                      m.id === id ? updated : m
                    );
                    updateClient({ [listKey]: updatedList });
                  }}
                  onDelete={
                    !meeting.isAdHoc
                      ? (id) => {
                          const listKey = viewingPast ? 'pastMeetings' : 'meetings';
                          const filtered = safeClientData[listKey].filter((m) => m.id !== id);
                          updateClient({ [listKey]: filtered });
                        }
                      : undefined
                  }
                  onMoveToPast={
                    !viewingPast
                      ? () => {
                          const filtered = safeClientData.meetings.filter((m) => m.id !== meeting.id);
                          updateClient({
                            meetings: filtered,
                            pastMeetings: [...safeClientData.pastMeetings, meeting],
                          });
                        }
                      : undefined
                  }
                  onMoveToCurrent={
                    viewingPast
                      ? () => {
                          const filtered = safeClientData.pastMeetings.filter((m) => m.id !== meeting.id);
                          updateClient({
                            pastMeetings: filtered,
                            meetings: [...safeClientData.meetings, meeting],
                          });
                        }
                      : undefined
                  }
                  team={safeClientData.team || []}
                  isReadOnly={viewingPast && !meeting.isAdHoc}
                  client={safeClientData}
                />
              ))}
          </HStack>
        </Box>
      </Box>
    </Box>
  );
}
