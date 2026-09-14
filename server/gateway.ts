import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { dbEngine } from './db';
import { AuthService } from './auth';
import { ProjectService } from './projects';
import { restRouter } from './rest';
import { storageRouter } from './storage';
import { functionsRouter } from './functions';
import { webhooksRouter } from './webhooks';
import { observabilityRouter } from './observability';
import { dashboardRouter } from './dashboard';
import { billingRouter, globalStripeWebhookRouter } from './billing';
import { githubRouter } from './github';
import { adminRouter } from './admin';
import { feedbackRouter } from './feedback';
import { securityRouter } from './security';
import { migrationsRouter } from './migrations';

export interface AuthenticatedRequest extends Request {
  project?: any;
  user?: any;
  apiKeyRole?: string;
}

export function createGatewayApp(): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));

  // Global Health Endpoints
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', (req: Request, res: Response) => {
    res.json({ status: 'ready', database: 'connected' });
  });

  app.get('/version', (req: Request, res: Response) => {
    res.json({ name: 'VCoreDB', version: '1.0.0' });
  });

  // Mount Global Stripe Webhook Router (raw route unauthenticated)
  app.use(globalStripeWebhookRouter);

  // Gateway Auth & Security Enforcement Middleware
  app.use('/api/v1/projects/:projectRef', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { projectRef } = req.params;
      const project = ProjectService.getProject(projectRef);
      req.project = project;

      const apiKey = (req.headers['x-vcore-api-key'] as string) || (req.query.apikey as string);
      const authHeader = req.headers['authorization'];

      if (apiKey) {
        const keys = dbEngine.db.public.many(
          `SELECT role FROM core.api_keys WHERE project_id = ${project.internal_id} AND key_hash = '${apiKey}'`
        );
        if (keys.length > 0) {
          req.apiKeyRole = keys[0].role;
        }
      }

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const user = AuthService.verifyToken(token);
          if (user.project_id === project.internal_id) {
            req.user = user;
          }
        } catch {
          // invalid token
        }
      }

      // Public Auth endpoints (signup, login) do not require key authorization
      if (req.path.endsWith('/auth/signup') || req.path.endsWith('/auth/login')) {
        return next();
      }

      // Enforce API key or Authenticated user token
      if (!req.apiKeyRole && !req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Valid API Key (x-vcore-api-key) or Bearer Token required',
          },
        });
      }

      next();
    } catch (err: any) {
      res.status(404).json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: err.message || 'Project not found',
        },
      });
    }
  });

  // Auth Endpoints
  app.post('/api/v1/projects/:projectRef/auth/signup', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password, metadata } = req.body;
      const result = await AuthService.signup(req.project.internal_id, email, password, metadata);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: { code: 'AUTH_ERROR', message: err.message } });
    }
  });

  app.post('/api/v1/projects/:projectRef/auth/login', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(req.project.internal_id, email, password);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: { code: 'AUTH_ERROR', message: err.message } });
    }
  });

  app.get('/api/v1/projects/:projectRef/auth/users', (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = AuthService.listUsers(req.project.internal_id);
      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  app.patch('/api/v1/projects/:projectRef/auth/users/:userId', (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = AuthService.updateUser(req.project.internal_id, req.params.userId, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
    }
  });

  app.delete('/api/v1/projects/:projectRef/auth/users/:userId', (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = AuthService.deleteUser(req.project.internal_id, req.params.userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: { code: 'DELETE_FAILED', message: err.message } });
    }
  });

  // Mount Platform Admin Router
  app.use('/api/v1/admin', adminRouter);

  // Mount API Routers
  app.use('/api/v1/projects/:projectRef', restRouter);
  app.use('/api/v1/projects/:projectRef', storageRouter);
  app.use('/api/v1/projects/:projectRef', functionsRouter);
  app.use('/api/v1/projects/:projectRef', webhooksRouter);
  app.use('/api/v1/projects/:projectRef', observabilityRouter);
  app.use('/api/v1/projects/:projectRef', billingRouter);
  app.use('/api/v1/projects/:projectRef', githubRouter);
  app.use('/api/v1/projects/:projectRef', feedbackRouter);
  app.use('/api/v1/projects/:projectRef', securityRouter);
  app.use('/api/v1/projects/:projectRef', migrationsRouter);

  // Platform & Projects Endpoints
  app.get('/api/v1/projects', (req: Request, res: Response) => {
    const projects = ProjectService.listProjects();
    res.json({ projects });
  });

  app.post('/api/v1/projects', (req: Request, res: Response) => {
    try {
      const { name, region } = req.body;
      const project = ProjectService.createProject(name, region);
      res.status(201).json({ project });
    } catch (err: any) {
      res.status(400).json({ error: { code: 'CREATE_FAILED', message: err.message } });
    }
  });

  app.get('/api/v1/projects/:projectRef', (req: AuthenticatedRequest, res: Response) => {
    res.json({ project: req.project });
  });

  // Mount Dashboard Router
  app.use('/', dashboardRouter);

  return app;
}
