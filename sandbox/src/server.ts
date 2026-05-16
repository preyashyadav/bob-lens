import { Express } from 'express';
import { executeRoute, executeBackendRoute, screenshotRoute } from './routes/execute.js';
import { healthRoute } from './routes/health.js';

export function setupRoutes(app: Express): void {
  app.get('/health', healthRoute);
  app.post('/execute', executeRoute);
  app.post('/execute/backend', executeBackendRoute);
  app.post('/screenshot', screenshotRoute);
}

// Made with Bob
