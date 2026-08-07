#!/usr/bin/env python3
"""
Run PPE inference (PPEDetector from ai-service) over every image in this folder.

Usage:
    cd test_images
    ../ai-service/venv/bin/python inference.py
    ../ai-service/venv/bin/python inference.py --model ../ai-service/models/simapd_yolov8n_nosahi.pt --conf 0.3
"""
import argparse
import glob
import os
import sys

import cv2

AI_SERVICE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ai-service')
sys.path.insert(0, AI_SERVICE_DIR)

from detector import PPEDetector  # noqa: E402

IMAGE_EXTS = ('*.jpg', '*.jpeg', '*.png', '*.bmp')

BOX_COLOR_OK = (0, 200, 0)
BOX_COLOR_MISSING = (0, 0, 255)


def find_images(folder: str) -> list:
    paths = []
    for ext in IMAGE_EXTS:
        paths.extend(glob.glob(os.path.join(folder, ext)))
        paths.extend(glob.glob(os.path.join(folder, ext.upper())))
    return sorted(set(paths))


def draw_result(frame, result: dict) -> None:
    x1, y1, x2, y2 = result['bbox']
    color = BOX_COLOR_MISSING if not result['is_compliant'] else BOX_COLOR_OK
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    label = f"#{result['track_id']} {result['role_label']} ({result['helm_color']})"
    if result['missing_ppe']:
        label += f" missing:{','.join(result['missing_ppe'])}"

    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
    cv2.putText(frame, label, (x1 + 2, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)


def main() -> None:
    default_model = os.path.join(AI_SERVICE_DIR, 'models', 'simapd_yolov8m_sh17_DEPLOY.pt')

    parser = argparse.ArgumentParser(description='Batch PPE inference over test_images/')
    parser.add_argument('--model', default=default_model, help='Path to YOLO .pt weights')
    parser.add_argument('--conf', type=float, default=0.40, help='Confidence threshold')
    parser.add_argument('--device', default='cpu', help='cpu | cuda | cuda:0')
    parser.add_argument('--sahi', action='store_true', help='Use SAHI sliced prediction')
    parser.add_argument('--output-dir', default='output', help='Where to save annotated images')
    args = parser.parse_args()

    os.environ['INFERENCE_DEVICE'] = args.device

    folder = os.path.dirname(os.path.abspath(__file__))
    image_paths = find_images(folder)
    if not image_paths:
        print(f'Tidak ada gambar ditemukan di {folder}')
        return

    output_dir = os.path.join(folder, args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    print(f'Model : {args.model}')
    print(f'Gambar: {len(image_paths)} ditemukan\n')

    detector = PPEDetector(args.model, confidence=args.conf, use_sahi=args.sahi)
    detector.load()

    for path in image_paths:
        name = os.path.basename(path)
        frame = cv2.imread(path)
        if frame is None:
            print(f'[{name}] gagal dibaca, dilewati')
            continue

        results = detector.process_frame(frame, camera_id=name)
        print(f'[{name}] {len(results)} orang terdeteksi')
        for r in results:
            print(f"  track={r['track_id']} | helm={r['helm_color']} | "
                  f"role={r['role_label']} | missing={r['missing_ppe']} | "
                  f"compliant={r['is_compliant']} | conf={r['confidence']:.2f}")
            draw_result(frame, r)

        out_path = os.path.join(output_dir, name)
        cv2.imwrite(out_path, frame)
        print(f'  -> disimpan: {out_path}\n')


if __name__ == '__main__':
    main()
