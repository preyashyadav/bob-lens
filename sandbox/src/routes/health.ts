import { Request, Response } from 'express';

export function healthRoute(req: Request, res: Response): void {
  res.json({
    status: 'ok',
    service: 'bob-lens-sandbox',
    timestamp: new Date().toISOString(),
  });
}

// Made with Bob
