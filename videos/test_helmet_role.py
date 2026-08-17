#!/usr/bin/env python3
"""
Test helmet-color -> role extraction against skripsi_prod.mp4 using the
EXACT same detector code as ai-service (imports ai-service/detector.py
unmodified, no reimplementation), configured with the same defaults as
docker-compose.yml's ai-service service.

Requires ai-service's deps installed (pip install -r ../ai-service/requirements.txt).

Draws each detection (bbox, track id, helm color, role, compliance) onto the
frame and writes an annotated .mp4 alongside the source video. Not a live
preview window: opencv-python-headless (same as ai-service/requirements.txt)
has no GUI backend, so cv2.imshow() just errors out on WSL. Writing to a file
works regardless of the display stack -- open it from Windows via
\\wsl$\... or `explorer.exe .` from this folder.

Usage:
    python test_helmet_role.py [--max-frames N] [--every-n N] [--confidence F] [--device cpu|cuda|dml] [--output PATH]
"""
import argparse
import os
import sys
from collections import Counter
from pathlib import Path

import cv2

SCRIPT_DIR     = Path(__file__).resolve().parent
AI_SERVICE_DIR = SCRIPT_DIR.parent / 'ai-service'
VIDEO_PATH     = SCRIPT_DIR / 'skripsi_prod.mp4'

# Production defaults, from docker-compose.yml's ai-service service.
DEFAULT_MODEL_PATH  = AI_SERVICE_DIR / 'models' / 'yolo9m.pt'
DEFAULT_USE_SAHI    = False
DEFAULT_CONFIDENCE  = 0.40
DEFAULT_EVERY_N     = 3   # matches video_reader.py's PROCESS_EVERY_N default
DEFAULT_OUTPUT_PATH = SCRIPT_DIR / 'test_helmet_role_out.mp4'

ROLE_COLORS = {   # BGR
    'Pekerja':        (0, 220, 220),
    'Supervisor':     (255, 255, 255),
    'Safety Officer': (0, 200, 0),
    'Unknown':        (128, 128, 128),
}


def draw_detections(frame, results):
    for r in results:
        x1, y1, x2, y2 = r['bbox']
        color  = ROLE_COLORS.get(r['role_label'], (0, 0, 255))
        status = 'OK' if r['is_compliant'] else 'VIOLATION'
        label  = f"#{r['track_id']} {r['role_label']} ({r['helm_color']}) {status}"

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(frame, (x1, max(0, y1 - th - 6)), (x1 + tw + 4, y1), color, -1)
        cv2.putText(frame, label, (x1 + 2, max(12, y1 - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
    return frame


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--max-frames', type=int, default=300,
                    help='stop after processing this many frames (0 = whole video)')
    p.add_argument('--every-n', type=int, default=DEFAULT_EVERY_N,
                    help='only run inference every Nth frame, like VideoReader')
    p.add_argument('--confidence', type=float, default=DEFAULT_CONFIDENCE)
    p.add_argument('--device', default=os.environ.get('INFERENCE_DEVICE', 'cpu'),
                    help='cpu | cuda | cuda:0 | dml')
    p.add_argument('--output', default=str(DEFAULT_OUTPUT_PATH),
                    help='path to write the annotated video to')
    p.add_argument('--no-output', action='store_true',
                    help="don't write the annotated video, just print to console")
    return p.parse_args()


def main():
    args = parse_args()

    if not VIDEO_PATH.exists():
        sys.exit(f'video not found: {VIDEO_PATH}')
    if not DEFAULT_MODEL_PATH.exists():
        sys.exit(f'model not found: {DEFAULT_MODEL_PATH}')

    sys.path.insert(0, str(AI_SERVICE_DIR))
    os.environ['INFERENCE_DEVICE'] = args.device

    from detector import PPEDetector

    det = PPEDetector(
        model_path  = str(DEFAULT_MODEL_PATH),
        confidence  = args.confidence,
        use_sahi    = DEFAULT_USE_SAHI,
    )
    det.load()

    cap = cv2.VideoCapture(str(VIDEO_PATH))
    if not cap.isOpened():
        sys.exit(f'could not open video: {VIDEO_PATH}')

    fps_src  = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width    = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f'[test] video={VIDEO_PATH.name} fps={fps_src:.0f} total_frames={n_frames}')
    print(f'[test] every_n={args.every_n} max_frames={args.max_frames or "all"} '
          f'confidence={args.confidence} device={args.device}\n')

    writer = None
    if not args.no_output:
        writer = cv2.VideoWriter(
            args.output, cv2.VideoWriter_fourcc(*'mp4v'),
            fps_src / args.every_n, (width, height))
        print(f'[test] writing annotated frames -> {args.output}\n')

    color_counts = Counter()
    role_counts  = Counter()
    frame_count  = 0
    processed    = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print('\n[test] end of video')
            break

        frame_count += 1
        if frame_count % args.every_n != 0:
            continue

        results = det.process_frame(frame, 'TEST')
        processed += 1

        for r in results:
            color_counts[r['helm_color']] += 1
            role_counts[r['role_label']] += 1
            print(f"  frame={frame_count:6d} track={r['track_id']:3d} | "
                  f"helm={r['helm_color']:8s} role={r['role_label']:14s} | "
                  f"missing={r['missing_ppe']} compliant={r['is_compliant']}")

        if writer is not None:
            writer.write(draw_detections(frame, results))

        if args.max_frames and processed >= args.max_frames:
            print(f'\n[test] reached --max-frames={args.max_frames}, stopping')
            break

    cap.release()
    if writer is not None:
        writer.release()

    print(f'\n[test] processed {processed} frame(s) '
          f'({frame_count} read, every_n={args.every_n})')
    print(f'[test] helm_color counts: {dict(color_counts)}')
    print(f'[test] role_label counts: {dict(role_counts)}')
    if writer is not None:
        print(f'[test] annotated video written to {args.output}')


if __name__ == '__main__':
    main()
