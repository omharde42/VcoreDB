import { ClientOptions, QueryResult } from './types';
import { VCoreError } from './errors';

export class QueryBuilder<T = any> {
  private baseUrl: string;
  private apiKey: string;
  private table: string;
  private sessionToken?: string;
  private queryParams: Record<string, string> = {};

  constructor(baseUrl: string, apiKey: string, table: string, sessionToken?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.table = table;
    this.sessionToken = sessionToken;
  }

  public select(fields: string = '*'): this {
    this.queryParams['select'] = fields;
    return this;
  }

  public eq(column: string, value: any): this {
    this.queryParams[column] = `eq.${value}`;
    return this;
  }

  public neq(column: string, value: any): this {
    this.queryParams[column] = `neq.${value}`;
    return this;
  }

  public gt(column: string, value: any): this {
    this.queryParams[column] = `gt.${value}`;
    return this;
  }

  public gte(column: string, value: any): this {
    this.queryParams[column] = `gte.${value}`;
    return this;
  }

  public lt(column: string, value: any): this {
    this.queryParams[column] = `lt.${value}`;
    return this;
  }

  public lte(column: string, value: any): this {
    this.queryParams[column] = `lte.${value}`;
    return this;
  }

  public like(column: string, value: string): this {
    this.queryParams[column] = `like.${value}`;
    return this;
  }

  public order(column: string, options: { ascending?: boolean } = { ascending: true }): this {
    this.queryParams['order'] = `${column}.${options.ascending ? 'asc' : 'desc'}`;
    return this;
  }

  public limit(count: number): this {
    this.queryParams['limit'] = String(count);
    return this;
  }

  public offset(count: number): this {
    this.queryParams['offset'] = String(count);
    return this;
  }

  public async insert(record: Partial<T>): Promise<QueryResult<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-vcore-api-key': this.apiKey,
      };
      if (this.sessionToken) {
        headers['Authorization'] = `Bearer ${this.sessionToken}`;
      }

      const res = await fetch(`${this.baseUrl}/tables/${this.table}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(record),
      });
      const json = await res.json();

      if (!res.ok) {
        return { data: null, error: new VCoreError(json.error?.message || 'Insert failed', json.error?.code, res.status) };
      }

      return { data: json.data as T, error: null };
    } catch (err: any) {
      return { data: null, error: new VCoreError(err.message) };
    }
  }

  private action: 'select' | 'update' | 'delete' = 'select';
  private updatePayload?: Partial<T>;

  public update(record: Partial<T>): this {
    this.action = 'update';
    this.updatePayload = record;
    return this;
  }

  public delete(): this {
    this.action = 'delete';
    return this;
  }

  public async execute(): Promise<QueryResult<any>> {
    try {
      const url = new URL(`${this.baseUrl}/tables/${this.table}`);
      Object.keys(this.queryParams).forEach(k => url.searchParams.append(k, this.queryParams[k]));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-vcore-api-key': this.apiKey,
      };
      if (this.sessionToken) {
        headers['Authorization'] = `Bearer ${this.sessionToken}`;
      }

      let method = 'GET';
      let body: string | undefined = undefined;

      if (this.action === 'update') {
        method = 'PATCH';
        body = JSON.stringify(this.updatePayload || {});
      } else if (this.action === 'delete') {
        method = 'DELETE';
      }

      const res = await fetch(url.toString(), { method, headers, body });
      const json = await res.json();

      if (!res.ok) {
        return { data: null, error: new VCoreError(json.error?.message || 'Query execution failed', json.error?.code, res.status) };
      }

      if (this.action === 'delete') {
        return { data: true, error: null };
      }

      return { data: (json.data || json.updated) as T[], error: null };
    } catch (err: any) {
      return { data: null, error: new VCoreError(err.message) };
    }
  }
}
