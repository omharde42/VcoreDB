import { ClientOptions, AuthResponse, User, Session, AuthStateCallback, AuthChangeEvent } from './types';
import { VCoreError } from './errors';

export class AuthClient {
  private baseUrl: string;
  private apiKey: string;
  private currentSession: Session | null = null;
  private currentUser: User | null = null;
  private listeners: Set<AuthStateCallback> = new Set();

  constructor(options: ClientOptions) {
    this.baseUrl = options.url.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  public onAuthStateChange(callback: AuthStateCallback) {
    this.listeners.add(callback);
    return {
      unsubscribe: () => this.listeners.delete(callback),
    };
  }

  private notify(event: AuthChangeEvent, session: Session | null) {
    this.listeners.forEach(cb => cb(event, session));
  }

  public async signUp(params: { email: string; password: string; metadata?: Record<string, any> }): Promise<AuthResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': this.apiKey,
        },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return { user: null, session: null, error: new VCoreError(data.error?.message || 'SignUp failed', data.error?.code, res.status) };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;
      this.notify('SIGNED_IN', this.currentSession);

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: new VCoreError(err.message) };
    }
  }

  public async signIn(params: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': this.apiKey,
        },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return { user: null, session: null, error: new VCoreError(data.error?.message || 'SignIn failed', data.error?.code, res.status) };
      }

      this.currentUser = data.user;
      this.currentSession = data.session;
      this.notify('SIGNED_IN', this.currentSession);

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: new VCoreError(err.message) };
    }
  }

  public async signOut(): Promise<{ error: VCoreError | null }> {
    this.currentUser = null;
    this.currentSession = null;
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  public getSession(): Session | null {
    return this.currentSession;
  }

  public getUser(): User | null {
    return this.currentUser;
  }
}
