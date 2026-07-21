import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class StorageService implements OnApplicationBootstrap {
    private readonly cfg;
    private readonly logger;
    private readonly s3;
    private readonly bucket;
    constructor(cfg: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    uploadFrame(key: string, buffer: Buffer, contentType?: string): Promise<string>;
    getPresignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
    streamObject(key: string): Promise<NodeJS.ReadableStream | null>;
}
