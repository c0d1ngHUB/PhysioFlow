let cachedCsrfToken: string | null = null;

export async function getCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearCsrfToken() {
  cachedCsrfToken = null;
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

  if (res.status === 403) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.error?.includes('CSRF') || data.error?.includes('Ursprung')) {
      clearCsrfToken();
    }
  }

  return res;
}
