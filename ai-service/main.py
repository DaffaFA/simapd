import os, time, signal, sys, json
from pathlib import Path

# ── cuDNN Fix untuk local development ───────────────────────────────────────
if os.environ.get('TORCH_CUDNN_ENABLED', '1') == '0':
    import torch
    torch.backends.cudnn.enabled = False
    print('[main] cuDNN disabled via TORCH_CUDNN_ENABLED=0')

from dotenv import load_dotenv
load_dotenv()


def parse_cameras() -> list[dict]:
    """
    Parse daftar kamera dari env vars.
    Prioritas: CAMERAS (JSON array) > CAMERA_RTSP_URL + CAMERA_ID (single cam).
    """
    cameras_json = os.environ.get('CAMERAS', '').strip()
    if cameras_json:
        try:
            cams = json.loads(cameras_json)
            print(f"[main] {len(cams)} kamera dari CAMERAS env var:")
            for c in cams:
                print(f"  • {c['id']}: {c['rtsp_url']}")
            return cams
        except json.JSONDecodeError as e:
            print(f"[main] ⚠ CAMERAS JSON invalid: {e}")
            print("[main] Fallback ke CAMERA_RTSP_URL + CAMERA_ID")

    # Fallback: single camera dari env lama
    rtsp_url  = os.environ.get('CAMERA_RTSP_URL', '')
    camera_id = os.environ.get('CAMERA_ID', 'CAM-01')
    if rtsp_url:
        return [{'id': camera_id, 'rtsp_url': rtsp_url}]
    return []


def make_detector():
    """Buat dan load satu PPEDetector instance."""
    from detector import PPEDetector
    confidence   = float(os.environ.get('YOLO_CONFIDENCE', '0.40'))
    slice_h      = int(os.environ.get('SAHI_SLICE_HEIGHT', '512'))
    slice_w      = int(os.environ.get('SAHI_SLICE_WIDTH',  '512'))
    overlap      = float(os.environ.get('SAHI_OVERLAP', '0.25'))
    model_path   = os.environ.get('YOLO_MODEL_PATH', 'models/simapd_yolov8m_sh17_DEPLOY.pt')
    use_sahi     = os.environ.get('USE_SAHI', 'true').lower() == 'true'
    det = PPEDetector(model_path, confidence, slice_h, slice_w, overlap, use_sahi)
    det.load()
    return det


def main():
    from redis_publisher import RedisPublisher
    redis_url    = os.environ['REDIS_URL']
    redis_pub    = RedisPublisher(redis_url)
    captures_dir = os.environ.get('CAPTURES_DIR', '/app/captures')
    readers      = []

    # ── MOCK mode ──────────────────────────────────────────────────────────────
    if os.environ.get('MOCK_INFERENCE') == 'true':
        print('[main] MOCK_INFERENCE=true')
        import mock_reader
        mock_reader.run(os.environ.get('CAMERA_ID', 'CAM-01'), redis_pub)
        return

    # ── DEMO mode (video files) ────────────────────────────────────────────────
    if os.environ.get('DEMO_MODE', 'false').lower() == 'true':
        video_dir = os.environ.get('VIDEO_DIR', '/app/videos')
        if not Path(video_dir).exists():
            print(f'[main] ⚠ VIDEO_DIR tidak ada: {video_dir}')
            sys.exit(1)

        detector = make_detector()
        from video_reader import VideoReader
        reader = VideoReader(
            video_dir    = video_dir,
            detector     = detector,
            redis_pub    = redis_pub,
            captures_dir = captures_dir,
            loop         = os.environ.get('DEMO_LOOP', 'true').lower() == 'true',
        )
        reader.start()
        readers.append(reader)
        print(f'[main] DEMO MODE | {video_dir} | loop={reader.loop}')

    # ── LIVE mode (multi-camera RTSP) ──────────────────────────────────────────
    else:
        cameras = parse_cameras()
        if not cameras:
            print('[main] ⚠ Tidak ada kamera dikonfigurasi. Set CAMERAS atau CAMERA_RTSP_URL')
            sys.exit(1)

        from stream_reader import StreamReader

        for cam in cameras:
            # Setiap kamera mendapat detector SENDIRI (ByteTrack state terpisah)
            # Model weights di-load sekali per kamera — gunakan YOLO_MODEL_PATH yang sama
            det = make_detector()
            r   = StreamReader(
                rtsp_url     = cam['rtsp_url'],
                camera_id    = cam['id'],
                detector     = det,
                redis_pub    = redis_pub,
                captures_dir = captures_dir,
            )
            r.start()
            readers.append(r)
            print(f'[main] Started camera: {cam["id"]}')

        print(f'[main] LIVE MODE | {len(cameras)} kamera aktif')

    # ── Shutdown handler ────────────────────────────────────────────────────────
    def shutdown(sig, frame):
        print(f'\n[main] Shutting down {len(readers)} reader(s)...')
        for r in readers:
            r.stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT,  shutdown)

    while True:
        time.sleep(1)


if __name__ == '__main__':
    main()
