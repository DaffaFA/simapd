"""
Jalankan model YOLO mentah (tanpa agregasi/assignment PPEDetector) terhadap
semua gambar di tests/input/, dan gambar SEMUA box hasil deteksi apa adanya
untuk tiap kelas (person, helmet, safety-vest, shoes, head, foot, dll).

Berguna untuk mengecek mentah apakah model benar-benar mendeteksi
helm/vest/sepatu di gambar, sebelum box-box itu di-assign ke tiap orang
oleh PPEDetector._assign_ppe(). Hasil disimpan ke tests/output/raw/.

Usage:
    python run_raw_detections.py
"""
import glob
import json
import os
import sys

import cv2

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from detector import PPEDetector

TESTS_DIR  = os.path.dirname(__file__)
INPUT_DIR  = os.path.join(TESTS_DIR, 'input')
OUTPUT_DIR = os.path.join(TESTS_DIR, 'output', 'raw')
MODEL_PATH = os.path.join(TESTS_DIR, '..', 'models', 'yolo9m.pt')

IMAGE_EXTENSIONS = ('*.jpg', '*.jpeg', '*.png', '*.bmp')

# Warna tetap (BGR) untuk kelas yang relevan ke kepatuhan APD;
# kelas lain dapat warna dari palet fallback berdasarkan hash nama.
CLASS_COLORS = {
    'person':      (255, 200, 0),
    'helmet':      (0, 200, 0),
    'safety-vest': (0, 165, 255),
    'shoes':       (255, 0, 255),
    'head':        (0, 255, 255),
    'foot':        (180, 105, 255),
}
FALLBACK_PALETTE = [
    (200, 200, 200), (255, 0, 0), (0, 0, 255), (255, 255, 0),
    (128, 0, 128), (0, 128, 128), (128, 128, 0), (0, 0, 128),
]


def find_images(directory: str) -> list:
    return sorted({
        path
        for ext in IMAGE_EXTENSIONS
        for path in glob.glob(os.path.join(directory, ext))
    })


def color_for(label: str):
    if label in CLASS_COLORS:
        return CLASS_COLORS[label]
    return FALLBACK_PALETTE[hash(label) % len(FALLBACK_PALETTE)]


def _scale_for(frame) -> float:
    """Skala relatif terhadap resolusi gambar, biar box/teks tetap tebal &
    terbaca di foto beresolusi tinggi (mis. 4608x3072), bukan cuma di 640px."""
    return max(1.0, min(frame.shape[0], frame.shape[1]) / 720)


def draw_box(frame, box, label: str, conf: float, scale: float):
    x1, y1, x2, y2 = [int(v) for v in box]
    color = color_for(label)
    box_thickness  = max(3, round(6 * scale))
    font_scale     = 0.9 * scale
    font_thickness = max(2, round(3 * scale))

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, box_thickness)

    text = f'{label} {conf:.2f}'
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)
    pad = max(6, round(10 * scale))
    label_y = max(0, y1 - th - pad)
    cv2.rectangle(frame, (x1, label_y), (x1 + tw + pad, label_y + th + pad), color, -1)
    cv2.putText(frame, text, (x1 + pad // 2, label_y + th + pad // 2),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), font_thickness, cv2.LINE_AA)


def main():
    if not os.path.exists(MODEL_PATH):
        print(f'[run_raw_detections] Model tidak ditemukan: {MODEL_PATH}')
        return

    image_paths = find_images(INPUT_DIR)
    if not image_paths:
        print(f'[run_raw_detections] Tidak ada gambar di {INPUT_DIR}')
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    detector = PPEDetector(model_path=MODEL_PATH)
    detector.load()

    for image_path in image_paths:
        name = os.path.basename(image_path)
        frame = cv2.imread(image_path)
        if frame is None:
            print(f'[run_raw_detections] Gagal membaca {name}, dilewati')
            continue

        # Sama seperti PPEDetector._process_with_track(), tapi hasil box
        # mentahnya diambil semua, bukan cuma yang ter-assign ke orang.
        results = detector.model.track(
            source  = frame,
            persist = True,
            tracker = 'bytetrack.yaml',
            conf    = detector.confidence,
            iou     = 0.5,
            imgsz   = 640,
            verbose = False,
            device  = detector.device,
        )

        annotated = frame.copy()
        raw_detections = []
        scale = _scale_for(frame)

        if results and results[0].boxes is not None:
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                label  = detector.model.names.get(cls_id, f'cls{cls_id}')
                conf   = float(box.conf[0])
                bbox   = [float(v) for v in box.xyxy[0].tolist()]

                draw_box(annotated, bbox, label, conf, scale)
                raw_detections.append({
                    'label':      label,
                    'confidence': conf,
                    'bbox':       [int(v) for v in bbox],
                })

        stem = os.path.splitext(name)[0]
        out_image_path = os.path.join(OUTPUT_DIR, f'{stem}.jpg')
        out_json_path  = os.path.join(OUTPUT_DIR, f'{stem}.json')

        cv2.imwrite(out_image_path, annotated)
        with open(out_json_path, 'w') as f:
            json.dump(raw_detections, f, indent=2)

        by_class = {}
        for d in raw_detections:
            by_class[d['label']] = by_class.get(d['label'], 0) + 1
        print(f'[run_raw_detections] {name}: {len(raw_detections)} box {by_class} -> {out_image_path}')


if __name__ == '__main__':
    main()
