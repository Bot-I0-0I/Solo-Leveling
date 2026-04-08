import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isGuest: false,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsGuest(currentUser.isAnonymous);
        setLoading(false);
      } else {
        // Sign in anonymously for guests
        try {
          const result = await signInAnonymously(auth);
          setUser(result.user);
          setIsGuest(true);
        } catch (error: any) {
          console.error("Error signing in anonymously", error);
          if (error.code === 'auth/admin-restricted-operation') {
            toast.error("Guest login disabled. Please enable 'Anonymous' sign-in provider in Firebase Console > Authentication > Sign-in method.");
          }
          setUser(null);
          setIsGuest(false);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      if (error.code === 'auth/popup-blocked') {
        toast.error("Popup blocked! Please allow popups for this site in your browser settings to sign in.", { duration: 10000 });
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("Domain not authorized. Please add this app's URL to Firebase Console > Authentication > Settings > Authorized domains.");
      } else if (error.code === 'auth/internal-error') {
        toast.error("Internal authentication error. This can happen if the popup is closed too quickly or due to network issues.");
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to show an error
      } else if (error.message?.includes('Pending promise was never set')) {
        toast.error("Authentication popup failed to initialize. Please try again.");
      } else {
        toast.error("Failed to sign in: " + error.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
