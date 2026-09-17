import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://hamropay-backends.onrender.com';

export interface Merchant {
  id: string;
  name: string;
  email: string;
  api_key: string;
}

export interface AuthContextType {
  user: Merchant | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<any>;
  signOutUser: () => void;
  refreshUser: () => void;
  // Convenience aliases for existing components
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<any>;
  logout: () => void;
  token: string | null;
  merchant: Merchant | null;
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

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Login failed');
      localStorage.setItem('hamropay_token', data.data.token);
      localStorage.setItem('hamropay_merchant', JSON.stringify(data.data.merchant));
      localStorage.setItem('hamro_is_logged_in', 'true');
      setUser(data.data.merchant);
      toast.success('Logged in successfully!');
      return data.data;
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Registration failed');
      
      // If registration returns token & merchant, auto login
      if (data.data?.token && data.data?.merchant) {
        localStorage.setItem('hamropay_token', data.data.token);
        localStorage.setItem('hamropay_merchant', JSON.stringify(data.data.merchant));
        localStorage.setItem('hamro_is_logged_in', 'true');
        setUser(data.data.merchant);
      }
      toast.success('Account created! Please login.');
      return data.data;
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
      throw err;
    }
  };

  const signOutUser = () => {
    localStorage.removeItem('hamropay_token');
    localStorage.removeItem('hamropay_merchant');
    localStorage.removeItem('hamro_is_logged_in');
    setUser(null);
    toast.success('Signed out successfully.');
  };

  const refreshUser = () => {
    const saved = localStorage.getItem('hamropay_merchant');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(null);
      }
    }
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('hamropay_token') : null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithEmail, 
      registerWithEmail, 
      signOutUser, 
      refreshUser,
      login: loginWithEmail,
      register: registerWithEmail,
      logout: signOutUser,
      token,
      merchant: user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
