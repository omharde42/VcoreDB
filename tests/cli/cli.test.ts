import { describe, it, expect } from 'vitest';
import { runCli } from '../../packages/cli/src/index';

describe('vcore CLI Tooling', () => {
  it('should execute vcore login and session commands', async () => {
    const loginRes = await runCli(['login', 'developer@vcoredb.com', '--json']);
    expect(loginRes.message).toBeDefined();

    const whoamiRes = await runCli(['whoami', '--json']);
    expect(whoamiRes.user).toBe('developer@vcoredb.com');
  });

  it('should list projects and create project via CLI', async () => {
    const listRes = await runCli(['projects', 'list', '--json']);
    expect(listRes.projects.length).toBeGreaterThan(0);

    const createRes = await runCli(['projects', 'create', 'My App', '--json']);
    expect(createRes.project.name).toBe('My App');
  });

  it('should execute database and functions commands', async () => {
    const dbRes = await runCli(['db', 'tables', '--json']);
    expect(dbRes.tables).toContain('users');

    const fnRes = await runCli(['functions', 'deploy', 'send-email', '--json']);
    expect(fnRes.status).toBe('deployed');
    expect(fnRes.function).toBe('send-email');
  });

  it('should output local development start info', async () => {
    const startRes = await runCli(['start', '--json']);
    expect(startRes.services.dashboard).toBeDefined();
    expect(startRes.services.api).toBeDefined();
  });
});
