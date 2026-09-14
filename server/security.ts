import { Router, Response } from 'express';
import { AuthenticatedRequest } from './gateway';
import { dbEngine } from './db';

export const securityRouter = Router({ mergeParams: true });

// Fetch Project Security Audit Findings & Health Status
securityRouter.get('/security/audit', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;

    // Check RLS status across project tables
    const rlsPolicies = dbEngine.db.public.many(
      `SELECT table_name, enabled FROM iam.rls_policies WHERE project_id = ${projectId}`
    );

    const findings: any[] = [];

    if (rlsPolicies.length === 0) {
      findings.push({
        id: 'SEC-001',
        title: 'Row Level Security (RLS) Disabled',
        severity: 'high',
        category: 'Database Authorization',
        description: 'No active RLS policies detected on project tables. Anonymous client requests could read unrestricted data.',
        recommendation: 'Enable RLS and define select/insert policies for authenticated users.',
        remediable: true,
        remediation_action: 'enable_rls',
      });
    }

    findings.push({
      id: 'SEC-002',
      title: 'Service Role Key Exposure Risk',
      severity: 'medium',
      category: 'API Credentials',
      description: 'Ensure the Service Role Key (vcore_service_) is never embedded in client-side mobile or frontend web code.',
      recommendation: 'Use Public Anon Key on frontend applications and keep Service Key on server environments only.',
      remediable: false,
    });

    const score = Math.max(70, 100 - findings.length * 12);

    res.json({
      security_score: score,
      status: score >= 90 ? 'Healthy' : 'Action Required',
      total_findings: findings.length,
      findings,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SECURITY_AUDIT_FAILED', message: err.message } });
  }
});

// Auto-Remediate Security Findings (e.g. Enable RLS Policy)
securityRouter.post('/security/remediate', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;
    const { action, tableName = 'users' } = req.body;

    if (action === 'enable_rls') {
      const publicId = crypto.randomUUID();
      dbEngine.db.public.none(`
        INSERT INTO iam.rls_policies (public_id, project_id, table_name, name, action, roles, definition, enabled)
        VALUES ('${publicId}', ${projectId}, '${tableName}', 'user_own_rows_policy', 'ALL', ARRAY['authenticated'], 'user_id = auth.uid()', true)
      `);

      return res.json({
        success: true,
        action: 'enable_rls',
        message: `Enabled RLS policy on table ${tableName}`,
      });
    }

    res.status(400).json({ error: { code: 'INVALID_REMEDIATION', message: 'Unknown remediation action' } });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'REMEDIATION_FAILED', message: err.message } });
  }
});
