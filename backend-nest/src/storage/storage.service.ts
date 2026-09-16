import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client, PutObjectCommand, GetObjectCommand,
  CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'

@Injectable()
export class StorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageService.name)
  private readonly s3: S3Client
  private readonly bucket: string

  constructor(private readonly cfg: ConfigService) {
    this.bucket = cfg.get('RUSTFS_BUCKET') ?? 'simapd-frames'
    this.s3 = new S3Client({
      endpoint:         cfg.get('RUSTFS_ENDPOINT') ?? 'http://rustfs:9000',
      credentials: {
        accessKeyId:     cfg.get('RUSTFS_ACCESS_KEY') ?? 'CHANGE_ME_RUSTFS_ACCESS_KEY',
        secretAccessKey: cfg.get('RUSTFS_SECRET_KEY') ?? 'CHANGE_ME_RUSTFS_SECRET_KEY',
      },
      region:          'us-east-1',   // wajib diisi, nilai bebas untuk RustFS
      forcePathStyle:  true,          // wajib untuk S3-compatible (bukan AWS)
    })
  }

  async onApplicationBootstrap() {
    // Buat bucket jika belum ada
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }))
      this.logger.log(`Bucket sudah ada: ${this.bucket}`)
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }))
        this.logger.log(`Bucket dibuat: ${this.bucket}`)
      } catch (e: any) {
        this.logger.warn(`Gagal buat bucket: ${e.message}`)
      }
    }

    // Set public-read policy agar unsigned URL bisa diakses browser
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
      })
      await this.s3.send(new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: policy,
      }))
      this.logger.log(`Bucket policy public-read diterapkan: ${this.bucket}`)
    } catch (e: any) {
      this.logger.warn(`Gagal set bucket policy: ${e.message}`)
    }
  }

  /**
   * Upload buffer ke RustFS.
   * Returns the object key yang disimpan di violation.frame_key.
   */
  async uploadFrame(
    key:         string,
    buffer:      Buffer,
    contentType: string = 'image/jpeg',
  ): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    }))
    return key
  }

  /**
   * Stream object dari RustFS sebagai Node.js Readable.
   * Gunakan ini untuk proxy ke browser — JANGAN gunakan presigned URL redirect
   * karena presigned URL berisi hostname Docker yang tidak accessible dari browser.
   */
  async streamObject(key: string): Promise<Readable | null> {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      )
      if (!res.Body) return null

      // AWS SDK v3 Body adalah SdkStream — cast ke Readable untuk Node.js
      return res.Body as unknown as Readable
    } catch (e: any) {
      this.logger.warn(`streamObject(${key}) gagal: ${e.message}`)
      return null
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      )
      return true
    } catch { return false }
  }
}
