import { VCoreError } from './errors';

export class StorageBucket {
  private baseUrl: string;
  private apiKey: string;
  private bucketName: string;

  constructor(baseUrl: string, apiKey: string, bucketName: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.bucketName = bucketName;
  }

  public async upload(path: string, fileData: Buffer | Blob | string, mimeType: string = 'text/plain') {
    try {
      const formData = new FormData();
      const blob = typeof fileData === 'string' ? new Blob([fileData], { type: mimeType }) : fileData;
      formData.append('file', blob as any, path);
      formData.append('path', path);

      const res = await fetch(`${this.baseUrl}/storage/buckets/${this.bucketName}/objects`, {
        method: 'POST',
        headers: {
          'x-vcore-api-key': this.apiKey,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        return { data: null, error: new VCoreError(json.error?.message || 'Upload failed', json.error?.code, res.status) };
      }

      return { data: json, error: null };
    } catch (err: any) {
      return { data: null, error: new VCoreError(err.message) };
    }
  }

  public async download(objectId: string) {
    try {
      const res = await fetch(`${this.baseUrl}/storage/buckets/${this.bucketName}/objects/${objectId}`, {
        headers: {
          'x-vcore-api-key': this.apiKey,
        },
      });

      if (!res.ok) {
        return { data: null, error: new VCoreError('Download failed', 'DOWNLOAD_FAILED', res.status) };
      }

      const blob = await res.blob();
      return { data: blob, error: null };
    } catch (err: any) {
      return { data: null, error: new VCoreError(err.message) };
    }
  }

  public async remove(objectId: string) {
    try {
      const res = await fetch(`${this.baseUrl}/storage/buckets/${this.bucketName}/objects/${objectId}`, {
        method: 'DELETE',
        headers: {
          'x-vcore-api-key': this.apiKey,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        return { data: null, error: new VCoreError(json.error?.message || 'Delete failed', json.error?.code, res.status) };
      }

      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: new VCoreError(err.message) };
    }
  }
}

export class StorageClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  public from(bucketName: string): StorageBucket {
    return new StorageBucket(this.baseUrl, this.apiKey, bucketName);
  }
}
