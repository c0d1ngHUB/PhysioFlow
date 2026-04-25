import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { showToast } from './components/ui';
import { useNavigation, type Page } from './navigation';

export interface AuthUser {
  username: string;
  role: string;
}

export type LoginErrorCode = 'invalid_credentials' | 'missing_credentials' | 'rate_limited' | 'network_error' | 'unknown_error';

export interface LoginResult {
  success: boolean;
  code?: LoginErrorCode;
  message?: string;
}

export interface AuthContextType {
  authenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const SESSION_ROUTE_KEY = 'physioflow.pending-route';

export const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  loading: true,
  user: null,
  login: async () => ({ success: false, code: 'unknown_error' }),
  logout: async () => {},
  checkAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(handler: (() => void) | null) {
  onAuthFailure = handler;
}

function shouldSkipAuthFailure(url: string) {
  return url.includes('/api/auth/login') || url.includes('/api/auth/check') || url.includes('/api/auth/logout');
}

function getRequestUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === 'string') return input;
  if (input instanceof Request) return input.url;
  return String(input);
}

function savePendingRoute() {
  const { currentPage, openModal } = useNavigation.getState();
  window.sessionStorage.setItem(SESSION_ROUTE_KEY, JSON.stringify({ currentPage, openModal }));
}

function restorePendingRoute() {
  const raw = window.sessionStorage.getItem(SESSION_ROUTE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as { currentPage?: Page; openModal?: string | null };
    if (parsed.currentPage) {
      useNavigation.getState().navigateTo(parsed.currentPage, parsed.openModal ?? null);
    }
  } finally {
    window.sessionStorage.removeItem(SESSION_ROUTE_KEY);
  }
}

const originalFetch = window.fetch;
window.fetch = async function (...args: Parameters<typeof originalFetch>) {
  const response = await originalFetch(...args);
  const requestUrl = getRequestUrl(args[0]);

  if (response.status === 401 && !shouldSkipAuthFailure(requestUrl)) {
    onAuthFailure?.();
  }

  return response;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authFailureHandledRef = useRef(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await originalFetch('/api/auth/check', { credentials: 'same-origin' });
      const data = await res.json();
      const isAuthenticated = data.authenticated === true;
      setAuthenticated(isAuthenticated);
      setUser(data.user || null);

      if (isAuthenticated) {
        restorePendingRoute();
      }
    } catch {
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    try {
      const res = await originalFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        authFailureHandledRef.current = false;
        setAuthenticated(true);
        setUser(data.user || null);
        restorePendingRoute();
        return { success: true };
      }

      const data = await res.json().catch(() => ({}));
      const code = (data.code as LoginErrorCode | undefined) ?? (res.status === 429 ? 'rate_limited' : res.status === 401 ? 'invalid_credentials' : 'unknown_error');

      if (code === 'rate_limited') {
        return { success: false, code, message: 'Zu viele Anmeldeversuche. Bitte warten Sie kurz und versuchen Sie es erneut.' };
      }

      if (code === 'missing_credentials') {
        return { success: false, code, message: 'Bitte Benutzername und Passwort eingeben.' };
      }

      return { success: false, code: 'invalid_credentials', message: 'Ungültige Anmeldedaten.' };
    } catch {
      return { success: false, code: 'network_error', message: 'Verbindung zum Server fehlgeschlagen. Bitte Netzwerkverbindung prüfen.' };
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
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setOnAuthFailure(() => () => {
      if (authFailureHandledRef.current) {
        return;
      }

      authFailureHandledRef.current = true;
      savePendingRoute();
      showToast('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.', 'warning');
      setAuthenticated(false);
      setUser(null);
    });

    void checkAuth();
    return () => setOnAuthFailure(null);
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) {
      authFailureHandledRef.current = false;
    }
  }, [authenticated]);

  return (
    <AuthContext.Provider value={{ authenticated, loading, user, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
