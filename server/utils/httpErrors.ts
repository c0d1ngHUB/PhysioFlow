import type { Response } from 'express';

export function respondWithServerError(
  res: Response,
  error: unknown,
  logContext: string,
  publicMessage = 'Es ist ein interner Fehler aufgetreten.',
) {
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('SERVER ERROR:', logContext);
  console.error('Error:', error);
  if (error instanceof Error) {
    console.error('Stack:', error.stack);
  }
  console.error('═══════════════════════════════════════════════════════════════');
  res.status(500).json({ success: false, error: publicMessage });
}
