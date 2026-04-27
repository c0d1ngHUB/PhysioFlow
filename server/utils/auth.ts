import type { NextFunction, Request, Response } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    res.status(401).json({ success: false, error: 'Nicht authentifiziert.' });
    return;
  }
  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.session.user?.role !== role) {
      res.status(403).json({ success: false, error: 'Keine Berechtigung.' });
      return;
    }
    next();
  };
}
