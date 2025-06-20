import {
    Box,
    HStack,
    Tag,
    TagLabel,
    TagCloseButton,
    IconButton,
    Input,
  } from '@chakra-ui/react';
  import { AddIcon } from '@chakra-ui/icons';
  import { useState, useRef, useEffect } from 'react';
  
  export default function TeamMembers() {
    const [members, setMembers] = useState(['Alice', 'Bob']);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const inputRef = useRef(null);
  
    const addMember = () => {
      const name = newName.trim();
      if (name !== '') {
        setMembers([...members, name]);
      }
      setNewName('');
      setAdding(false);
    };
  
    const removeMember = (nameToRemove) => {
      setMembers(members.filter((name) => name !== nameToRemove));
    };
  
    useEffect(() => {
      if (adding && inputRef.current) {
        inputRef.current.focus();
      }
    }, [adding]);
  
    return (
      <Box display="flex" justifyContent="center">
        <HStack spacing={3} wrap="wrap">
          {members.map((name) => (
            <Tag key={name} size="lg" borderRadius="full" colorScheme="blue">
              <TagLabel>{name}</TagLabel>
              <TagCloseButton onClick={() => removeMember(name)} />
            </Tag>
          ))}
  
          {adding ? (
            <Input
              ref={inputRef}
              size="sm"
              width="100px"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={addMember}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addMember();
                }
              }}
              placeholder="Name"
            />
          ) : (
            <IconButton
              size="sm"
              icon={<AddIcon />}
              onClick={() => setAdding(true)}
              aria-label="Add team member"
              colorScheme="blue"
            />
          )}
        </HStack>
      </Box>
    );
  }
  