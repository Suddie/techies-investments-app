
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
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (authLoading) {
      // If auth is still loading, settings are also effectively loading.
      // Ensure we don't prematurely set settings loading to false.
      if (!loading) setLoading(true);
      return; // Don't proceed further until auth state is resolved.
    }

    // Auth state is resolved (authLoading is false)
    if (user) {
      // User is authenticated, try fetching settings
      const settingsDocRef = doc(db, 'settings', 'global_settings');
      unsubscribe = onSnapshot(
        settingsDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as GlobalSettings);
          } else {
            // console.warn('Global settings document not found. Using default settings.');
            setSettings(DEFAULT_GLOBAL_SETTINGS);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching global settings:', error);
          // If permissions error or other error, fallback to defaults.
          setSettings(DEFAULT_GLOBAL_SETTINGS);
          setLoading(false);
        }
      );
    } else {
      // No user authenticated (e.g., on login page, or after logout)
      // Use default settings and mark settings as loaded.
      setSettings(DEFAULT_GLOBAL_SETTINGS);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [db, authLoading, user, loading]); // Added 'loading' to dependency array to manage its state more effectively.

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
