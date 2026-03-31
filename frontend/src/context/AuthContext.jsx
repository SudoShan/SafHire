import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getApiError } from '../lib/api';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: user.role_code || user.role,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(normalizeUser(data.user));
    } catch (_error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      toast.error('Your session expired. Please sign in again.');
    };

    window.addEventListener('trusthire:session-expired', handleExpiredSession);
    return () => window.removeEventListener('trusthire:session-expired', handleExpiredSession);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const normalized = normalizeUser(data.user);
    setUser(normalized);
    return normalized;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const logout = async ({ silent = false } = {}) => {
    try {
      await api.post('/auth/logout');
    } catch (_error) {
      if (!silent) {
        toast.error('We could not complete logout cleanly, but your local session was cleared.');
      }
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      const normalized = normalizeUser(data.user);
      setUser(normalized);
      return normalized;
    } catch (error) {
      throw new Error(getApiError(error, 'Unable to refresh user session'));
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user),
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
