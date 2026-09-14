import { newDb, IMemoryDb, DataType } from 'pg-mem';
import fs from 'fs';
import path from 'path';

export class DatabaseEngine {
  private static instance: DatabaseEngine;
  public db!: IMemoryDb;
  public adapter: any;

  private constructor() {
    this.init();
  }

  public static getInstance(): DatabaseEngine {
    if (!DatabaseEngine.instance) {
      DatabaseEngine.instance = new DatabaseEngine();
    }
    return DatabaseEngine.instance;
  }

  private init() {
    this.db = newDb();

    ['core', 'auth', 'iam', 'storage', 'functions', 'webhooks', 'audit', 'analytics', 'app', 'billing'].forEach(s => {
      this.db.createSchema(s);
    });

    this.db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => crypto.randomUUID(),
    });

    this.db.public.registerFunction({
      name: 'char_length',
      args: [DataType.text],
      returns: DataType.integer,
      implementation: (str: string) => (str ? str.length : 0),
    });

    this.adapter = this.db.adapters.createPg();

    const mig1 = fs.readFileSync(path.join(process.cwd(), 'migrations/0001_phase1_foundation.up.sql'), 'utf8');
    const mig2 = fs.readFileSync(path.join(process.cwd(), 'migrations/0002_platform_auth_iam_core.up.sql'), 'utf8');
    const mig3 = fs.readFileSync(path.join(process.cwd(), 'migrations/0003_storage_functions_webhooks.up.sql'), 'utf8');
    const mig4 = fs.readFileSync(path.join(process.cwd(), 'migrations/0004_stripe_billing.up.sql'), 'utf8');
    const mig5 = fs.readFileSync(path.join(process.cwd(), 'migrations/0005_github_admin_feedback.up.sql'), 'utf8');

    this.execSql(mig1);
    this.execSql(mig2);
    this.execSql(mig3);
    this.execSql(mig4);
    this.execSql(mig5);

    this.seedDefaultData();
  }

  public execSql(sql: string) {
    try {
      let clean = sql
        .replace(/CREATE OR REPLACE FUNCTION[\s\S]*?LANGUAGE plpgsql;/gi, '')
        .split('\n')
        .filter(line => !line.trim().includes('CHECK (') && !line.trim().includes('CHECK('))
        .join('\n');

      const stmts = clean
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('BEGIN') && !s.startsWith('COMMIT') && !s.startsWith('COMMENT ON') && !s.startsWith('CREATE TRIGGER') && !s.toUpperCase().startsWith('CREATE EXTENSION'));

      for (const stmt of stmts) {
        const sanitizedStmt = stmt.replace(/,\s*\)/g, ')');
        this.db.public.none(sanitizedStmt);
      }
    } catch (err) {
      console.error('SQL Execution error:', err);
    }
  }

  private seedDefaultData() {
    try {
      this.db.public.none(`
        INSERT INTO core.organizations (public_id, name, slug)
        VALUES ('11111111-1111-1111-1111-111111111111', 'Default Org', 'default-org')
        ON CONFLICT DO NOTHING;
      `);

      this.db.public.none(`
        INSERT INTO core.projects (public_id, organization_id, ref, name, db_name, status, region)
        VALUES ('22222222-2222-2222-2222-222222222222', 1, 'proj_default', 'Default Project', 'vcoredb_default', 'ready', 'us-east-1')
        ON CONFLICT DO NOTHING;
      `);

      this.db.public.none(`
        INSERT INTO core.api_keys (public_id, project_id, name, key_prefix, key_hash, role)
        VALUES
        ('33333333-3333-3333-3333-333333333333', 1, 'Default Anon Key', 'vcore_anon_', 'vcore_anon_default_key', 'anon'),
        ('44444444-4444-4444-4444-444444444444', 1, 'Default Service Role Key', 'vcore_service_', 'vcore_service_default_key', 'service_role')
        ON CONFLICT DO NOTHING;
      `);

      this.db.public.none(`
        INSERT INTO billing.project_quotas (public_id, project_id, expansion_packs)
        VALUES ('55555555-5555-5555-5555-555555555555', 1, 0)
        ON CONFLICT DO NOTHING;
      `);
    } catch (err) {
      console.error('Seeding error:', err);
    }
  }
}

export const dbEngine = DatabaseEngine.getInstance();
