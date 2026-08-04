import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
import os
import io

class StorageClient:
    def __init__(self):
        self.endpoint = os.getenv('RUSTFS_ENDPOINT', 'http://localhost:9000')
        self.access_key = os.getenv('RUSTFS_ACCESS_KEY', 'QRSSaQVq8Rue4AnjHXJT')
        self.secret_key = os.getenv('RUSTFS_SECRET_KEY', '4k8h3y9SBkK9bwjM9VucNI4YKBNpXE07oRH9wIme')
        self.bucket = os.getenv('RUSTFS_BUCKET', 'simapd-frames')
        
        # Inisialisasi boto3 client untuk S3-compatible (RustFS)
        # config signature_version='s3v4' dibutuhkan oleh RustFS
        self.s3 = boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1' # Region diperlukan boto3 meskipun dummy
        )
        
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            self.s3.head_bucket(Bucket=self.bucket)
        except ClientError:
            try:
                self.s3.create_bucket(Bucket=self.bucket)
                print(f"[StorageClient] Bucket '{self.bucket}' dibuat.")
            except Exception as e:
                print(f"[StorageClient] Gagal membuat bucket: {e}")

        # Set public-read policy agar unsigned URL bisa diakses browser
        try:
            import json
            policy = json.dumps({
                "Version": "2012-10-17",
                "Statement": [{
                    "Sid": "PublicRead",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{self.bucket}/*"],
                }],
            })
            self.s3.put_bucket_policy(Bucket=self.bucket, Policy=policy)
            print(f"[StorageClient] Bucket policy public-read diterapkan: {self.bucket}")
        except Exception as e:
            print(f"[StorageClient] ⚠ Gagal set bucket policy: {e}")

    def upload_frame(self, frame_bytes: bytes, object_key: str) -> str | None:
        """
        Upload pre-encoded JPEG bytes langsung ke RustFS di memory
        tanpa perlu simpan ke disk (I/O optimization).
        Return object_key jika sukses, None jika gagal.
        """
        try:
            io_buffer = io.BytesIO(frame_bytes)
            self.s3.upload_fileobj(
                io_buffer, 
                self.bucket, 
                object_key,
                ExtraArgs={'ContentType': 'image/jpeg'}
            )
            print(f'[StorageClient] ✅ Uploaded: {object_key} ({len(frame_bytes)//1024}KB)')
            return object_key
        except Exception as e:
            print(f'[StorageClient] ❌ Upload FAILED: {e}')
            print(f'[StorageClient]    endpoint={self.s3.meta.endpoint_url}')
            print(f'[StorageClient]    bucket={self.bucket}')
            return None
