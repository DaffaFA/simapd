import cv2, time, threading, os
from datetime import datetime, timezone
from pathlib import Path
import base64
from storage_client import StorageClient

class StreamReader:
  def __init__(self, rtsp_url, camera_id, detector, redis_pub, storage_client: StorageClient = None):
    self.rtsp_url = rtsp_url; self.camera_id = camera_id
    self.detector = detector; self.redis_pub = redis_pub
    self.storage_client = storage_client or StorageClient()
    self.is_running = False; self._thread = None
    self._cooldown: dict[int, float] = {}
    self.COOLDOWN_S = 30
    self.PROCESS_EVERY_N = 3   # ~10fps dari 30fps source
    self.FRAME_PUBLISH_EVERY = 3   # publish 1 dari setiap 3 processed frame -> ~3 FPS di browser
    self.FRAME_TARGET_WIDTH  = 854  # resize ke lebar ini sebelum encode (854x480 untuk 16:9)
    self.FRAME_JPEG_QUALITY  = 65   # JPEG quality: 65 = ~20-30KB per frame

  def start(self):
    self.is_running = True
    self._thread = threading.Thread(target=self._loop, daemon=True, name=f'inference-{self.camera_id}')
    self._thread.start()
    print(f'[{self.camera_id}] Inference thread started (PID-safe daemon thread)')
    # CATATAN: daemon=True → thread otomatis mati saat main process exit
    # Ini BENAR. Jangan ganti dengan asyncio.create_task() atau apapun async.

  def stop(self):
    self.is_running = False
    if self._thread: self._thread.join(timeout=5)

  def _save_frame(self, frame, camera_id: str, track_id: int) -> str | None:
    """
    Simpan frame sebagai JPEG ke RustFS.
    Return object_key (frame_key) jika sukses.
    """
    try:
      ts = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')
      # Format key: frames/CAM-01/2026..._track1.jpg
      object_key = f'frames/{camera_id}/{ts}_track{track_id}.jpg'
      return self.storage_client.upload_frame(frame, object_key)
    except Exception as e:
      print(f'[StreamReader] Frame save failed: {e}')
      return None

  def _publish_frame(self, frame, camera_id: str, detections: list, timestamp: str) -> None:
    try:
        h, w = frame.shape[:2]
        if w == 0 or h == 0:
            return

        target_w = self.FRAME_TARGET_WIDTH
        target_h = int(h * target_w / w)
        resized  = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_LINEAR)

        ok, jpeg_buf = cv2.imencode('.jpg', resized, [cv2.IMWRITE_JPEG_QUALITY, self.FRAME_JPEG_QUALITY])
        if not ok:
            return

        frame_b64 = base64.b64encode(jpeg_buf.tobytes()).decode('utf-8')

        scale_x = target_w / w
        scale_y = target_h / h
        scaled_dets = []
        for det in detections:
            x1, y1, x2, y2 = det.get('bbox', [0, 0, 0, 0])
            scaled_dets.append({
                'track_id':    det.get('track_id'),
                'bbox':        [int(x1 * scale_x), int(y1 * scale_y), int(x2 * scale_x), int(y2 * scale_y)],
                'helm_color':  det.get('helm_color', 'Unknown'),
                'role_label':  det.get('role_label', 'Unknown'),
                'is_compliant': det.get('is_compliant', True),
                'missing_ppe': det.get('missing_ppe', []),
                'confidence':  det.get('confidence', 0.0),
            })

        self.redis_pub.publish('frames', {
            'event':      'frame',
            'camera_id':  camera_id,
            'frame_b64':  frame_b64,
            'width':      target_w,
            'height':     target_h,
            'detections': scaled_dets,
            'timestamp':  timestamp,
        })
    except Exception as e:
        print(f'[StreamReader] Frame publish error: {e}')

  def _loop(self):
    """
    BLOCKING LOOP — berjalan di OS daemon thread.
    cv2.VideoCapture dan YOLO inference adalah blocking calls.
    Ini BENAR karena berjalan di thread terpisah, bukan asyncio.
    """
    cap = None; frame_n = 0
    frame_pub_counter = 0
    while self.is_running:
      if cap is None or not cap.isOpened():
        print(f'[{self.camera_id}] Connecting to stream...')
        cap = cv2.VideoCapture(self.rtsp_url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
          print(f'[{self.camera_id}] Failed, retry in 5s')
          time.sleep(5); cap = None; continue

      ret, frame = cap.read()
      if not ret:
        print(f'[{self.camera_id}] Frame fail, reconnecting...')
        cap.release(); cap = None; time.sleep(1); continue

      frame_n += 1
      if frame_n % self.PROCESS_EVERY_N != 0: continue

      try:
        ts = datetime.now(timezone.utc).isoformat()
        
        results = self.detector.process_frame(frame, self.camera_id)
        
        frame_pub_counter += 1
        if frame_pub_counter % self.FRAME_PUBLISH_EVERY == 0:
            self._publish_frame(frame, self.camera_id, results, ts)

        for det in results:
          
          if not det['is_compliant']:
            last = self._cooldown.get(det['track_id'], 0)
            if time.time() - last > self.COOLDOWN_S:
              self._cooldown[det['track_id']] = time.time()

              # Capture frame saat violation terdeteksi
              frame_key = self._save_frame(frame, self.camera_id, det['track_id'])

              self.redis_pub.publish('detections', {
                **det,
                'event':'detection',
                'timestamp': ts,
                'frame_key': frame_key,
              })
          else:
            # Jika compliant, publish tanpa frame_path
            self.redis_pub.publish('detections', {'event':'detection','timestamp':ts,**det})

        if (frame_n // self.PROCESS_EVERY_N) % 50 == 0:
          self.redis_pub.publish('heartbeat', {'camera_id':self.camera_id,'fps':10,'timestamp':ts})
      except Exception as e:
        print(f'[{self.camera_id}] Inference error: {e}')

    if cap: cap.release()
