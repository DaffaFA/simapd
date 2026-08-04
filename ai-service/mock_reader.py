import time, random
from datetime import datetime, timezone

def run(camera_id: str, redis_pub):
  """
  Publish random detections setiap 1 detik untuk test pipeline WebSocket
  tanpa perlu model YOLO atau kamera fisik.
  """
  import threading
  def _loop():
    track_ids = [1, 2, 3, 4, 5]
    helm_colors = ['Kuning', 'Kuning', 'Kuning', 'Putih', 'Hijau']
    while True:
      track_id = random.choice(track_ids)
      helm = helm_colors[track_ids.index(track_id)]
      missing = random.choice([[], [], ['vest'], ['helm','vest'], ['sepatu']])
      msg = {
        'event': 'detection', 'track_id': track_id,
        'role_label': {'Kuning':'Pekerja','Putih':'Supervisor','Hijau':'Safety Officer'}[helm],
        'helm_color': helm, 'missing_ppe': missing, 'is_compliant': len(missing)==0,
        'timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f') + 'Z',
        'bbox': [100,50,200,400], 'camera_id': camera_id, 'confidence': round(random.uniform(0.7,0.99),2),
        'missing_helm': 'helm' in missing, 'missing_vest': 'vest' in missing,
        'missing_shoes': 'sepatu' in missing,
      }
      redis_pub.publish('detections', msg)
      time.sleep(1)

  t = threading.Thread(target=_loop, daemon=True); t.start()
  print(f'[MOCK] AI Service running (mock mode) | camera={camera_id}')
  while True: time.sleep(5)
