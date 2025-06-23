import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Image,
  InputGroup,
  InputRightElement,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  HStack,
  Collapse,
  useToast,
  Center,
  Container,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ViewIcon, ViewOffIcon, LockIcon } from '@chakra-ui/icons';

const MotionBox = motion(Box);
const MotionImage = motion(Image);
const ADMIN_PASSWORD = 'admin123';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function LoginPage({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState('');
  const [newPasswords, setNewPasswords] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);
  const [targetUser, setTargetUser] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure();

  const {
    isOpen,
    onOpen,
    onClose: onAdminClose,
  } = useDisclosure();

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data || []))
      .catch((err) => console.error('Failed to fetch users:', err));
  }, []);

  const triggerShake = () => setShakeKey((k) => k + 1);

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First get list of users to check if this one exists
      const usersRes = await fetch(`${BACKEND_URL}/api/users`);
const usersList = await usersRes.json();

if (!Array.isArray(usersList)) {
  throw new Error("Failed to load users list");
}

const user = usersList.find(u => 
  u.username.toLowerCase() === username.trim().toLowerCase()
);

      
      if (!user) {
        setError('User not found. Would you like to create a new account?');
        setMode('create');
        setIsLoading(false);
        return;
      }

      // If user has a password set but none provided
      if (user.hasPassword && !pw) {
        setError('Please enter your password');
        setIsLoading(false);
        return;
      }

      // Attempt login
      try {
        await onLogin(username.trim(), pw);
      } catch (err) {
        if (err.message === 'Incorrect password') {
          setError('Incorrect password');
          triggerShake();
        } else {
          setError(err.message || 'Login failed');
        }
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create account
      const createRes = await fetch(`${BACKEND_URL}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(),
          password: pw || null // Include password if provided
        }),
      });
      
      const createResult = await createRes.json();
      
      if (!createRes.ok) {
        if (createRes.status === 409) {
          setError('Username already exists. Please choose another one.');
          return;
        }
        throw new Error(createResult.error || 'Failed to create account');
      }
      
      toast({ 
        title: 'Account created successfully!', 
        description: 'Logging you in...',
        status: 'success', 
        duration: 2000,
        position: 'top'
      });
      
      // Log in with the new account
      await onLogin(username.trim(), pw);
    } catch (err) {
      console.error('Create account error:', err);
      setError(err.message || 'Failed to create account');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      mode === 'login' ? handleLogin() : handleCreate();
    }
  };

  const tryAdminLogin = () => {
    if (adminPwInput === ADMIN_PASSWORD) {
      setAdminMode(true);
      setAdminPwInput('');
      onAdminClose();
  
      fetch(`${BACKEND_URL}/api/users`)
        .then((res) => res.json())
        .then((data) => setUsers(data || []))
        .catch((err) => console.error('Failed to fetch users:', err));
    } else {
      toast({
        title: 'Incorrect admin password',
        status: 'error',
        duration: 2000,
        position: 'top'
      });
    }
  };

  const confirmAndExecute = () => {
    if (confirmPw !== ADMIN_PASSWORD) {
      toast({
        title: 'Incorrect admin password',
        status: 'error',
        duration: 2000,
        position: 'top'
      });
      return;
    }

    if (confirmAction === 'delete') {
      fetch(`${BACKEND_URL}/api/users/${targetUser}`, { method: 'DELETE' })
        .then(() => {
          setUsers(users.filter(u => u.username !== targetUser));
          toast({
            title: 'User deleted successfully',
            status: 'success',
            duration: 2000,
            position: 'top'
          });
        })
        .catch(() => {
          toast({
            title: 'Failed to delete user',
            status: 'error',
            duration: 2000,
            position: 'top'
          });
        });
    }

    if (confirmAction === 'reset') {
      fetch(`${BACKEND_URL}/api/users/${targetUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPasswords[targetUser] || null }),
      })
        .then(() => {
          toast({
            title: 'Password reset successfully',
            status: 'success',
            duration: 2000,
            position: 'top'
          });
        })
        .catch(() => {
          toast({
            title: 'Failed to reset password',
            status: 'error',
            duration: 2000,
            position: 'top'
          });
      });
    }

    setConfirmPw('');
    setConfirmAction(null);
    setTargetUser('');
    onConfirmClose();
  };

  const selectedUser = users.find((u) => u.username === username);

  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      pt={16}
      bgGradient="linear(to-br, blue.50, purple.50, blue.50)"
      position="relative"
      overflow="hidden"
      animation="gradient 15s ease infinite"
      sx={{
        "@keyframes gradient": {
          "0%": {
            backgroundPosition: "0% 50%"
          },
          "50%": {
            backgroundPosition: "100% 50%"
          },
          "100%": {
            backgroundPosition: "0% 50%"
          }
        }
      }}
    >
      <IconButton
        icon={<LockIcon />}
        size="sm"
        position="absolute"
        top={3}
        right={3}
        onClick={onOpen}
        aria-label="Admin access"
      />

      <Container maxW="container.md" display="flex" flexDirection="column" alignItems="center">
      <MotionImage
        src="/logo.png"
        alt="Mona Logo"
          width="500px"
        height="auto"
          mb={12}
          animate={{ 
            scale: [1, 1.01, 1],
            y: [0, -3, 0]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          style={{
            filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.1))"
          }}
      />

      <MotionBox
        key={shakeKey}
          animate={
            error 
              ? { x: [-10, 10, -10, 10, 0] }
              : isLoggingIn 
                ? { opacity: 0, scale: 0.9, y: -20 } 
                : { opacity: 1, scale: 1 }
          }
          transition={{ 
            duration: error ? 0.4 : 0.3,
            type: error ? 'spring' : 'tween'
          }}
          bg="rgba(255, 255, 255, 0.9)"
          backdropFilter="blur(10px)"
          p={8}
        borderRadius="2xl"
        boxShadow="lg"
        minW="320px"
          maxW="400px"
          width="100%"
          border="1px solid"
          borderColor="gray.100"
          _hover={{
            boxShadow: "xl",
            transform: "translateY(-2px)",
            transition: "all 0.2s ease"
          }}
      >
        {!adminMode ? (
            <VStack spacing={4}>
            <Input
              placeholder="Username"
                size="lg"
              value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
              onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                _focus={{
                  borderColor: 'blue.400',
                  boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                }}
            />
              
              <Collapse in={true} animateOpacity style={{ width: '100%' }}>
                <InputGroup size="lg">
                <Input
                  placeholder="Password"
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                    onChange={(e) => {
                      setPw(e.target.value);
                      setError('');
                    }}
                  onKeyDown={handleKeyDown}
                    isDisabled={isLoading}
                    _focus={{
                      borderColor: 'blue.400',
                      boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                    }}
                />
                <InputRightElement>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Toggle password visibility"
                    icon={showPw ? <ViewOffIcon /> : <ViewIcon />}
                    onClick={() => setShowPw(!showPw)}
                      isDisabled={isLoading}
                  />
                </InputRightElement>
              </InputGroup>
            </Collapse>

              {error && (
                <Text 
                  color="red.500" 
                  fontSize="sm" 
                  fontWeight="medium"
                  textAlign="center"
                  px={2}
                >
                  {error}
                </Text>
              )}

            <Button
              colorScheme={mode === 'login' ? 'blue' : 'green'}
                size="lg"
                width="full"
              onClick={mode === 'login' ? handleLogin : handleCreate}
                isLoading={isLoading}
                loadingText={mode === 'login' ? 'Logging in...' : 'Creating...'}
            >
                {mode === 'login' ? 'Login' : 'Create Account'}
            </Button>

            <Button
              size="sm"
              variant="link"
              onClick={() => {
                setMode(mode === 'login' ? 'create' : 'login');
                setError('');
                  setPw('');
              }}
                isDisabled={isLoading}
            >
              {mode === 'login' ? '➕ Create New Account' : '🔙 Back to Login'}
            </Button>
          </VStack>
        ) : (
          <VStack spacing={4} align="stretch">
            <Text fontSize="xl" fontWeight="bold">Admin Panel</Text>
            {users.map((u) => (
                <Box 
                  key={u.username} 
                  border="1px solid" 
                  borderColor="gray.200" 
                  p={4} 
                  borderRadius="lg"
                  bg="gray.50"
                >
                <Text fontWeight="bold">{u.username}</Text>
                  <HStack mt={3}>
                    <Button 
                      size="sm" 
                      colorScheme="blue" 
                      onClick={() => onLogin(u.username)}
                    >
                    Login as
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => {
                      setTargetUser(u.username);
                      setConfirmAction('delete');
                      onConfirmOpen();
                    }}
                  >
                    Delete
                  </Button>
                </HStack>
                <HStack mt={2}>
                  <Input
                    size="sm"
                    placeholder="New password"
                    value={newPasswords[u.username] || ''}
                    onChange={(e) =>
                      setNewPasswords((prev) => ({
                        ...prev,
                        [u.username]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetUser(u.username);
                      setConfirmAction('reset');
                      onConfirmOpen();
                    }}
                  >
                    Reset
                  </Button>
                </HStack>
              </Box>
            ))}
            <Button
              mt={4}
              colorScheme="gray"
              variant="outline"
              onClick={() => setAdminMode(false)}
            >
              Exit Admin Mode
            </Button>
          </VStack>
        )}
        </MotionBox>
      </Container>

      <Modal isOpen={isOpen} onClose={onAdminClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Admin Login</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              placeholder="Enter admin password"
              type="password"
              value={adminPwInput}
              onChange={(e) => setAdminPwInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') tryAdminLogin();
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={tryAdminLogin}>
              Access Admin
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

        <Modal isOpen={isConfirmOpen} onClose={onConfirmClose} isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
          <ModalContent>
            <ModalHeader>Confirm Admin Password</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Input
                placeholder="Re-enter admin password"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={confirmAndExecute}>
                Confirm
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
    </Box>
  );
}
