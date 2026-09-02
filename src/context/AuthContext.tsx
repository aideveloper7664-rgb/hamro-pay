import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { getMe, googleLogin, logout as apiLogout } from '../services/auth.service';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: any;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<any>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<any>;
  signOutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Sync user state from API when Firebase auth changes
  const syncWithApi = async (fUser: FirebaseUser | null) => {
    if (!fUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Force refresh token to verify it and fetch me from our backend API
      await fUser.getIdToken(true);
      const apiUserData = await getMe();
      
      // Check if user is suspended
      if (apiUserData.status === 'suspended' || apiUserData.isSuspended) {
        toast.error('Account suspended. Contact support.');
        await signOut(auth);
        setUser(null);
      } else {
        setUser(apiUserData);
      }
    } catch (err: any) {
      console.error('API sync error:', err);
      // If unauthorized, logout
      if (err.message === 'Unauthorized' || err.message === 'Suspended') {
        await signOut(auth);
        setUser(null);
      } else {
        // Some temporary network error or missing profile in API
        setUser({
          uid: fUser.uid,
          name: fUser.displayName || 'Hamro Merchant',
          email: fUser.email || '',
          tempFallback: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      await syncWithApi(fUser);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken(true);
      
      // POST idToken to backend google auth route
      const apiData = await googleLogin(idToken);
      
      if (apiData.status === 'suspended' || apiData.isSuspended) {
        toast.error('Account suspended. Contact support.');
        await signOut(auth);
        throw new Error('Account suspended');
      }

      setUser(apiData);
      toast.success('Logged in successfully!');
      return apiData;
    } catch (err: any) {
      toast.error(err.message || 'Google Login failed');
      setLoading(false);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, password: any) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Force token refresh
      const idToken = await result.user.getIdToken(true);
      const apiUserData = await getMe();

      if (apiUserData.status === 'suspended' || apiUserData.isSuspended) {
        toast.error('Account suspended. Contact support.');
        await signOut(auth);
        throw new Error('Account suspended');
      }

      setUser(apiUserData);
      toast.success('Logged in successfully!');
      return apiUserData;
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
      setLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, password: any) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name in firebase
      await firebaseUpdateProfile(result.user, { displayName: name });
      
      // Force refresh and call google sync endpoint to synchronize database record
      const idToken = await result.user.getIdToken(true);
      const apiData = await googleLogin(idToken);
      
      setUser(apiData);
      toast.success('Account registered successfully!');
      return apiData;
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
      setLoading(false);
      throw err;
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      // Call backend logout first
      try {
        await apiLogout();
      } catch (err) {
        // Safe to ignore if already expired
      }
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      toast.success('Signed out successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await syncWithApi(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      signOutUser,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
