import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface AuthContextType {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  loading: true,
  login: async () => false,
  logout: async () => {},
  checkAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Global 401 handler — set by AuthProvider, called by fetch override
export let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(handler: (() => void) | null) {
  onAuthFailure = handler;
}

// Fetch interceptor — detect 401s globally
const originalFetch = window.fetch;
window.fetch = async function (...args: Parameters<typeof originalFetch>) {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    onAuthFailure?.();
  }
  return response;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await originalFetch('/api/auth/check', { credentials: 'same-origin' });
      const data = await res.json();
      setAuthenticated(data.authenticated === true);
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await originalFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await originalFetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } finally {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    setOnAuthFailure(() => () => setAuthenticated(false));
    checkAuth();
    return () => setOnAuthFailure(null);
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}