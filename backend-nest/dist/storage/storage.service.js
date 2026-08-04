"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
let StorageService = StorageService_1 = class StorageService {
    constructor(cfg) {
        this.cfg = cfg;
        this.logger = new common_1.Logger(StorageService_1.name);
        this.bucket = cfg.get('RUSTFS_BUCKET') ?? 'simapd-frames';
        this.s3 = new client_s3_1.S3Client({
            endpoint: cfg.get('RUSTFS_ENDPOINT') ?? 'http://rustfs:9000',
            credentials: {
                accessKeyId: cfg.get('RUSTFS_ACCESS_KEY') ?? 'QRSSaQVq8Rue4AnjHXJT',
                secretAccessKey: cfg.get('RUSTFS_SECRET_KEY') ?? '4k8h3y9SBkK9bwjM9VucNI4YKBNpXE07oRH9wIme',
            },
            region: 'us-east-1',
            forcePathStyle: true,
        });
    }
    async onApplicationBootstrap() {
        try {
            await this.s3.send(new client_s3_1.HeadBucketCommand({ Bucket: this.bucket }));
            this.logger.log(`Bucket sudah ada: ${this.bucket}`);
        }
        catch {
            try {
                await this.s3.send(new client_s3_1.CreateBucketCommand({ Bucket: this.bucket }));
                this.logger.log(`Bucket dibuat: ${this.bucket}`);
            }
            catch (e) {
                this.logger.warn(`Gagal buat bucket: ${e.message}`);
            }
        }
        try {
            const policy = JSON.stringify({
                Version: '2012-10-17',
                Statement: [{
                        Sid: 'PublicRead',
                        Effect: 'Allow',
                        Principal: '*',
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${this.bucket}/*`],
                    }],
            });
            await this.s3.send(new client_s3_1.PutBucketPolicyCommand({
                Bucket: this.bucket,
                Policy: policy,
            }));
            this.logger.log(`Bucket policy public-read diterapkan: ${this.bucket}`);
        }
        catch (e) {
            this.logger.warn(`Gagal set bucket policy: ${e.message}`);
        }
    }
    async uploadFrame(key, buffer, contentType = 'image/jpeg') {
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        }));
        return key;
    }
    async streamObject(key) {
        try {
            const res = await this.s3.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }));
            if (!res.Body)
                return null;
            return res.Body;
        }
        catch (e) {
            this.logger.warn(`streamObject(${key}) gagal: ${e.message}`);
            return null;
        }
    }
    async objectExists(key) {
        try {
            await this.s3.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map