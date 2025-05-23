"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import type { GlobalSettings } from '@/lib/types';
import { DEFAULT_GLOBAL_SETTINGS } from '@/lib/constants';

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
    const settingsDocRef = doc(db, 'settings', 'global_settings');
    const unsubscribe = onSnapshot(
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
        setSettings(DEFAULT_GLOBAL_SETTINGS); // Use default on error
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
