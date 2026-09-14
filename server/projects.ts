import { dbEngine } from './db';
import { escapeSqlString } from './utils';

export class ProjectService {
  public static listProjects() {
    return dbEngine.db.public.many(
      `SELECT p.public_id as id, p.ref, p.name, p.db_name, p.status, p.region, p.created_at
       FROM core.projects p WHERE p.deleted_at IS NULL`
    );
  }

  public static getProject(refOrId: string) {
    const escapedRef = escapeSqlString(refOrId);
    const projects = dbEngine.db.public.many(
      `SELECT p.id as internal_id, p.public_id as id, p.ref, p.name, p.db_name, p.status, p.region, p.created_at
       FROM core.projects p
       WHERE (p.ref = '${escapedRef}' OR p.public_id::text = '${escapedRef}') AND p.deleted_at IS NULL`
    );
    if (projects.length === 0) {
      throw new Error('Project not found');
    }
    const project = projects[0] as any;
    const keys = dbEngine.db.public.many(
      `SELECT name, key_hash, role FROM core.api_keys WHERE project_id = ${project.internal_id}`
    );
    return {
      ...project,
      api_keys: keys,
    };
  }

  public static createProject(name: string, region: string = 'us-east-1') {
    const ref = `proj_${Math.random().toString(36).substring(2, 9)}`;
    const dbName = `vcoredb_${ref}`;
    const publicId = crypto.randomUUID();
    const escapedName = escapeSqlString(name);
    const escapedRegion = escapeSqlString(region);

    dbEngine.db.public.none(`
      INSERT INTO core.projects (public_id, organization_id, ref, name, db_name, status, region)
      VALUES ('${publicId}', 1, '${ref}', '${escapedName}', '${dbName}', 'ready', '${escapedRegion}')
    `);

    const newProj = dbEngine.db.public.one(
      `SELECT id FROM core.projects WHERE ref = '${ref}'`
    ) as any;

    const anonKey = `vcore_anon_${crypto.randomUUID().replace(/-/g, '')}`;
    const serviceKey = `vcore_service_${crypto.randomUUID().replace(/-/g, '')}`;

    dbEngine.db.public.none(`
      INSERT INTO core.api_keys (public_id, project_id, name, key_prefix, key_hash, role)
      VALUES
      ('${crypto.randomUUID()}', ${newProj.id}, 'Anon Key', 'vcore_anon_', '${anonKey}', 'anon'),
      ('${crypto.randomUUID()}', ${newProj.id}, 'Service Key', 'vcore_service_', '${serviceKey}', 'service_role')
    `);

    return this.getProject(ref);
  }

  public static listApiKeys(projectId: number) {
    return dbEngine.db.public.many(
      `SELECT public_id as id, name, key_prefix, role, created_at FROM core.api_keys WHERE project_id = ${projectId}`
    );
  }

  public static createApiKey(projectId: number, name: string, role: string) {
    const keyVal = `vcore_${role}_${crypto.randomUUID().replace(/-/g, '')}`;
    const prefix = keyVal.substring(0, 12);
    const publicId = crypto.randomUUID();
    const escapedName = escapeSqlString(name);
    const escapedRole = escapeSqlString(role);

    dbEngine.db.public.none(`
      INSERT INTO core.api_keys (public_id, project_id, name, key_prefix, key_hash, role)
      VALUES ('${publicId}', ${projectId}, '${escapedName}', '${prefix}', '${keyVal}', '${escapedRole}')
    `);

    return {
      id: publicId,
      name,
      role,
      api_key: keyVal,
    };
  }
}
