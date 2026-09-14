import { VCoreError } from './errors';

export interface ClientOptions {
  url: string;
  apiKey: string;
  autoRefreshToken?: boolean;
  persistSession?: boolean;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error?: VCoreError | null;
}

export interface QueryResult<T = any> {
  data: T | null;
  error: VCoreError | null;
}

export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';

export type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;
