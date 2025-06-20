// src/components/SettingsProvider.jsx
import { createContext, useContext } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  return (
    <SettingsContext.Provider value={{}}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
