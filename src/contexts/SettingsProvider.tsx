
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import type { GlobalSettings } from '@/lib/types';
import { DEFAULT_GLOBAL_SETTINGS } from '@/lib/constants';
import { useAuth } from './AuthProvider';

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
  const { loading: authLoading } = useAuth(); // Removed 'user' dependency here for fetching global settings
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); // Indicate that settings are being loaded or re-evaluated

    if (authLoading) {
      // If auth is still loading, settings are effectively loading.
      // setLoading(true) is already called.
      return; // Don't proceed until auth state (and Firebase init) is resolved.
    }

    // Auth state is resolved (authLoading is false).
    // Attempt to fetch global settings regardless of user login state.
    const settingsDocRef = doc(db, 'settings', 'global_settings');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as GlobalSettings);
        } else {
          // console.warn('Global settings document not found. Using default settings.');
          setSettings(DEFAULT_GLOBAL_SETTINGS);
        }
        setLoading(false); // Settings (or defaults) are now loaded
      },
      (error) => {
        console.error('Error fetching global settings:', error);
        // If permissions error or other error, fallback to defaults.
        setSettings(DEFAULT_GLOBAL_SETTINGS);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe(); // Clean up the listener
    };
  }, [db, authLoading]); // Dependencies: run when db instance changes or auth loading state changes.

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
