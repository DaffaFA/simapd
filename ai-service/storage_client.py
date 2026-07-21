import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
import os
import io
import cv2

class StorageClient:
    def __init__(self):
        self.endpoint = os.getenv('RUSTFS_ENDPOINT', 'http://localhost:9000')
        self.access_key = os.getenv('RUSTFS_ACCESS_KEY', 'rustfsadmin')
        self.secret_key = os.getenv('RUSTFS_SECRET_KEY', 'rustfsadmin')
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

    def upload_frame(self, frame_bgr, object_key: str, quality: int = 85) -> str | None:
        """
        Encode frame numpy (BGR) ke JPEG dan upload langsung ke RustFS di memory
        tanpa perlu simpan ke disk (I/O optimization).
        Return object_key jika sukses, None jika gagal.
        """
        try:
            success, buffer = cv2.imencode('.jpg', frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
            if not success:
                return None
                
            io_buffer = io.BytesIO(buffer)
            self.s3.upload_fileobj(
                io_buffer, 
                self.bucket, 
                object_key,
                ExtraArgs={'ContentType': 'image/jpeg'}
            )
            return object_key
        except Exception as e:
            print(f"[StorageClient] Gagal upload {object_key}: {e}")
            return None
