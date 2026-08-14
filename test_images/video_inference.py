#!/usr/bin/env python3
"""
Run PPE inference (PPEDetector from ai-service) over a video file and save
an annotated output video.

Usage:
    cd test_images
    ../ai-service/venv/bin/python video_inference.py VID_20260808_163659.mp4
    ../ai-service/venv/bin/python video_inference.py VID_20260808_163659.mp4 \
        --model ../ai-service/models/yolo9m.pt --conf 0.3
"""
import argparse
import colorsys
import hashlib
import os
import sys
import time

import cv2

AI_SERVICE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ai-service')
sys.path.insert(0, AI_SERVICE_DIR)

from detector import PPEDetector  # noqa: E402

# Frames a track_id can go unseen before its lifecycle is closed & evaluated
EXPIRATION_FRAMES = 60


def calculate_ioa(box1: list, box2: list) -> float:
    """
    Calculates the Intersection over Area (IoA) of box2 contained within box1.
    box format: [x1, y1, x2, y2]
    """
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2

    # Coordinates of the intersection rectangle
    x_left = max(x1_1, x1_2)
    y_top = max(y1_1, y1_2)
    x_right = min(x2_1, x2_2)
    y_bottom = min(y2_1, y2_2)

    # If the bounding boxes do not intersect
    if x_right < x_left or y_bottom < y_top:
        return 0.0

    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    box2_area = (x2_2 - x1_2) * (y2_2 - y1_2)

    if box2_area == 0:
        return 0.0

    return intersection_area / box2_area


def assign_ppe_for_frame(detections: list, ioa_threshold: float = 0.6) -> tuple:
    """
    Groups this frame's PPE items to persons based on the highest IoA score.
    Returns (persons, equipment) where equipment[i] is this frame's PPE
    evidence for persons[i] — {'helmet': bool, 'safety-vest': bool, 'shoes': int}.

    This is per-frame evidence only; it does not decide compliance. Callers
    accumulate it across a track's lifetime via update_active_tracks().
    """
    persons = [d for d in detections if d['label'] == 'person']
    ppe_items = [d for d in detections if d['label'] in ['helmet', 'safety-vest', 'shoes']]

    equipment = [{'helmet': False, 'safety-vest': False, 'shoes': 0} for _ in persons]

    # Assign each PPE item to the person bounding box it overlaps with most
    for ppe in ppe_items:
        best_ioa = 0.0
        best_person_idx = -1

        for i, person in enumerate(persons):
            ioa = calculate_ioa(person['bbox'], ppe['bbox'])
            if ioa > best_ioa:
                best_ioa = ioa
                best_person_idx = i

        # If it passes the overlap threshold, record it to the winning person
        if best_ioa >= ioa_threshold and best_person_idx != -1:
            label = ppe['label']
            if label == 'shoes':
                equipment[best_person_idx][label] += 1
            else:
                equipment[best_person_idx][label] = True

    return persons, equipment


def update_active_tracks(active_tracks: dict, persons: list, equipment: list,
                          frame, frame_idx: int) -> None:
    """
    Track-Lifecycle Aggregation: fold this frame's PPE evidence into each
    visible track (logical OR — once seen, stays seen for the session), and
    keep the frame where the person's bbox was largest as the best evidence
    snapshot (largest bbox ~= closest to camera ~= clearest evidence).
    """
    for person, eq in zip(persons, equipment):
        tid = person.get('track_id')
        if tid is None:
            continue   # can't aggregate a lifecycle without a stable ID

        track = active_tracks.setdefault(tid, {
            'helmet':          False,
            'safety-vest':     False,
            'shoes':           0,
            'last_seen_frame': frame_idx,
            'snapshot_frame':  None,
            'bbox':            None,
            'best_area':       -1.0,
        })

        track['helmet']          = track['helmet'] or eq['helmet']
        track['safety-vest']     = track['safety-vest'] or eq['safety-vest']
        track['shoes']           = max(track['shoes'], eq['shoes'])
        track['last_seen_frame'] = frame_idx

        x1, y1, x2, y2 = person['bbox']
        area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        if area > track['best_area']:
            track['best_area']      = area
            track['snapshot_frame'] = frame.copy()
            track['bbox']           = [int(v) for v in person['bbox']]


