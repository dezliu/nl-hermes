import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type StoragePutResult = {
  storageKey: string;
  absolutePath: string;
};

export interface ReportStorageClient {
  put(storageKey: string, data: Buffer | string, contentType?: string): Promise<StoragePutResult>;
  get(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;
}

export class LocalReportStorageClient implements ReportStorageClient {
  constructor(private readonly baseDir: string) {}

  private resolve(storageKey: string): string {
    const normalized = storageKey.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.baseDir, normalized);
  }

  async put(storageKey: string, data: Buffer | string): Promise<StoragePutResult> {
    const absolutePath = this.resolve(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, data);
    return { storageKey, absolutePath };
  }

  async get(storageKey: string): Promise<Buffer> {
    return readFile(this.resolve(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await readFile(this.resolve(storageKey));
      return true;
    } catch {
      return false;
    }
  }
}

export function createReportStorageClient(): ReportStorageClient {
  const baseDir = process.env.REPORT_STORAGE_DIR ?? path.join(process.cwd(), 'data', 'reports');
  return new LocalReportStorageClient(baseDir);
}
