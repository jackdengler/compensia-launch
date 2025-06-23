// src/App.jsx
import { useEffect, useState } from 'react';
import {
  ChakraProvider, Box, Tabs, TabList, TabPanels, Tab, TabPanel,
  Spinner, Text, VStack
} from '@chakra-ui/react';
import ClientManager from './ClientManager';
import MeetingBoard from './MeetingBoard';
import CalendarView from './CalendarView';
import WeeklyView from './WeeklyView';
import NotesDrawer from './NotesDrawer';
import LoginPage from './LoginPage';
import SettingsDrawer from './SettingsDrawer';
import GlobalSearch from './GlobalSearch';
import Header from './Header';
import TaskBuckets from './components/TaskBuckets';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [clientList, setClientList] = useState({});
  const [sharedClients, setSharedClients] = useState({});
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // ✅ Replaced fetch call with localStorage load
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const stored = localStorage.getItem(`ClientList_${currentUser}`);
    const parsed = stored ? JSON.parse(stored) : {};
    setClientList(parsed.clients || parsed);
    setLoading(false);
  }, [currentUser]);

  // Load shared clients
  useEffect(() => {
    fetch('/api/shared')
      .then((res) => res.json())
      .then((data) => setSharedClients(data))
      .catch((err) => console.error('Failed to load shared clients', err));
  }, []);

  // ❌ Removed broken POST to /api/data/:username

  const onClientChange = (clientId, updatedClient, isShared = false) => {
    console.log("onClientChange in App.jsx called with:", clientId, updatedClient, isShared);
    if (isShared) {
      fetch(`/api/shared/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClient),
      }).then(() => {
        setSharedClients((prev) => ({ ...prev, [clientId]: updatedClient }));
      });
    } else {
      setClientList((prev) => ({ ...prev, [clientId]: updatedClient }));
    }
  };

  const allClients = { ...sharedClients, ...clientList };
  const selectedClient = allClients[selectedClientId];

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  if (loading && Object.keys(allClients).length === 0) {
    return (
      <ChakraProvider>
        <VStack height="100vh" justify="center">
          <Spinner size="xl" />
          <Text>Loading your data...</Text>
        </VStack>
      </ChakraProvider>
    );
  }

  const finalClientList = Object.keys(clientList).length > 0 ? clientList : {
    'mock-client-1': {
      id: 'mock-client-1',
      name: 'Mock Client for D&D Test',
      meetings: [
        {
          id: 'mock-meeting-1',
          name: 'Mock Meeting',
          deliverables: [
            { id: 'd1', name: 'Deliverable Alpha', tasks: [{ id: 't1', name: 'Task One' }], bucket: 'Unassigned' },
            { id: 'd2', name: 'Deliverable Beta', tasks: [{ id: 't2', name: 'Task Two' }], bucket: 'Active Work' },
          ]
        }
      ],
      pastMeetings: []
    }
  };

  return (
    <ChakraProvider>
      <GlobalSearch
        clients={allClients}
        onSelect={(clientId) => {
          setSelectedClientId(clientId);
          setActiveTab(1);
        }}
      />
      <SettingsDrawer currentUser={currentUser} setCurrentUser={setCurrentUser} />

      {/* Test: Render TaskBuckets outside of Tabs */}
      <Box p={4} border="2px dashed red" my={4}>
        <Text fontWeight="bold" mb={2} color="red.500">
          TESTING: TaskBuckets rendered OUTSIDE Tabs structure.
        </Text>
        <TaskBuckets clientList={allClients} onClientChange={onClientChange} />
      </Box>

      {/* Original Tabs structure - can be commented out or left for context */}
      <Box p={2}>
        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed">
          <TabList>
            <Tab>Clients</Tab>
            <Tab isDisabled={!selectedClient}>Project</Tab>
            <Tab isDisabled={!selectedClient}>Calendar</Tab>
            <Tab isDisabled={!selectedClient}>Week</Tab>
            <Tab isDisabled={!selectedClient}>Notes</Tab>
            <Tab>Tasks Overview</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <ClientManager
                clientList={clientList}
                sharedClients={sharedClients}
                onClientSelect={setSelectedClientId}
                onClientChange={onClientChange}
              />
            </TabPanel>
            <TabPanel>
              {selectedClient && (
                <>
                  <Header client={selectedClient} onClientChange={(c) => onClientChange(selectedClientId, c)} />
                  <MeetingBoard client={selectedClient} onClientChange={(c) => onClientChange(selectedClientId, c)} />
                </>
              )}
            </TabPanel>
            <TabPanel>
              {selectedClient && (
                <CalendarView clientList={allClients} onClientChange={onClientChange} />
              )}
            </TabPanel>
            <TabPanel>
              {selectedClient && (
                <WeeklyView clientList={allClients} onClientChange={onClientChange} />
              )}
            </TabPanel>
            <TabPanel>
              {selectedClient && (
                <NotesDrawer client={selectedClient} onClientChange={(c) => onClientChange(selectedClientId, c)} />
              )}
            </TabPanel>
            <TabPanel>
              {/* TaskBuckets was here - now rendered above for test */}
              {/* <TaskBuckets clientList={allClients} onClientChange={onClientChange} /> */}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ChakraProvider>
  );
}

export default App;
