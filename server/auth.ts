import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { dbEngine } from './db';
import { escapeSqlString } from './utils';

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'vcoredb_super_secret_jwt_key_2025';

export interface AuthUser {
  id: number;
  public_id: string;
  project_id: number;
  email: string;
  role: string;
}

export class AuthService {
  public static async signup(projectId: number, email: string, password: string, metadata: any = {}) {
    const escapedEmail = escapeSqlString(email.toLowerCase());
    const existing = dbEngine.db.public.many(
      `SELECT * FROM auth.users WHERE project_id = ${projectId} AND LOWER(email) = '${escapedEmail}' AND deleted_at IS NULL`
    );
    if (existing.length > 0) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const publicId = crypto.randomUUID();

    dbEngine.db.public.none(`
      INSERT INTO auth.users (public_id, project_id, email, password_hash, is_verified, raw_user_meta_data)
      VALUES ('${publicId}', ${projectId}, '${escapedEmail}', '${passwordHash}', true, '${escapeSqlString(JSON.stringify(metadata))}')
    `);

    const user = dbEngine.db.public.one(
      `SELECT * FROM auth.users WHERE project_id = ${projectId} AND LOWER(email) = '${escapedEmail}'`
    ) as any;

    const token = jwt.sign(
      { sub: user.public_id, userId: user.id, projectId, email: user.email, role: 'authenticated', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    dbEngine.db.public.none(`
      INSERT INTO auth.sessions (public_id, project_id, user_id, token, refresh_token, expires_at)
      VALUES ('${crypto.randomUUID()}', ${projectId}, ${user.id}, '${token}', '${refreshToken}', '${expiresAt}')
    `);

    return {
      user: {
        id: user.public_id,
        email: user.email,
        user_metadata: user.raw_user_meta_data,
        created_at: user.created_at,
      },
      session: {
        access_token: token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      },
    };
  }

  public static async login(projectId: number, email: string, password: string) {
    const escapedEmail = escapeSqlString(email.toLowerCase());
    const users = dbEngine.db.public.many(
      `SELECT * FROM auth.users WHERE project_id = ${projectId} AND LOWER(email) = '${escapedEmail}' AND deleted_at IS NULL`
    );
    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }
    const user = users[0] as any;
    if (user.disabled) {
      throw new Error('User account is disabled');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { sub: user.public_id, userId: user.id, projectId, email: user.email, role: 'authenticated', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    dbEngine.db.public.none(`
      INSERT INTO auth.sessions (public_id, project_id, user_id, token, refresh_token, expires_at)
      VALUES ('${crypto.randomUUID()}', ${projectId}, ${user.id}, '${token}', '${refreshToken}', '${expiresAt}')
    `);

    dbEngine.db.public.none(`
      UPDATE auth.users SET last_sign_in_at = NOW() WHERE id = ${user.id}
    `);

    return {
      user: {
        id: user.public_id,
        email: user.email,
        user_metadata: user.raw_user_meta_data,
        created_at: user.created_at,
      },
      session: {
        access_token: token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      },
    };
  }

  public static verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        id: decoded.userId,
        public_id: decoded.sub,
        project_id: decoded.projectId,
        email: decoded.email,
        role: decoded.role || 'authenticated',
      };
    } catch {
      throw new Error('AUTH_INVALID_TOKEN');
    }
  }

  public static async platformSignup(email: string, password: string, metadata: any = {}) {
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const escapedEmail = escapeSqlString(email.toLowerCase());
    const existing = dbEngine.db.public.many(
      `SELECT * FROM auth.users WHERE LOWER(email) = '${escapedEmail}' AND deleted_at IS NULL`
    );
    if (existing.length > 0) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const publicId = crypto.randomUUID();

    dbEngine.db.public.none(`
      INSERT INTO auth.users (public_id, project_id, email, password_hash, is_verified, raw_user_meta_data)
      VALUES ('${publicId}', 1, '${escapedEmail}', '${passwordHash}', true, '${escapeSqlString(JSON.stringify(metadata))}')
    `);

    const user = dbEngine.db.public.one(
      `SELECT * FROM auth.users WHERE LOWER(email) = '${escapedEmail}' AND deleted_at IS NULL`
    ) as any;

    const token = jwt.sign(
      { sub: user.public_id, userId: user.id, projectId: 0, email: user.email, role: 'platform_user', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    dbEngine.db.public.none(`
      INSERT INTO auth.sessions (public_id, project_id, user_id, token, refresh_token, expires_at)
      VALUES ('${crypto.randomUUID()}', 1, ${user.id}, '${token}', '${refreshToken}', '${expiresAt}')
    `);

    return {
      user: {
        id: user.public_id,
        email: user.email,
        user_metadata: user.raw_user_meta_data,
        created_at: user.created_at,
      },
      session: {
        access_token: token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      },
    };
  }

  public static async platformLogin(email: string, password: string) {
    const escapedEmail = escapeSqlString(email.toLowerCase());
    const users = dbEngine.db.public.many(
      `SELECT * FROM auth.users WHERE LOWER(email) = '${escapedEmail}' AND deleted_at IS NULL`
    );
    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }
    const user = users[0] as any;
    if (user.disabled) {
      throw new Error('User account is disabled');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { sub: user.public_id, userId: user.id, projectId: 0, email: user.email, role: 'platform_user', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    dbEngine.db.public.none(`
      INSERT INTO auth.sessions (public_id, project_id, user_id, token, refresh_token, expires_at)
      VALUES ('${crypto.randomUUID()}', 1, ${user.id}, '${token}', '${refreshToken}', '${expiresAt}')
    `);

    dbEngine.db.public.none(`
      UPDATE auth.users SET last_sign_in_at = NOW() WHERE id = ${user.id}
    `);

    return {
      user: {
        id: user.public_id,
        email: user.email,
        user_metadata: user.raw_user_meta_data,
        created_at: user.created_at,
      },
      session: {
        access_token: token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      },
    };
  }

  public static async getSessionUser(token: string) {
    const user = this.verifyToken(token);
    const escapedSub = escapeSqlString(user.public_id || '');
    const dbUser = dbEngine.db.public.one(
      `SELECT public_id as id, email, raw_user_meta_data, created_at FROM auth.users WHERE (public_id = '${escapedSub}' OR id = ${user.id || 0}) AND deleted_at IS NULL`
    ) as any;
    return {
      id: dbUser.id,
      email: dbUser.email,
      user_metadata: dbUser.raw_user_meta_data,
      created_at: dbUser.created_at,
    };
  }

  public static listUsers(projectId: number) {
    return dbEngine.db.public.many(
      `SELECT public_id as id, email, is_verified, disabled, raw_user_meta_data, last_sign_in_at, created_at FROM auth.users WHERE project_id = ${projectId} AND deleted_at IS NULL`
    );
  }

  public static updateUser(projectId: number, userId: string, updateData: { disabled?: boolean }) {
    if (updateData.disabled !== undefined) {
      dbEngine.db.public.none(
        `UPDATE auth.users SET disabled = ${updateData.disabled} WHERE project_id = ${projectId} AND public_id = '${escapeSqlString(userId)}'`
      );
    }
    return { success: true };
  }

  public static deleteUser(projectId: number, userId: string) {
    dbEngine.db.public.none(
      `UPDATE auth.users SET deleted_at = NOW() WHERE project_id = ${projectId} AND public_id = '${escapeSqlString(userId)}'`
    );
    return { success: true };
  }
}
