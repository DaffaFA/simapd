import os, time, signal, sys
from dotenv import load_dotenv
load_dotenv()

def main():
  redis_url  = os.environ.get('REDIS_URL', 'redis://localhost:6379')
  rtsp_url   = os.environ.get('CAMERA_RTSP_URL', '')
  camera_id  = os.environ.get('CAMERA_ID', 'CAM-01')
  model_path = os.environ.get('YOLO_MODEL_PATH', 'models/simapd_yolov8m_sh17_DEPLOY.pt')
  confidence = float(os.environ.get('YOLO_CONFIDENCE', '0.45'))

  # Mock mode untuk development tanpa model
  if os.environ.get('MOCK_INFERENCE') == 'true':
    import mock_reader
    from redis_publisher import RedisPublisher
    mock_reader.run(camera_id, RedisPublisher(redis_url))
    return

  # Import di sini agar mock mode bisa jalan tanpa depedensi ML
  from detector import PPEDetector
  from redis_publisher import RedisPublisher
  from stream_reader import StreamReader

  redis_pub = RedisPublisher(redis_url)
  detector  = PPEDetector(model_path, confidence=confidence)
  detector.load()

  reader = StreamReader(rtsp_url, camera_id, detector, redis_pub)
  reader.start()
  print(f'AI Service running | camera={camera_id} | model={model_path}')

  def shutdown(sig, frame):
    print('Shutting down...'); reader.stop(); sys.exit(0)
  signal.signal(signal.SIGTERM, shutdown)
  signal.signal(signal.SIGINT, shutdown)
  while True: time.sleep(1)

if __name__ == '__main__': main()
