import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client, PutObjectCommand, GetObjectCommand,
  CreateBucketCommand, HeadBucketCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
        accessKeyId:     cfg.get('RUSTFS_ACCESS_KEY') ?? 'rustfsadmin',
        secretAccessKey: cfg.get('RUSTFS_SECRET_KEY') ?? 'rustfsadmin',
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
   * Generate presigned URL yang berlaku 5 menit.
   * Frontend dapat langsung akses URL ini tanpa perlu JWT.
   */
  async getPresignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresInSeconds })
  }

  /**
   * Stream object langsung ke response (untuk proxy download).
   * Gunakan ini sebagai fallback jika presigned URL tidak bisa digunakan.
   */
  async streamObject(key: string): Promise<NodeJS.ReadableStream | null> {
    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      )
      return res.Body as NodeJS.ReadableStream
    } catch {
      return null
    }
  }
}
