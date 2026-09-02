import { auth } from '../config/firebase';
import { toast } from 'react-hot-toast';

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://hamro-pay-backend-url-n561.vercel.app';

const getToken = async (): Promise<string> => {
  // Wait a small moment or return immediately if user exists
  const user = auth.currentUser;
  if (!user) {
    // Try to wait for auth state to initialize if it's currently null but user is actually signed in
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(async (u) => {
        unsubscribe();
        if (u) {
          try {
            const token = await u.getIdToken(true);
            resolve(token);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('Not authenticated'));
        }
      });
      // Fallback if onAuthStateChanged is slow
      setTimeout(() => {
        reject(new Error('Not authenticated (timeout)'));
      }, 3000);
    });
  }
  return user.getIdToken(true); // force refresh if expired
};

export const apiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
) => {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      toast.error('Session expired. Please log in again.');
      // Force trigger logout by throwing specific session expiry error
      throw new Error('Unauthorized');
    }
    if (res.status === 403) {
      toast.error('Account suspended. Contact support.');
      throw new Error('Suspended');
    }
    if (res.status === 404) {
      toast.error('Endpoint not found.');
      throw new Error('Not found.');
    }
    if (res.status === 429) {
      toast.error('Too many requests. Wait and try again.');
      throw new Error('Too many requests.');
    }
    if (res.status >= 500) {
      toast.error('Server error. Try again later.');
      throw new Error('Server error.');
    }

    const data = await res.json();
    if (!data.success) {
      const errorMsg = data.message || 'API request failed';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    return data.data;
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Suspended' || error.message === 'Not found.' || error.message === 'Too many requests.' || error.message === 'Server error.') {
      throw error;
    }
    const errorMsg = error.message || 'Connection failed. Check internet.';
    toast.error(errorMsg);
    throw error;
  }
};

// Public API call (no auth needed)
export const publicApiCall = async (
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
) => {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 404) {
      toast.error('Endpoint not found.');
      throw new Error('Not found.');
    }
    if (res.status >= 500) {
      toast.error('Server error. Try again later.');
      throw new Error('Server error.');
    }

    const data = await res.json();
    if (!data.success) {
      const errorMsg = data.message || 'API request failed';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    return data.data;
  } catch (error: any) {
    if (error.message === 'Not found.' || error.message === 'Server error.') {
      throw error;
    }
    const errorMsg = error.message || 'Connection failed. Check internet.';
    toast.error(errorMsg);
    throw error;
  }
};
