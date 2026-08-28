"""
Jalankan PPEDetector terhadap semua gambar di tests/input/, gambar bounding
box + label kepatuhan di atas tiap gambar, lalu simpan hasilnya ke
tests/output/ (gambar teranotasi + ringkasan JSON per gambar).

Usage:
    python run_inference.py
"""
import glob
import json
import os
import sys

import cv2

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from detector import PPEDetector

TESTS_DIR   = os.path.dirname(__file__)
INPUT_DIR   = os.path.join(TESTS_DIR, 'input')
OUTPUT_DIR  = os.path.join(TESTS_DIR, 'output')
MODEL_PATH  = os.path.join(TESTS_DIR, '..', 'models', 'yolo9m.pt')

IMAGE_EXTENSIONS = ('*.jpg', '*.jpeg', '*.png', '*.bmp')

COLOR_COMPLIANT    = (0, 200, 0)   # hijau (BGR)
COLOR_NONCOMPLIANT = (0, 0, 255)   # merah (BGR)


def find_images(directory: str) -> list:
    return sorted({
        path
        for ext in IMAGE_EXTENSIONS
        for path in glob.glob(os.path.join(directory, ext))
    })


def _scale_for(frame) -> float:
    """Skala relatif terhadap resolusi gambar, biar box/teks tetap tebal &
    terbaca di foto beresolusi tinggi (mis. 4608x3072), bukan cuma di 640px."""
    return max(1.0, min(frame.shape[0], frame.shape[1]) / 720)


def draw_detection(frame, det: dict, scale: float):
    x1, y1, x2, y2 = [int(v) for v in det.get('bbox', [0, 0, 0, 0])]
    color = COLOR_COMPLIANT if det.get('is_compliant') else COLOR_NONCOMPLIANT
    box_thickness  = max(3, round(6 * scale))
    font_scale     = 0.9 * scale
    font_thickness = max(2, round(3 * scale))

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, box_thickness)

    missing = ', '.join(det.get('missing_ppe', []))
    label = f"{det.get('role_label', 'Unknown')}" + (f" - missing: {missing}" if missing else '')
    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)
    pad = max(6, round(10 * scale))
    label_y = max(0, y1 - th - pad)
    cv2.rectangle(frame, (x1, label_y), (x1 + tw + pad, label_y + th + pad), color, -1)
    cv2.putText(frame, label, (x1 + pad // 2, label_y + th + pad // 2),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)


def main():
    if not os.path.exists(MODEL_PATH):
        print(f'[run_inference] Model tidak ditemukan: {MODEL_PATH}')
        return

    image_paths = find_images(INPUT_DIR)
    if not image_paths:
        print(f'[run_inference] Tidak ada gambar di {INPUT_DIR}')
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    detector = PPEDetector(model_path=MODEL_PATH)
    detector.load()

    for image_path in image_paths:
        name = os.path.basename(image_path)
        frame = cv2.imread(image_path)
        if frame is None:
            print(f'[run_inference] Gagal membaca {name}, dilewati')
            continue

        results = detector.process_frame(frame, camera_id='inference-batch')

        annotated = frame.copy()
        scale = _scale_for(frame)
        for det in results:
            draw_detection(annotated, det, scale)

        stem = os.path.splitext(name)[0]
        out_image_path = os.path.join(OUTPUT_DIR, f'{stem}.jpg')
        out_json_path  = os.path.join(OUTPUT_DIR, f'{stem}.json')

        cv2.imwrite(out_image_path, annotated)
        with open(out_json_path, 'w') as f:
            json.dump(results, f, indent=2)

        print(f'[run_inference] {name}: {len(results)} orang terdeteksi -> {out_image_path}')


if __name__ == '__main__':
    main()
