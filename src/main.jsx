import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import AuthWrapper from './components/AuthWrapper';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider>
      <AuthWrapper />
    </ChakraProvider>
  </React.StrictMode>
);
