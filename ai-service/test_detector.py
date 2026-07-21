import cv2, os, sys
sys.path.insert(0, '.')
os.environ['YOLO_MODEL_PATH'] = 'models/simapd_yolov8n_nosahi.pt'
os.environ['USE_SAHI']        = 'false'
os.environ['INFERENCE_DEVICE'] = 'cpu'

from detector import PPEDetector

det = PPEDetector('models/simapd_yolov8n_nosahi.pt', confidence=0.30, use_sahi=False)
det.load()

print(f"\nPERSON_CLASSES: {det.PERSON_CLASSES}")
print(f"HELM_CLASSES  : {det.HELM_CLASSES}")
print(f"VEST_CLASSES  : {det.VEST_CLASSES}")
print(f"SHOE_CLASSES  : {det.SHOE_CLASSES}")

# Test dengan video demo
video = '../videos/Static_overhead_security_camer.mp4'   # path video kamu
cap   = cv2.VideoCapture(video)
ret, frame = cap.read()
cap.release()

if ret:
    results = det.process_frame(frame, 'TEST')
    print(f"\nDeteksi: {len(results)} orang")
    for r in results:
        print(f"  track={r['track_id']} | helm={r['helm_color']} | "
              f"role={r['role_label']} | missing={r['missing_ppe']} | "
              f"compliant={r['is_compliant']}")
else:
    print("Tidak bisa buka video")
