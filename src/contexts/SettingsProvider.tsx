
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import type { GlobalSettings } from '@/lib/types';
import { DEFAULT_GLOBAL_SETTINGS } from '@/lib/constants';
import { useAuth } from './AuthProvider'; // Import useAuth

interface SettingsContextType {
  settings: GlobalSettings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { db } = useFirebase();
  const { user, loading: authLoading } = useAuth(); // Get auth state
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (!authLoading) { // Only proceed if auth state is resolved
      const settingsDocRef = doc(db, 'settings', 'global_settings');
      unsubscribe = onSnapshot(
        settingsDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as GlobalSettings);
          } else {
            // console.warn('Global settings document not found. Using default settings.');
            setSettings(DEFAULT_GLOBAL_SETTINGS); // Use default if not found
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching global settings:', error);
          // If permissions error occurs, log it and use defaults.
          setSettings(DEFAULT_GLOBAL_SETTINGS); // Use default on error
          setLoading(false);
        }
      );
    } else {
      // If auth is still loading, settings are also effectively loading.
      setLoading(true);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [db, authLoading, user]); // Depend on authLoading and user

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
