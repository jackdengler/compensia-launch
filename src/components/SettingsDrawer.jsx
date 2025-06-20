import {
  Box,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  IconButton,
  Button,
  VStack,
  Text,
  Collapse,
  Input,
  HStack,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure,
} from '@chakra-ui/react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function SettingsDrawer({ username, clientId, clientData, onClientChange, onDeleteClient }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentUser, setCurrentUser] = useState('');
  const [users, setUsers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showClientSettings, setShowClientSettings] = useState(false);
  const cancelRef = useRef();
  const toast = useToast();

  useEffect(() => {
    const current = localStorage.getItem('mona_active_user');
    const all = JSON.parse(localStorage.getItem('mona_users') || '[]');
    setCurrentUser(current);
    setUsers(all);
    setNewName(current);
  }, [isOpen]);

  const saveUsers = (updated) => {
    localStorage.setItem('mona_users', JSON.stringify(updated));
    setUsers(updated);
  };

  const handleRename = () => {
    const trimmed = newName.trim().toLowerCase();
    if (!trimmed || trimmed === currentUser) return;
    if (users.some(u => u.username === trimmed)) {
      alert('Username already exists.');
      return;
    }

    const updatedUsers = users.map(u =>
      u.username === currentUser ? { ...u, username: trimmed } : u
    );

    const data = localStorage.getItem(`ClientList_${currentUser}`);
    const activeTab = localStorage.getItem(`LastActiveClientId_${currentUser}`);

    localStorage.setItem(`ClientList_${trimmed}`, data);
    if (activeTab) localStorage.setItem(`LastActiveClientId_${trimmed}`, activeTab);

    localStorage.removeItem(`ClientList_${currentUser}`);
    localStorage.removeItem(`LastActiveClientId_${currentUser}`);
    localStorage.setItem('mona_active_user', trimmed);

    saveUsers(updatedUsers);
    setCurrentUser(trimmed);
    setNewName(trimmed);
    location.reload();
  };

  const handlePasswordChange = () => {
    const updatedUsers = users.map(u =>
      u.username === currentUser ? { ...u, password: newPassword.trim() || null } : u
    );
    saveUsers(updatedUsers);
    setNewPassword('');
    alert('Password updated.');
  };

  const handleLogout = () => {
    localStorage.removeItem('mona_active_user');
    location.reload();
  };

  const handleDeleteClient = () => {
    onDeleteClient(clientId);
    setDeleteOpen(false);
  };

  const isOwner = clientData?.owner === username;
  const isShared = clientData?.shared;
  const isCalendarOrWeekly = ['__calendar__', '__weekly__'].includes(clientId);

  return (
    <>
      <IconButton
        icon={<SettingsIcon />}
        size="sm"
        onClick={onOpen}
        aria-label="Open Settings"
        colorScheme="gray"
      />
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Settings</DrawerHeader>
          <DrawerBody>
            <VStack align="start" spacing={4}>

              {/* 🔧 Manage Client Section */}
              {!isCalendarOrWeekly && (
                <>
                  <Button
                    size="sm"
                    width="100%"
                    variant="solid"
                    colorScheme="gray"
                    onClick={() => setShowClientSettings((prev) => !prev)}
                  >
                    {showClientSettings ? 'Hide Client Settings' : 'Manage Client'}
                  </Button>

                  <Collapse in={showClientSettings} animateOpacity style={{ width: '100%' }}>
                    {clientData ? (
                      <VStack align="start" spacing={3} mt={2}>
                        {isShared && (
                          <Text fontSize="sm"><strong>Owner:</strong> {clientData.owner}</Text>
                        )}

                        {isOwner && (
                          <Button
                            size="sm"
                            colorScheme="purple"
                            onClick={() => {
                              const updated = {
                                ...clientData,
                                shared: !clientData.shared,
                              };
                              onClientChange(clientId, updated);
                              toast({
                                title: `Client is now ${updated.shared ? 'Public' : 'Private'}`,
                                status: 'success',
                                duration: 2000,
                                isClosable: true,
                              });
                            }}
                          >
                            {clientData.shared ? 'Make Private' : 'Make Public'}
                          </Button>
                        )}

                        {isOwner && (
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => setDeleteOpen(true)}
                          >
                            Delete Client
                          </Button>
                        )}

                        {!isOwner && isShared && (
                          <Button
                            size="sm"
                            colorScheme="red"
                            onClick={() => onDeleteClient(clientId)}
                          >
                            Remove From View
                          </Button>
                        )}
                      </VStack>
                    ) : (
                      <Text fontSize="sm" color="gray.500" mt={2}>No client selected.</Text>
                    )}
                  </Collapse>
                </>
              )}

              {/* 👤 Manage Account Section */}
              <Button
                size="sm"
                width="100%"
                variant="solid"
                colorScheme="gray"
                onClick={() => setShowAccountSettings((prev) => !prev)}
              >
                {showAccountSettings ? 'Hide Account Settings' : 'Manage Account'}
              </Button>

              <Collapse in={showAccountSettings} animateOpacity style={{ width: '100%' }}>
                <VStack align="start" spacing={4} mt={2}>
                  <HStack>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} size="sm" />
                    <Button size="sm" onClick={handleRename}>Rename</Button>
                  </HStack>

                  <HStack>
                    <Input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      size="sm"
                      placeholder="Leave blank to remove password"
                    />
                    <Button size="sm" onClick={handlePasswordChange}>Update</Button>
                  </HStack>

                  <Button
                    colorScheme="red"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete Account
                  </Button>
                </VStack>
              </Collapse>

              <Button
                size="sm"
                width="100%"
                variant="solid"
                colorScheme="gray"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        isOpen={deleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete Client</AlertDialogHeader>
            <AlertDialogBody>
              This will permanently delete this client and cannot be undone. Are you sure?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteClient} ml={3}>
                Delete Client
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