def close_track(active_tracks: dict, track_id: int, output_dir: str) -> None:
    """
    Evaluate a track's aggregated PPE status once it's gone. If required
    equipment was missing for the *entire* lifetime of the track, log it
    and save the best-evidence snapshot (full frame, bbox drawn on it) to
    disk. Compliant tracks are simply dropped — no evidence needed.
    """
    track = active_tracks.pop(track_id, None)
    if track is None or track['snapshot_frame'] is None:
        return

    missing = []
    if not track['helmet']:      missing.append('helmet')
    if not track['safety-vest']: missing.append('safety-vest')
    if track['shoes'] == 0:      missing.append('shoes')

    if not missing:
        return

    print(f'[VIOLATION] Track #{track_id} left the frame missing: {", ".join(missing)}')

    evidence = track['snapshot_frame']
    x1, y1, x2, y2 = track['bbox']
    label = f'#{track_id} MISSING: {", ".join(missing)}'

    cv2.rectangle(evidence, (x1, y1), (x2, y2), (0, 0, 255), 2)
    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    cv2.rectangle(evidence, (x1, y1 - th - 10), (x1 + tw + 4, y1), (0, 0, 255), -1)
    cv2.putText(evidence, label, (x1 + 2, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, f'violation_track_{track_id}.jpg')
    cv2.imwrite(out_path, evidence)
    print(f'  -> evidence saved: {out_path}')


def expire_stale_tracks(active_tracks: dict, frame_idx: int, output_dir: str,
                         expiration_frames: int = 60) -> None:
    """Close (evaluate + evict) any track not seen for expiration_frames."""
    stale_ids = [
        tid for tid, t in active_tracks.items()
        if frame_idx - t['last_seen_frame'] > expiration_frames
    ]
    for tid in stale_ids:
        close_track(active_tracks, tid, output_dir)


def get_color_for_label(label: str) -> tuple:
    """Deterministic BGR color per class name, so each object class is
    visually distinct and stable across frames."""
    h = int(hashlib.md5(label.encode()).hexdigest(), 16) % 360
    r, g, b = colorsys.hsv_to_rgb(h / 360.0, 0.85, 0.95)
    return (int(b * 255), int(g * 255), int(r * 255))


def draw_detection(frame, label: str, conf: float, bbox, track_id=None, is_compliant=None) -> None:
    x1, y1, x2, y2 = [int(v) for v in bbox]
    
    # Override colors for 'person' class based on compliance logic
    if label == 'person' and is_compliant is not None:
        color = (0, 255, 0) if is_compliant else (0, 0, 255) # Green if compliant, Red if not
        text = f'COMPLIANT {conf:.2f}' if is_compliant else f'VIOLATION {conf:.2f}'
    else:
        color = get_color_for_label(label)
        text = f'{label} {conf:.2f}'

    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    if track_id is not None:
        text = f'#{track_id} {text}'

    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
    cv2.putText(frame, text, (x1 + 2, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)


def detect_all_objects(detector: PPEDetector, frame) -> list:
    """Raw per-object detections for every class the model knows, bypassing
    PPEDetector's per-person PPE-compliance aggregation."""
    detections = []

    if detector.use_sahi:
        from sahi.predict import get_sliced_prediction

        result = get_sliced_prediction(
            frame, detector.sahi_model,
            slice_height=detector.slice_h, slice_width=detector.slice_w,
            overlap_height_ratio=detector.overlap, overlap_width_ratio=detector.overlap,
        )
        names = (detector.sahi_model.model.names
                 if hasattr(detector.sahi_model, 'model') else {})
        for pred in result.object_prediction_list:
            cls_id = pred.category.id
            label = names.get(cls_id) or names.get(str(cls_id)) or pred.category.name
            bbox = [pred.bbox.minx, pred.bbox.miny, pred.bbox.maxx, pred.bbox.maxy]
            detections.append({'label': label, 'confidence': pred.score.value,
                                'bbox': bbox, 'track_id': None})
    else:
        results = detector.model.track(
            source=frame, persist=True, tracker='bytetrack.yaml',
            conf=detector.confidence, iou=0.5, imgsz=640, verbose=False,
        )
        if results and results[0].boxes is not None:
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                label = detector.model.names.get(cls_id, f'cls{cls_id}')
                bbox = [float(v) for v in box.xyxy[0].tolist()]
                conf = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else None
                detections.append({'label': label, 'confidence': conf,
                                    'bbox': bbox, 'track_id': track_id})

    return detections


def main() -> None:
    folder = os.path.dirname(os.path.abspath(__file__))
    default_model = os.path.join(AI_SERVICE_DIR, 'models', 'yolo9m.pt')

    parser = argparse.ArgumentParser(description='PPE inference over a video file')
    parser.add_argument('video', nargs='?', default='VID_20260808_163659.mp4',
                         help='Video filename (relative to test_images/) or full path')
    parser.add_argument('--model', default=default_model, help='Path to YOLO .pt weights')
    parser.add_argument('--conf', type=float, default=0.40, help='Confidence threshold')
    parser.add_argument('--device', default='cpu', help='cpu | cuda | cuda:0')
    parser.add_argument('--sahi', action='store_true', help='Use SAHI sliced prediction')
    parser.add_argument('--every-n', type=int, default=1,
                         help='Run detection every N frames (frames in between reuse the last drawn boxes)')
    parser.add_argument('--output-dir', default='output', help='Where to save the annotated video')
    parser.add_argument('--show', action='store_true',
                         help='Display the annotated video live in a window while processing')
    parser.add_argument('--no-save', action='store_true',
                         help='Skip writing the annotated video to disk (useful with --show)')
    parser.add_argument('--loop', action='store_true',
                         help='Restart the video from the beginning when it ends (implies --no-save)')
    args = parser.parse_args()
    if args.loop:
        args.no_save = True

    os.environ['INFERENCE_DEVICE'] = args.device

    video_path = args.video if os.path.isabs(args.video) else os.path.join(folder, args.video)
    if not os.path.exists(video_path):
        print(f'Video tidak ditemukan: {video_path}')
        return

    save = not args.no_save
    out_path = None
    writer = None
    output_dir = os.path.join(folder, args.output_dir)   # also used for violation evidence
    if save:
        os.makedirs(output_dir, exist_ok=True)
        out_name = os.path.splitext(os.path.basename(video_path))[0] + '_annotated.mp4'
        out_path = os.path.join(output_dir, out_name)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f'Gagal membuka video: {video_path}')
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_interval = 1.0 / fps

    if save:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))

    window_name = 'PPE Inference (q untuk keluar)'
    if args.show:
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    print(f'Model : {args.model}')
    print(f'Video : {video_path} ({width}x{height} @ {fps:.1f}fps, {total_frames} frames)\n')

    detector = PPEDetector(args.model, confidence=args.conf, use_sahi=args.sahi)
    detector.load()

    frame_idx = 0
    last_detections = []

    # Track-Lifecycle Aggregation state: track_id -> accumulated PPE evidence
    active_tracks = {}

    start_time = time.time()
    interrupted = False

    while True:
        frame_start = time.time()

        ok, frame = cap.read()
        if not ok:
            if args.loop:
                # Every active track has effectively left the frame at EOF —
                # close them out before frame_idx resets, otherwise the
                # backward jump would break expire_stale_tracks' math.
                for tid in list(active_tracks.keys()):
                    close_track(active_tracks, tid, output_dir)
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_idx = 0
                continue
            break

        if frame_idx % args.every_n == 0:
            last_detections = detect_all_objects(detector, frame)

            # Per-frame PPE evidence via IoA (does not decide compliance by itself)
            persons, equipment = assign_ppe_for_frame(last_detections, ioa_threshold=0.6)

            # Fold evidence into each visible track's lifetime aggregate
            update_active_tracks(active_tracks, persons, equipment, frame, frame_idx)

        # Close out any track that's been gone longer than EXPIRATION_FRAMES —
        # this is where violations actually get evaluated, logged and saved
        expire_stale_tracks(active_tracks, frame_idx, output_dir,
                             expiration_frames=EXPIRATION_FRAMES)

        for d in last_detections:
            # Live view only: show each track's cumulative status so far.
            # The authoritative compliance decision happens at track closure.
            live_status = None
            if d['label'] == 'person':
                track = active_tracks.get(d.get('track_id'))
                if track is not None:
                    live_status = track['helmet'] and track['safety-vest'] and track['shoes'] >= 1
            draw_detection(frame, d['label'], d['confidence'], d['bbox'], d['track_id'], live_status)

        if writer is not None:
            writer.write(frame)

        if args.show:
            cv2.imshow(window_name, frame)
            # pace playback to the source fps so it plays back "live"
            # (falls back to as-fast-as-possible once processing < 1 frame/interval)
            remaining = frame_interval - (time.time() - frame_start)
            wait_ms = max(1, int(remaining * 1000))
            if cv2.waitKey(wait_ms) & 0xFF == ord('q'):
                interrupted = True
                break

        if frame_idx % 30 == 0:
            print(f'[frame {frame_idx}/{total_frames}] {len(last_detections)} objek terdeteksi')

        frame_idx += 1

    # Video ended (or playback stopped) — every still-active track has
    # effectively left the frame, so close them all out now.
    for tid in list(active_tracks.keys()):
        close_track(active_tracks, tid, output_dir)

    cap.release()
    if writer is not None:
        writer.release()
    if args.show:
        cv2.destroyAllWindows()

    elapsed = time.time() - start_time
    status = 'Dihentikan (q)' if interrupted else 'Selesai'
    print(f'\n{status}: {frame_idx} frame diproses dalam {elapsed:.1f}s '
          f'({frame_idx / elapsed:.1f} fps rata-rata)')
    if out_path:
        print(f'-> disimpan: {out_path}')


if __name__ == '__main__':
    main()