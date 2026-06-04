import { notifyAuthFailure } from '../authFailure.js';

let cachedCsrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

export async function getCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  
  // Promise deduplication: prevent parallel requests from fetching CSRF token twice
  if (csrfPromise) return csrfPromise;
  
  csrfPromise = (async () => {
    try {
      const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.csrfToken) {
        cachedCsrfToken = data.csrfToken;
        return cachedCsrfToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      csrfPromise = null;
    }
  })();
  
  return csrfPromise;
}

export function clearCsrfToken() {
  cachedCsrfToken = null;
  csrfPromise = null;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers = new Headers(init?.headers);
  if (isMutating) {
    const token = await getCsrfToken();
    if (token) {
      headers.set('x-csrf-token', token);
    }
  }
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'same-origin',
  });

  // 401 interception — only in apiFetch, no global fetch override
  if (res.status === 401) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/api/auth/login') && !url.includes('/api/auth/check') && !url.includes('/api/auth/logout')) {
      notifyAuthFailure();
    }
  }

  if (res.status === 403) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.error?.includes('CSRF') || data.error?.includes('Ursprung')) {
      clearCsrfToken();
    }
  }

  return res;
}
