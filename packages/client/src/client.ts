import { ClientOptions } from './types';
import { AuthClient } from './auth';
import { QueryBuilder } from './database';
import { RealtimeClient } from './realtime';
import { StorageClient } from './storage';
import { FunctionsClient } from './functions';

export class VCoreClient {
  public auth: AuthClient;
  public realtime: RealtimeClient;
  public storage: StorageClient;
  public functions: FunctionsClient;
  private baseUrl: string;
  private apiKey: string;

  constructor(options: ClientOptions) {
    this.baseUrl = options.url.replace(/\/$/, '');
    this.apiKey = options.apiKey;

    this.auth = new AuthClient(options);
    this.realtime = new RealtimeClient(this.baseUrl);
    this.storage = new StorageClient(this.baseUrl, this.apiKey);
    this.functions = new FunctionsClient(this.baseUrl, this.apiKey);
  }

  public from<T = any>(table: string): QueryBuilder<T> {
    const session = this.auth.getSession();
    return new QueryBuilder<T>(this.baseUrl, this.apiKey, table, session?.access_token);
  }
}

export function createClient(url: string | ClientOptions, apiKey?: string): VCoreClient {
  if (typeof url === 'string') {
    if (!apiKey) throw new Error('API key is required when initializing createClient');
    return new VCoreClient({ url, apiKey });
  }
  return new VCoreClient(url);
}
