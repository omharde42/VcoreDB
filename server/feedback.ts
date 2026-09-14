import { Router, Response } from 'express';
import { AuthenticatedRequest } from './gateway';
import { dbEngine } from './db';

export const feedbackRouter = Router({ mergeParams: true });

// Submit User Feedback
feedbackRouter.post('/feedback', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category = 'Feature Request', title, description, priority = 'medium' } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Title and description required' } });
    }

    const userId = req.user?.id || 1;
    const publicId = crypto.randomUUID();

    dbEngine.db.public.none(`
      INSERT INTO core.feedback (public_id, user_id, category, title, description, priority, status)
      VALUES ('${publicId}', ${userId}, '${category}', '${title}', '${description}', '${priority}', 'new')
    `);

    res.status(201).json({ success: true, feedback_id: publicId, message: 'Feedback submitted successfully' });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'SUBMIT_FAILED', message: err.message } });
  }
});

// List User Feedback
feedbackRouter.get('/feedback', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1;
    const feedback = dbEngine.db.public.many(
      `SELECT public_id as id, category, title, description, priority, status, created_at FROM core.feedback WHERE user_id = ${userId} ORDER BY created_at DESC`
    );
    res.json({ feedback });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

// Report Bug / Issue
feedbackRouter.post('/issues', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = '/dashboard', severity = 'medium', description, errorContext = {} } = req.body;
    if (!description) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Issue description required' } });
    }

    const userId = req.user?.id || 1;
    const projectId = req.project?.internal_id || 1;
    const publicId = crypto.randomUUID();

    dbEngine.db.public.none(`
      INSERT INTO core.issues (public_id, user_id, project_id, page, severity, status, description, error_context)
      VALUES ('${publicId}', ${userId}, ${projectId}, '${page}', '${severity}', 'open', '${description}', '${JSON.stringify(errorContext)}')
    `);

    res.status(201).json({ success: true, issue_id: publicId, message: 'Issue reported successfully' });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'REPORT_FAILED', message: err.message } });
  }
});

// List User Reported Issues
feedbackRouter.get('/issues', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1;
    const issues = dbEngine.db.public.many(
      `SELECT public_id as id, page, severity, status, description, created_at FROM core.issues WHERE user_id = ${userId} ORDER BY created_at DESC`
    );
    res.json({ issues });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});
