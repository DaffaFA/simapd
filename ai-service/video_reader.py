import cv2
import time
import threading
import base64
import os
from datetime import datetime
from pathlib import Path

# ── Konfigurasi dari environment ──────────────────────────────────────────────
PROCESS_EVERY_N     = int(os.environ.get('PROCESS_EVERY_N',     '3'))
FRAME_PUBLISH_EVERY = int(os.environ.get('FRAME_PUBLISH_EVERY', '3'))
FRAME_TARGET_WIDTH  = int(os.environ.get('FRAME_TARGET_WIDTH',  '854'))
FRAME_JPEG_QUALITY  = int(os.environ.get('FRAME_JPEG_QUALITY',  '65'))


class VideoReader:
    """
    Baca video file MP4 untuk demo — berjalan di daemon thread.
    Setiap video = satu kamera virtual (camera_id dari nama file).
    Upload violation frame ke RustFS seperti StreamReader.
    """

    def __init__(
        self,
        video_dir:     str,
        detector,
        redis_pub,
        captures_dir:  str   = '/app/captures',  # tidak dipakai lagi (RustFS)
        loop:          bool  = True,
        delay_between: float = 2.0,
    ):
        self.video_dir     = Path(video_dir)
        self.detector      = detector
        self.redis_pub     = redis_pub
        self.loop          = loop
        self.delay_between = delay_between
        self.is_running    = False
        self._thread       = None

        # Inisialisasi StorageClient untuk upload ke RustFS
        try:
            from storage_client import StorageClient
            self.storage = StorageClient()
            print('[VideoReader] StorageClient initialized — frames akan di-upload ke RustFS')
        except Exception as e:
            self.storage = None
            print(f'[VideoReader] ⚠ StorageClient gagal init: {e}')
            print('[VideoReader]   Frames tidak akan di-upload (periksa RUSTFS_ENDPOINT)')

    # ── Thread control ────────────────────────────────────────────────────────

    def start(self):
        self.is_running = True
        self._thread = threading.Thread(
            target=self._run, daemon=True, name='demo-runner')
        self._thread.start()
        print(f'[VideoReader] Started | dir={self.video_dir} | loop={self.loop}')

    def stop(self):
        self.is_running = False
        if self._thread:
            self._thread.join(timeout=5)

    # ── Utilities ─────────────────────────────────────────────────────────────

    def _get_videos(self) -> list:
        videos = sorted(self.video_dir.glob('*.mp4'))
        if not videos:
            print(f'[VideoReader] ⚠ Tidak ada .mp4 di {self.video_dir}')
        return videos

    def _camera_id(self, video_path: Path) -> str:
        """Buat camera_id dari nama file: TC-01_compliant.mp4 → DEMO-TC-01-CO"""
        stem = video_path.stem.upper().replace('_', '-')[:12]
        return f'DEMO-{stem}'

    def _now_ts(self) -> str:
        """Timestamp valid untuk NestJS: "2026-07-23T21:00:24.123456Z" """
        return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f') + 'Z'

    def _encode_frame(self, frame, quality: int = 85):
        """Encode frame ke JPEG bytes. Return (ok, bytes)."""
        ok, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return ok, buf.tobytes() if ok else b''

    def _upload_frame(self, frame, camera_id: str, track_id: int) -> str | None:
        """Upload frame ke RustFS. Return S3 key atau None jika gagal."""
        if self.storage is None:
            print("no storage")
            return None
        ok, frame_bytes = self._encode_frame(frame, quality=85)
        if not ok:
            print("gagal encode")
            return None
        ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
        object_key = f"violations/{camera_id}/{ts}_track{track_id}.jpg"
        return self.storage.upload_frame(frame_bytes, object_key)

    def _publish_frame(self, frame, camera_id: str, detections: list, timestamp: str):
        """Publish frame ke Redis 'frames' channel untuk live stream di browser."""
        try:
            h, w = frame.shape[:2]
            if w == 0 or h == 0:
                return
            tw = FRAME_TARGET_WIDTH
            th = int(h * tw / w)
            resized = cv2.resize(frame, (tw, th), interpolation=cv2.INTER_LINEAR)
            ok, buf = cv2.imencode(
                '.jpg', resized,
                [cv2.IMWRITE_JPEG_QUALITY, FRAME_JPEG_QUALITY])
            if not ok:
                return

            sx, sy = tw / w, th / h
            scaled_dets = []
            for d in detections:
                x1, y1, x2, y2 = d.get('bbox', [0, 0, 0, 0])
                scaled_dets.append({
                    'track_id':    d.get('track_id'),
                    'bbox':        [int(x1*sx), int(y1*sy),
                                    int(x2*sx), int(y2*sy)],
                    'helm_color':  d.get('helm_color', 'Unknown'),
                    'role_label':  d.get('role_label', 'Unknown'),
                    'is_compliant': d.get('is_compliant', True),
                    'missing_ppe': d.get('missing_ppe', []),
                })

            self.redis_pub.publish('frames', {
                'event':      'frame',
                'camera_id':  camera_id,
                'frame_b64':  base64.b64encode(buf.tobytes()).decode('utf-8'),
                'width':      tw,
                'height':     th,
                'detections': scaled_dets,
                'timestamp':  timestamp,
            })
        except Exception as e:
            print(f'[VideoReader] publish_frame error: {e}')

    # ── Core processing ───────────────────────────────────────────────────────

    def _process_video(self, video_path: Path):
        camera_id = self._camera_id(video_path)
        print(f'[VideoReader] Processing: {video_path.name} → {camera_id}')

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            print(f'[VideoReader] ⚠ Tidak bisa buka: {video_path}')
            return

        fps_src   = cap.get(cv2.CAP_PROP_FPS) or 30.0
        n_frames  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f'[VideoReader]   fps={fps_src:.0f} | total_frames={n_frames}')

        frame_count    = 0
        frame_pub_ctr  = 0
        recorded: set  = set()      # track_ids yang sudah dicatat violasi-nya
        n_violations   = 0

        while self.is_running:
            ret, frame = cap.read()
            if not ret:
                print(f'[VideoReader] End of: {video_path.name} | '
                      f'violations recorded: {n_violations}')
                break

            frame_count += 1
            if frame_count % PROCESS_EVERY_N != 0:
                continue

            timestamp = self._now_ts()

            # ── Inference ────────────────────────────────────────────────────
            try:
                results = self.detector.process_frame(frame, camera_id)
            except Exception as e:
                print(f'[VideoReader] inference error: {e}')
                results = []

            # ── Publish frame ke browser (live stream) ────────────────────────
            frame_pub_ctr += 1
            if frame_pub_ctr % FRAME_PUBLISH_EVERY == 0:
                self._publish_frame(frame, camera_id, results, timestamp)

            # ── Publish detection events + upload frame ke RustFS ─────────────
            for det in results:
                # Event type 'detection' — untuk WS broadcast only, TIDAK trigger DB record
                self.redis_pub.publish('detections', {
                    **det,
                    'event':     'detection',
                    'timestamp': timestamp,
                })

                # Violation: hanya jika track_id belum pernah dicatat
                if not det.get('is_compliant', True):
                    track_key = f"{camera_id}_{det.get('track_id')}"
                    if track_key not in recorded:
                        recorded.add(track_key)
                        n_violations += 1

                        # Upload frame ke RustFS DULU, baru publish event
                        frame_key = self._upload_frame(
                            frame, camera_id, det.get('track_id', 0))

                        if frame_key:
                            print(f'[VideoReader] 📸 Frame uploaded: {frame_key}')
                        else:
                            print(f'[VideoReader] ⚠ Frame upload gagal '
                                  f'(track_id={det.get("track_id")})')

                        # Event type 'violation' — trigger DB record + frame_key
                        self.redis_pub.publish('detections', {
                            **det,
                            'event':     'violation',
                            'timestamp': timestamp,
                            'frame_key': frame_key,   # S3 key untuk NestJS
                        })

            # Pace ke effective FPS
            time.sleep(max(0, (PROCESS_EVERY_N / fps_src) - 0.01))

        cap.release()

        # Heartbeat setelah video selesai
        self.redis_pub.publish('heartbeat', {
            'camera_id': camera_id,
            'fps':       round(fps_src / PROCESS_EVERY_N, 1),
            'timestamp': self._now_ts(),
            'status':    'video_complete',
        })

    def _run(self):
        """Main loop: proses semua video, opsional loop ulang."""
        while self.is_running:
            videos = self._get_videos()
            if not videos:
                time.sleep(5)
                continue

            for vp in videos:
                if not self.is_running:
                    break
                self._process_video(vp)
                if self.is_running and self.delay_between > 0:
                    print(f'[VideoReader] Jeda {self.delay_between}s...')
                    time.sleep(self.delay_between)

            if not self.loop:
                print('[VideoReader] Semua video selesai.')
                break
            print('[VideoReader] Looping ulang dari awal...')
            time.sleep(2)
