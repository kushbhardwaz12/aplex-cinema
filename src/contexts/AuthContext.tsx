import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isAdminEmail: boolean;
  isAdminVerified: boolean;
  verifyAdminPin: (pin: string) => boolean;
  loading: boolean;
  logout: () => Promise<void>;
  resetAdminVerification: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// The predefined admin email that has access
const ADMIN_EMAIL = 'lalitasuraj27@gmail.com';
const ADMIN_PIN = '1983';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminVerified, setIsAdminVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Reset PIN verification on auth state change
      setIsAdminVerified(false);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setIsAdminVerified(false);
  };

  const verifyAdminPin = (pin: string) => {
    if (pin === ADMIN_PIN) {
      setIsAdminVerified(true);
      return true;
    }
    return false;
  };

  const resetAdminVerification = () => {
    setIsAdminVerified(false);
  };

  const isAdminEmail = user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdminEmail, 
      isAdminVerified, 
      verifyAdminPin, 
      loading, 
      logout,
      resetAdminVerification
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
