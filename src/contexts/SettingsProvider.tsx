
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
  const { user, loading: authLoading } = useAuth(); // Get the user object
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); 

    if (authLoading) {
      // Auth state is still resolving, wait.
      return; 
    }

    if (!user) {
      // No user is authenticated, use default settings and don't attempt Firestore fetch.
      // This prevents permission errors for unauthenticated reads to /settings/global_settings.
      setSettings(DEFAULT_GLOBAL_SETTINGS);
      setLoading(false);
      return;
    }

    // User is authenticated, proceed to fetch global settings.
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
        // Fallback to defaults on error (including permission errors for authenticated users if rules are restrictive)
        setSettings(DEFAULT_GLOBAL_SETTINGS);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe(); // Clean up the listener
    };
  }, [db, user, authLoading]); // Depend on user and authLoading

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
