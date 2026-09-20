import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../config/supabase';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  api_key: string;
}

export interface AuthContextType {
  user: Merchant | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
  refreshUser: () => void;
  logout: () => Promise<void>;
  merchant: Merchant | null;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('hamropay_merchant');
    const token = localStorage.getItem('hamropay_token');
    if (saved && token) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const signOutUser = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signout error:', err);
    }
    localStorage.removeItem('hamropay_token');
    localStorage.removeItem('hamropay_merchant');
    localStorage.removeItem('hamro_is_logged_in');
    setUser(null);
    toast.success('Signed out.');
  };

  const refreshUser = () => {
    const saved = localStorage.getItem('hamropay_merchant');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        signOutUser, 
        refreshUser,
        logout: signOutUser,
        merchant: user,
        token: typeof window !== 'undefined' ? localStorage.getItem('hamropay_token') : null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
