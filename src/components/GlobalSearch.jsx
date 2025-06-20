// src/components/GlobalSearch.jsx
import {
    Box,
    Input,
    VStack,
    Text,
    useOutsideClick,
    Checkbox,
    Collapse
  } from '@chakra-ui/react';
  import { useState, useRef, useEffect } from 'react';
  
  function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
  }
  
  export default function GlobalSearch({ clientList, inputProps = {} }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [visible, setVisible] = useState(false);
    const [showCompletedOnly, setShowCompletedOnly] = useState(false);
    const ref = useRef();
  
    useOutsideClick({ ref: ref, handler: () => setVisible(false) });
  
    useEffect(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
  
      const q = normalize(query);
      const matches = [];
  
      for (const clientId in clientList) {
        const client = clientList[clientId];
        const clientName = client.name || 'Unnamed Client';
  
        for (const m of [...client.meetings, ...client.pastMeetings]) {
          for (const d of m.deliverables) {
            for (const t of d.tasks) {
              if (showCompletedOnly && !t.complete) continue;
              const assignees = Array.isArray(t.assignees) ? t.assignees.join(', ') : t.assignee || '';
              const combined = `${t.name} ${assignees}`;
              if (normalize(combined).includes(q) || normalize(clientName).includes(q) || normalize(d.name).includes(q)) {
                matches.push({
                  label: `${clientName} – ${d.name} – ${t.name} – ${assignees} – ${t.due || 'No date'}`,
                  clientId,
                });
              }
            }
          }
        }
      }
  
      setResults(matches.slice(0, 10));
      setVisible(true);
    }, [query, clientList, showCompletedOnly]);
  
    const handleSelect = (r) => {
      localStorage.setItem('LastActiveClientId', r.clientId);
      location.reload();
    };
  
    return (
      <Box position="relative" ref={ref}>
        <VStack spacing={1} align="stretch">
          <Input
            placeholder="Search anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setVisible(true)}
            {...inputProps}
          />
          <Collapse in={visible && query.length > 0} animateOpacity>
            <Checkbox
              size="sm"
              isChecked={showCompletedOnly}
              onChange={(e) => setShowCompletedOnly(e.target.checked)}
              colorScheme="gray"
              opacity={0.6}
              _hover={{ opacity: 1 }}
              fontSize="xs"
              pl={1}
            >
              Completed only
            </Checkbox>
          </Collapse>
        </VStack>
  
        {visible && results.length > 0 && (
          <VStack
            position="absolute"
            top="40px"
            left="0"
            w="100%"
            zIndex="200"
            bg="white"
            boxShadow="sm"
            borderRadius="md"
            spacing={0}
            align="stretch"
            maxH="300px"
            overflowY="auto"
            border="1px solid"
            borderColor="gray.200"
          >
            {results.map((r, i) => (
              <Box
                key={i}
                px={3}
                py={2}
                _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                fontSize="sm"
                onClick={() => handleSelect(r)}
                borderBottom={i < results.length - 1 ? "1px solid" : "none"}
                borderColor="gray.100"
              >
                {r.label}
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    );
  }
  