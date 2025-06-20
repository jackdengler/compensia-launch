// src/MeetingBoard.jsx
import React from 'react';
import MeetingBoardBase from './MeetingBoardBase';

export default function MeetingBoard({ clientId, clientData, onClientChange }) {
  return (
    <MeetingBoardBase
      clientId={clientId}
      clientData={clientData}
      onClientChange={(data) => onClientChange(clientId, data)} // ✅ fix applied here
    />
  );
}
