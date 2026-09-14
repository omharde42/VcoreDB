import { describe, it, expect, beforeEach } from 'vitest';
import { dbEngine } from '../server/db';
import { AuthService } from '../server/auth';
import { ProjectService } from '../server/projects';

describe('Gateway & Auth Services', () => {
  it('should list default projects and seed data', () => {
    const projects = ProjectService.listProjects();
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].ref).toBe('proj_default');
  });

  it('should create a new project and generate API keys', () => {
    const proj = ProjectService.createProject('Test App', 'us-west-2');
    expect(proj.name).toBe('Test App');
    expect(proj.api_keys.length).toBe(2);
  });

  it('should signup and login a user successfully', async () => {
    const proj = ProjectService.listProjects()[0];
    const signupRes = await AuthService.signup(proj.internal_id || 1, 'test@example.com', 'Password123!');
    expect(signupRes.user.email).toBe('test@example.com');
    expect(signupRes.session.access_token).toBeDefined();

    const loginRes = await AuthService.login(proj.internal_id || 1, 'test@example.com', 'Password123!');
    expect(loginRes.session.access_token).toBeDefined();

    const verified = AuthService.verifyToken(loginRes.session.access_token);
    expect(verified.email).toBe('test@example.com');
  });
});
