export interface StoragePort {
  uploadFile(bucket: string, key: string, file: Buffer, contentType?: string): Promise<string>;
  getFileUrl(bucket: string, key: string): Promise<string>;
  deleteFile(bucket: string, key: string): Promise<void>;
  bucketExists(bucket: string): Promise<boolean>;
  ensureBucket(bucket: string): Promise<void>;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');
