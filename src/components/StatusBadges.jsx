import { HStack, Badge } from '@chakra-ui/react';
import { useState } from 'react';

const STATUS_OPTIONS = {
  type: ['Tech', 'Life Science', 'Other'],
  status: ['Active', 'On Hold', 'Other'],
  privacy: ['Public', 'Private'],
};

const STATUS_COLORS = {
  Tech: 'blue',
  'Life Science': 'teal',
  Other: 'gray',
  Active: 'green',
  'On Hold': 'yellow',
  Public: 'purple',
  Private: 'red',
};

export default function StatusBadges() {
  const [typeIndex, setTypeIndex] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [privacyIndex, setPrivacyIndex] = useState(0);

  const handleCycle = (key, setter, index, options) => {
    setter((index + 1) % options.length);
  };

  return (
    <HStack spacing={4} justify="center" wrap="wrap">
      <Badge
        colorScheme={STATUS_COLORS[STATUS_OPTIONS.type[typeIndex]]}
        cursor="pointer"
        onClick={() =>
          handleCycle('type', setTypeIndex, typeIndex, STATUS_OPTIONS.type)
        }
      >
        {STATUS_OPTIONS.type[typeIndex]}
      </Badge>

      <Badge
        colorScheme={STATUS_COLORS[STATUS_OPTIONS.status[statusIndex]]}
        cursor="pointer"
        onClick={() =>
          handleCycle('status', setStatusIndex, statusIndex, STATUS_OPTIONS.status)
        }
      >
        {STATUS_OPTIONS.status[statusIndex]}
      </Badge>

      <Badge
        colorScheme={STATUS_COLORS[STATUS_OPTIONS.privacy[privacyIndex]]}
        cursor="pointer"
        onClick={() =>
          handleCycle('privacy', setPrivacyIndex, privacyIndex, STATUS_OPTIONS.privacy)
        }
      >
        {STATUS_OPTIONS.privacy[privacyIndex]}
      </Badge>
    </HStack>
  );
}
