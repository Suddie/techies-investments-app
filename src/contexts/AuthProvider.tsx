"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import type { UserProfile } from '@/lib/types';
import { ROLES } from '@/lib/constants';
// Skeleton component is not needed here anymore for AuthProvider's own loading state.
// Child components will handle their own skeletons.

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  accessLevel: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { auth, db } = useFirebase();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data() as Omit<UserProfile, 'uid' | 'email' | 'photoURL'>;
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            name: profileData.name || firebaseUser.displayName,
            ...profileData,
          });
        } else {
           setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || "New User",
            role: 'Member', 
            accessLevel: ROLES['Member'].accessLevel,
            requiresPasswordChange: true, 
            photoURL: firebaseUser.photoURL,
          });
          console.warn(`User profile not found in Firestore for UID: ${firebaseUser.uid}. A default profile was created.`);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const isAdmin = userProfile?.role === 'Admin';
  const accessLevel = userProfile?.accessLevel ?? null;

  // The conditional rendering of a skeleton here was causing hydration issues.
  // Child components (like HomePage or ProtectedRoute) are responsible for their own loading UI
  // based on the 'loading' state from this provider.
  // AuthProvider should consistently render its children to avoid mismatches between server and client initial render.
  // if (loading && typeof window !== 'undefined' && (window.location.pathname !== '/login' && window.location.pathname !== '/forgot-password' && window.location.pathname !== '/change-password')) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <Skeleton className="h-12 w-12 rounded-full" />
  //       <Skeleton className="h-4 w-[250px] ml-4" />
  //     </div>
  //   );
  // }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, accessLevel }}>
      {children}
    </AuthContext.Provider>
  );
};
