import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: false });

export const useAuth = () => useContext(AuthContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: Never keep the app waiting longer than 1.5s for auth state
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth, 
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
          clearTimeout(timer);
        },
        (error) => {
          console.warn('FirebaseProvider auth error:', error);
          setLoading(false);
          clearTimeout(timer);
        }
      );
    } catch (err) {
      console.warn('FirebaseProvider listener setup error:', err);
      setLoading(false);
      clearTimeout(timer);
    }

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? (
        <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-[#7b5cf0]/20 border border-[#7b5cf0]/30 animate-pulse" />
            <div className="absolute inset-0 animate-spin rounded-3xl border-2 border-[#7b5cf0] border-t-transparent" />
          </div>
          <div className="text-[10px] font-black text-[#7b5cf0] uppercase tracking-[0.4em] animate-pulse">
            Safikulreport
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
