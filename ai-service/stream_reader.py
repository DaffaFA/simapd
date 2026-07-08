import cv2, time, threading, os
from datetime import datetime, timezone

class StreamReader:
  def __init__(self, rtsp_url, camera_id, detector, redis_pub):
    self.rtsp_url = rtsp_url; self.camera_id = camera_id
    self.detector = detector; self.redis_pub = redis_pub
    self.is_running = False; self._thread = None
    self._cooldown: dict[int, float] = {}
    self.COOLDOWN_S = 30
    self.PROCESS_EVERY_N = 3   # ~10fps dari 30fps source

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

  def _loop(self):
    """
    BLOCKING LOOP — berjalan di OS daemon thread.
    cv2.VideoCapture dan YOLO inference adalah blocking calls.
    Ini BENAR karena berjalan di thread terpisah, bukan asyncio.
    """
    cap = None; frame_n = 0
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
        for det in self.detector.process_frame(frame, self.camera_id):
          self.redis_pub.publish('detections', {'event':'detection','timestamp':ts,**det})
          if not det['is_compliant']:
            last = self._cooldown.get(det['track_id'], 0)
            if time.time() - last >= self.COOLDOWN_S:
              self._cooldown[det['track_id']] = time.time()
              self._capture_frame(frame, det['track_id'], ts)

        if (frame_n // self.PROCESS_EVERY_N) % 50 == 0:
          self.redis_pub.publish('heartbeat', {'camera_id':self.camera_id,'fps':10,'timestamp':ts})
      except Exception as e:
        print(f'[{self.camera_id}] Inference error: {e}')

    if cap: cap.release()

  def _capture_frame(self, frame, track_id, ts):
    try:
      out_dir = os.path.join('captures', ts[:10], self.camera_id)
      os.makedirs(out_dir, exist_ok=True)
      path = os.path.join(out_dir, f'{track_id}_{ts.replace(":","_")}.jpg')
      cv2.imwrite(path, frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
    except Exception as e:
      print(f'Capture error: {e}')
