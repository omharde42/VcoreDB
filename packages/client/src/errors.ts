export class VCoreError extends Error {
  public code: string;
  public status?: number;
  public requestId?: string;

  constructor(message: string, code: string = 'VCORE_ERROR', status?: number, requestId?: string) {
    super(message);
    this.name = 'VCoreError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}
