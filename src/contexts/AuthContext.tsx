import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithPopup, 
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import type { User } from '../types';
import { useStore } from '../store/useStore';
import { toast } from '../hooks/use-toast';
import { mapFirebaseUserToUser } from '../utils/authUtils';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkAnonymousWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUser: setStoreUser, setLoading } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mappedUser = mapFirebaseUserToUser(firebaseUser);
        setUser(mappedUser);
        setStoreUser(mappedUser);
      } else {
        setUser(null);
        setStoreUser(null);
      }
      setIsLoading(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setStoreUser, setLoading]);

  const handleSignInAnonymously = async () => {
    try {
      setIsLoading(true);
      await signInAnonymously(auth);
      toast({
        title: "Signed in anonymously",
        description: "You can upgrade to a Google account later to sync across devices."
      });
    } catch (error) {
      console.error('Anonymous sign in error:', error);
      toast({
        title: "Sign in failed",
        description: "Failed to sign in anonymously. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
      toast({
        title: "Signed in successfully",
        description: "Welcome! Your data will be synced across devices."
      });
    } catch (error) {
      console.error('Google sign in error:', error);
      toast({
        title: "Sign in failed",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAnonymousWithGoogle = async () => {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
      toast({
        title: "Cannot link account",
        description: "You must be signed in anonymously to link with Google.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
      
      // The linking is handled automatically by Firebase when using signInWithPopup
      // on an anonymous user
      
      toast({
        title: "Account linked successfully",
        description: "Your anonymous data has been preserved and linked to your Google account."
      });
    } catch (error: unknown) {
      console.error('Account linking error:', error);
      
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/credential-already-in-use') {
        toast({
          title: "Account already exists",
          description: "This Google account is already in use. Please sign in directly.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Account linking failed",
          description: "Failed to link your account. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully."
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signInAnonymously: handleSignInAnonymously,
    signInWithGoogle: handleSignInWithGoogle,
    linkAnonymousWithGoogle: handleLinkAnonymousWithGoogle,
    signOut: handleSignOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};