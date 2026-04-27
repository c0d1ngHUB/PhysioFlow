import 'express-session';

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    user?: { id: number; username: string; role: string } | null;
    csrfToken?: string;
  }
}
