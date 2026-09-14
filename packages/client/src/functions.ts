import { VCoreError } from './errors';

export class FunctionsClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  public async invoke(slug: string, options: { body?: any; query?: Record<string, string> } = {}) {
    try {
      const url = new URL(`${this.baseUrl}/functions/${slug}/invoke`);
      if (options.query) {
        Object.keys(options.query).forEach(k => url.searchParams.append(k, options.query![k]));
      }

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vcore-api-key': this.apiKey,
        },
        body: JSON.stringify(options.body || {}),
      });

      const json = await res.json();
      if (!res.ok) {
        return { data: null, error: new VCoreError(json.error?.message || 'Invocation failed', json.error?.code, res.status) };
      }

      return { data: json.result, logs: json.logs, error: null };
    } catch (err: any) {
      return { data: null, error: new VCoreError(err.message) };
    }
  }
}
