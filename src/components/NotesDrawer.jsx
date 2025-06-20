import {
    Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody,
    DrawerCloseButton, IconButton, Textarea, useDisclosure
  } from '@chakra-ui/react';
  import { EditIcon } from '@chakra-ui/icons';
  
  export default function NotesDrawer({ notes, onChange }) {
    const { isOpen, onOpen, onClose } = useDisclosure();
  
    return (
      <>
        <IconButton
          icon={<EditIcon />}
          size="sm"
          onClick={onOpen}
          aria-label="Open Notes"
          colorScheme="purple"
        />
        <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader>Client Notes</DrawerHeader>
            <DrawerBody>
              <Textarea
                value={notes}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter any notes about this client..."
                size="md"
                height="100%"
                resize="vertical"
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </>
    );
  }
  