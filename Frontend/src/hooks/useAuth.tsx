import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, setAccessToken } from '../api/axios';
import type { AuthResponse, User } from '../types';

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const lastSetAuthRef = useRef<number>(0);

  const setAuth = useCallback((u: User, token: string) => {
    lastSetAuthRef.current = Date.now();
    setAccessToken(token);
    setUserState(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      setUserState(null);
    }
  }, []);

  // Restore session on mount/refresh using refresh token cookie so user stays on the same page
  useEffect(() => {
    let cancelled = false;
    api
      .post<AuthResponse>('/api/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => {
        if (!cancelled && data?.user && data?.accessToken) {
          setAccessToken(data.accessToken);
          setUserState(data.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Avoid clearing user if login just succeeded (refresh was still in flight)
          const recentlySet = Date.now() - lastSetAuthRef.current < 3000;
          if (!recentlySet) {
            setAccessToken(null);
            setUserState(null);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      setUser: setUserState,
      setAuth,
      logout,
      isAuthenticated: !!user,
      authLoading,
    }),
    [user, setAuth, logout, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
