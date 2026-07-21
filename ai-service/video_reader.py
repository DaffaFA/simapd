import cv2, time, threading, base64, os
from pathlib import Path
from datetime import datetime, timezone


PROCESS_EVERY_N    = int(os.environ.get('PROCESS_EVERY_N',    '3'))
FRAME_PUBLISH_EVERY = int(os.environ.get('FRAME_PUBLISH_EVERY', '3'))
FRAME_TARGET_WIDTH  = int(os.environ.get('FRAME_TARGET_WIDTH',  '854'))
FRAME_JPEG_QUALITY  = int(os.environ.get('FRAME_JPEG_QUALITY',  '65'))


class VideoReader:
    """Baca video file MP4 untuk demo — berjalan di daemon thread."""

    def __init__(
        self,
        video_dir:    str,
        detector,
        redis_pub,
        captures_dir: str   = '/app/captures',
        loop:         bool  = True,
        delay_between: float = 2.0,
    ):
        self.video_dir     = Path(video_dir)
        self.detector      = detector
        self.redis_pub     = redis_pub
        self.captures_dir  = captures_dir
        self.loop          = loop
        self.delay_between = delay_between
        self.is_running    = False
        self._thread       = None

    # ─── Thread control ───────────────────────────────────────────────────────
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

    # ─── Utilities ────────────────────────────────────────────────────────────
    def _get_videos(self) -> list:
        videos = sorted(self.video_dir.glob('*.mp4'))
        if not videos:
            print(f'[VideoReader] ⚠ No .mp4 files in {self.video_dir}')
        return videos

    def _camera_id(self, video_path: Path) -> str:
        stem = video_path.stem.upper().replace('_', '-')[:12]
        return f'DEMO-{stem}'

    def _save_frame(self, frame, camera_id: str, track_id: int):
        try:
            ts      = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')
            cam_dir = Path(self.captures_dir) / camera_id
            cam_dir.mkdir(parents=True, exist_ok=True)
            fp      = cam_dir / f'{ts}_track{track_id}.jpg'
            cv2.imwrite(str(fp), frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            return str(fp)
        except Exception as e:
            print(f'[VideoReader] save_frame error: {e}')
            return None

    def _publish_frame(self, frame, camera_id: str, detections: list, timestamp: str):
        """
        Resize → JPEG base64 → scale bboxes → publish ke Redis "frames".
        Dipanggil dari daemon thread — tidak ada asyncio.
        """
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

            sx = tw / w
            sy = th / h
            scaled = []
            for d in detections:
                x1, y1, x2, y2 = d.get('bbox', [0, 0, 0, 0])
                scaled.append({
                    'track_id':    d.get('track_id'),
                    'bbox':        [int(x1*sx), int(y1*sy), int(x2*sx), int(y2*sy)],
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
                'detections': scaled,
                'timestamp':  timestamp,
            })
        except Exception as e:
            print(f'[VideoReader] publish_frame error: {e}')

    # ─── Core processing loop ─────────────────────────────────────────────────
    def _process_video(self, video_path: Path):
        camera_id = self._camera_id(video_path)
        print(f'[VideoReader] Processing: {video_path.name} → {camera_id}')

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            print(f'[VideoReader] ⚠ Cannot open: {video_path}')
            return

        fps_src     = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total       = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f'[VideoReader]   fps={fps_src:.0f} total_frames={total}')

        frame_count      = 0
        frame_pub_ctr    = 0
        cooldown: dict   = {}   # track_id key → last_violation_time

        while self.is_running:
            ret, frame = cap.read()
            if not ret:
                print(f'[VideoReader] End of: {video_path.name}')
                break

            frame_count += 1
            # Proses setiap N frame (skip sisanya)
            if frame_count % PROCESS_EVERY_N != 0:
                continue

            timestamp = datetime.now(timezone.utc).isoformat() + 'Z'

            # ── Inference ────────────────────────────────────────────────────
            try:
                results = self.detector.process_frame(frame, camera_id)
            except Exception as e:
                print(f'[VideoReader] inference error: {e}')
                results = []

            # ── Publish frame ke browser (every FRAME_PUBLISH_EVERY) ─────────
            frame_pub_ctr += 1
            if frame_pub_ctr % FRAME_PUBLISH_EVERY == 0:
                self._publish_frame(frame, camera_id, results, timestamp)

            # ── Publish detection events ke violation pipeline ────────────────
            for det in results:
                self.redis_pub.publish('detections', {**det, 'timestamp': timestamp})

                if not det.get('is_compliant', True):
                    key    = f"{camera_id}_{det.get('track_id')}"
                    last_t = cooldown.get(key, 0)
                    if time.time() - last_t > 30:
                        cooldown[key] = time.time()
                        fp = self._save_frame(frame, camera_id, det.get('track_id', 0))
                        self.redis_pub.publish('detections', {
                            **det,
                            'timestamp':  timestamp,
                            'frame_path': fp,
                        })

            # Pace output ke ~effective FPS
            time.sleep(max(0, (PROCESS_EVERY_N / fps_src) - 0.01))

        cap.release()
        processed = frame_count // PROCESS_EVERY_N
        print(f'[VideoReader] Done: {video_path.name} | processed={processed} '
              f'frames_published={frame_pub_ctr // FRAME_PUBLISH_EVERY}')

    def _run(self):
        while self.is_running:
            videos = self._get_videos()
            if not videos:
                time.sleep(5)
                continue

            for vp in videos:
                if not self.is_running:
                    break
                self._process_video(vp)

                # Heartbeat antar video
                self.redis_pub.publish('heartbeat', {
                    'camera_id': self._camera_id(vp),
                    'fps':       round(30 / PROCESS_EVERY_N, 1),
                    'timestamp': datetime.now(timezone.utc).isoformat() + 'Z',
                })

                if self.is_running and self.delay_between > 0:
                    print(f'[VideoReader] Delay {self.delay_between}s...')
                    time.sleep(self.delay_between)

            if not self.loop:
                print('[VideoReader] All videos done.')
                break
            print('[VideoReader] Looping...')
            time.sleep(2)
