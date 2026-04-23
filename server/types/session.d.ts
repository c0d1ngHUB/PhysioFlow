import 'express-session';

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    user?: { username: string; role: string } | null;
  }
}