import { Express } from 'express';
import { executeRoute } from './routes/execute.js';
import { healthRoute } from './routes/health.js';

export function setupRoutes(app: Express): void {
  app.get('/health', healthRoute);
  app.post('/execute', executeRoute);
}

// Made with Bob
