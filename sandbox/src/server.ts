import { Express } from 'express';
import { executeRoute, executeBackendRoute } from './routes/execute.js';
import { healthRoute } from './routes/health.js';

export function setupRoutes(app: Express): void {
  app.get('/health', healthRoute);
  app.post('/execute', executeRoute);
  app.post('/execute/backend', executeBackendRoute);
}

// Made with Bob
