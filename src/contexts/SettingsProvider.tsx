
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import type { GlobalSettings } from '@/lib/types';
import { DEFAULT_GLOBAL_SETTINGS } from '@/lib/constants';
// Removed useAuth as direct dependency for fetching initial settings

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
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Attempt to fetch global settings regardless of auth state.
    // Assumes security rules allow public read for 'settings/global_settings'.
    const settingsDocRef = doc(db, 'settings', 'global_settings');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as GlobalSettings);
        } else {
          // console.warn('SettingsProvider: Global settings document not found. Using default settings.');
          setSettings(DEFAULT_GLOBAL_SETTINGS);
        }
        setLoading(false);
      },
      (error) => {
        console.error('SettingsProvider: Error fetching global settings:', error);
        // Fallback to defaults on error (e.g. if rules are still restrictive or network issue)
        setSettings(DEFAULT_GLOBAL_SETTINGS);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe(); // Clean up the listener
    };
  }, [db]); // Only depends on db now for initial fetch

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

    