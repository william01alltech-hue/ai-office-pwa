import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getOrCreateUserProfile, deductPoint } from '../services/userService';
import type { UserProfile } from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deductAiPoint: () => Promise<number>;
  isAdmin: boolean;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (user: User) => {
    try {
      const profile = await getOrCreateUserProfile(user);
      setUserProfile(profile);
    } catch (e) {
      console.error('Failed to load user profile:', e);
    }
  };

  useEffect(() => {
    // 處理跳轉登入後的結果回傳
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await loadProfile(result.user);
        }
      } catch (e) {
        console.error('Failed to handle redirect login result:', e);
      }
    };
    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (currentUser) await loadProfile(currentUser);
  };

  const deductAiPoint = async (): Promise<number> => {
    if (!currentUser || !userProfile) throw new Error('INSUFFICIENT_POINTS');
    const newPoints = await deductPoint(currentUser.uid, userProfile.role);
    setUserProfile(prev => prev ? { ...prev, points: newPoints } : null);
    return newPoints;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const isAdmin = userProfile?.role === 'admin';

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    logout,
    refreshProfile,
    deductAiPoint,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
