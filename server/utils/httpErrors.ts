import type { Response } from 'express';

export function respondWithServerError(
  res: Response,
  error: unknown,
  logContext: string,
  publicMessage = 'Es ist ein interner Fehler aufgetreten.',
) {
  console.error(logContext, error);
  res.status(500).json({ success: false, error: publicMessage });
}
