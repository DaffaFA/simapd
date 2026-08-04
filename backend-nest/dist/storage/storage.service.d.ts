import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
export declare class StorageService implements OnApplicationBootstrap {
    private readonly cfg;
    private readonly logger;
    private readonly s3;
    private readonly bucket;
    constructor(cfg: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    uploadFrame(key: string, buffer: Buffer, contentType?: string): Promise<string>;
    streamObject(key: string): Promise<Readable | null>;
    objectExists(key: string): Promise<boolean>;
}
