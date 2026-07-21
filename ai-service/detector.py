import cv2
import numpy as np
import os
from pathlib import Path


class PPEDetector:
    """
    Detektor APD menggunakan YOLOv8/v9 + ByteTrack.

    Mode USE_SAHI=false (default, cocok untuk laptop/demo):
      → model.track(persist=True, tracker="bytetrack.yaml")
      → ByteTrack built-in ultralytics, sama persis dengan working test script
      → Class names selalu benar karena langsung dari model.names

    Mode USE_SAHI=true (untuk server/production):
      → SAHI sliced prediction + supervision ByteTrack
      → Class names diambil dari category.id → model.names (bukan category.name)
      → Lebih akurat untuk objek kecil di kamera port yang dipasang tinggi
    """

    # Role berdasarkan warna helm
    HELM_COLOR_ROLE = {
        'Kuning': 'Pekerja',
        'Putih':  'Supervisor',
        'Hijau':  'Safety Officer',
    }

    # HSV range untuk klasifikasi warna helm
    HELM_HSV = {
        'Kuning': (np.array([20, 100, 100]), np.array([35, 255, 255])),
        'Hijau':  (np.array([40,  50,  50]), np.array([80, 255, 255])),
        'Putih':  (np.array([ 0,   0, 180]), np.array([180, 40, 255])),
    }

    def __init__(
        self,
        model_path:  str,
        confidence:  float = 0.40,
        slice_h:     int   = 512,
        slice_w:     int   = 512,
        overlap:     float = 0.25,
        use_sahi:    bool  = False,   # default False — pakai model.track()
    ):
        self.model_path = model_path
        self.confidence = confidence
        self.slice_h    = slice_h
        self.slice_w    = slice_w
        self.overlap    = overlap
        self.use_sahi   = use_sahi

        self.model      = None   # YOLO model (untuk no-SAHI mode)
        self.sahi_model = None   # SAHI AutoDetectionModel (untuk SAHI mode)
        self.tracker    = None   # supervision ByteTrack (hanya SAHI mode)
        self.is_loaded  = False

        # Class sets — diisi oleh _build_class_sets() setelah model di-load
        self.PERSON_CLASSES = set()
        self.HEAD_CLASSES   = set()
        self.HELM_CLASSES   = set()
        self.VEST_CLASSES   = set()
        self.SHOE_CLASSES   = set()
        self.FOOT_CLASSES   = set()

    # ──────────────────────────────────────────────────────────────────────────
    # SETUP
    # ──────────────────────────────────────────────────────────────────────────

    def _has_cuda(self) -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def _get_device(self) -> str:
        env = os.environ.get('INFERENCE_DEVICE', '').strip().lower()
        if env in ('cpu', 'cuda', 'cuda:0'):
            return env
        return 'cuda:0' if self._has_cuda() else 'cpu'

    def _build_class_sets(self, model_names: dict) -> None:
        """
        Bangun class sets dari nama kelas aktual model menggunakan substring match.
        Tidak sensitif terhadap casing atau format nama kelas.
        """
        all_names = set(model_names.values())
        print(f'[PPEDetector] Kelas model: {sorted(all_names)}')

        patterns = {
            'PERSON_CLASSES': ['person', 'worker', 'human'],
            'HEAD_CLASSES':   ['head'],
            'HELM_CLASSES':   ['helmet', 'hard hat', 'hardhat', 'hard-hat'],
            'VEST_CLASSES':   ['safety-vest', 'safety vest', 'vest', 'hi-vis'],
            'SHOE_CLASSES':   ['shoes', 'boots', 'safety boots', 'safety-boots',
                               'safety shoes', 'footwear'],
            'FOOT_CLASSES':   ['foot', 'feet'],
        }

        for attr, keywords in patterns.items():
            matched = {n for n in all_names
                       if any(kw in n.lower() for kw in keywords)}
            setattr(self, attr, matched)
            status = str(matched) if matched else '⚠ TIDAK ADA MATCH'
            print(f'  {attr:20s}: {status}')

        if not self.PERSON_CLASSES:
            print('[PPEDetector] ⚠ PERSON_CLASSES kosong! '
                  'Tracking tidak akan berjalan. '
                  f'Kelas tersedia: {sorted(all_names)}')

    def load(self) -> None:
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f'Model tidak ditemukan: {self.model_path}')

        import torch
        torch.backends.cudnn.benchmark     = False
        torch.backends.cudnn.deterministic = True

        device = self._get_device()
        print(f'[PPEDetector] Device: {device} | SAHI: {self.use_sahi}')

        if self.use_sahi:
            self._load_sahi(device)
        else:
            self._load_direct(device)

        self.is_loaded = True
        mode = f'SAHI ({self.slice_h}x{self.slice_w})' if self.use_sahi else 'model.track()'
        print(f'[PPEDetector] Ready: {Path(self.model_path).name} | mode={mode}')

    def _load_direct(self, device: str) -> None:
        """Load model untuk mode no-SAHI (model.track())."""
        from ultralytics import YOLO
        self.model = YOLO(self.model_path)
        self.model.to(device)
        self._build_class_sets(self.model.names)
        print(f'[PPEDetector] Loaded via YOLO.track() — '
              f'{len(self.model.names)} kelas')

    def _load_sahi(self, device: str) -> None:
        """Load model untuk mode SAHI + supervision ByteTrack."""
        from sahi import AutoDetectionModel
        import supervision as sv

        self.sahi_model = AutoDetectionModel.from_pretrained(
            model_type           = 'ultralytics',
            model_path           = self.model_path,
            confidence_threshold = self.confidence,
            device               = device,
        )

        # Ambil class names dari model yang di-wrap SAHI
        sahi_names = {}
        if hasattr(self.sahi_model, 'model') and hasattr(self.sahi_model.model, 'names'):
            sahi_names = self.sahi_model.model.names
        elif hasattr(self.sahi_model, 'category_mapping'):
            sahi_names = self.sahi_model.category_mapping
        self._build_class_sets(sahi_names)

        self.tracker = sv.ByteTrack(
            track_activation_threshold = 0.35,
            lost_track_buffer          = 50,
            minimum_matching_threshold = 0.75,
            frame_rate                 = 10,
            minimum_consecutive_frames = 2,
        )
        print(f'[PPEDetector] Loaded via SAHI — {len(sahi_names)} kelas')

    # ──────────────────────────────────────────────────────────────────────────
    # INFERENCE — PUBLIC API
    # ──────────────────────────────────────────────────────────────────────────

    def process_frame(self, frame_bgr, camera_id: str) -> list:
        if not self.is_loaded:
            raise RuntimeError('Panggil load() sebelum process_frame()')

        if self.use_sahi:
            return self._process_with_sahi(frame_bgr, camera_id)
        else:
            return self._process_with_track(frame_bgr, camera_id)

    # ──────────────────────────────────────────────────────────────────────────
    # MODE 1: model.track() — sama persis dengan working test script
    # ──────────────────────────────────────────────────────────────────────────

    def _process_with_track(self, frame_bgr, camera_id: str) -> list:
        """
        Gunakan model.track(persist=True) seperti working script:
            results = model.track(frame, persist=True, tracker="bytetrack.yaml")

        persist=True = ByteTrack state disimpan di dalam model object.
        Setiap PPEDetector instance (per kamera) punya state sendiri.
        Class names selalu benar karena langsung dari model.names.
        """
        results = self.model.track(
            source         = frame_bgr,
            persist        = True,          # pertahankan ByteTrack state antar frame
            tracker        = 'bytetrack.yaml',
            conf           = self.confidence,
            iou            = 0.5,
            imgsz          = 640,
            verbose        = False,
        )

        if not results or results[0].boxes is None:
            return []

        r = results[0]   # single frame → satu result

        # ── Kumpulkan semua deteksi ──────────────────────────────────────────
        all_boxes  : list = []
        all_labels : list = []
        person_info: list = []   # (bbox, track_id, conf) per person

        for box in r.boxes:
            cls_id   = int(box.cls[0])
            label    = self.model.names.get(cls_id, f'cls{cls_id}')
            x1,y1,x2,y2 = [float(v) for v in box.xyxy[0].tolist()]
            conf     = float(box.conf[0])

            all_boxes.append([x1, y1, x2, y2])
            all_labels.append(label)

            if label in self.PERSON_CLASSES and box.id is not None:
                track_id = int(box.id[0])
                person_info.append(([x1, y1, x2, y2], track_id, conf))

        # ── Per-person: PPE lookup + helm color ──────────────────────────────
        outputs = []
        for bbox, track_id, conf in person_info:
            person_labels = self._get_labels_for_person(bbox, all_boxes, all_labels)
            helm_color    = self.classify_helm_color(frame_bgr, bbox)
            ppe           = self._check_ppe(person_labels)

            outputs.append({
                'track_id':   track_id,
                'helm_color': helm_color,
                'role_label': self.HELM_COLOR_ROLE.get(helm_color, 'Unknown'),
                **ppe,
                'confidence': conf,
                'bbox':       [int(v) for v in bbox],
                'camera_id':  camera_id,
            })

        return outputs

    # ──────────────────────────────────────────────────────────────────────────
    # MODE 2: SAHI + supervision ByteTrack
    # ──────────────────────────────────────────────────────────────────────────

    def _process_with_sahi(self, frame_bgr, camera_id: str) -> list:
        """
        SAHI sliced prediction untuk small-object detection.
        Class names diambil dari category.id → model.names (bukan category.name).
        """
        from sahi.predict import get_sliced_prediction
        import supervision as sv

        result = get_sliced_prediction(
            frame_bgr,
            self.sahi_model,
            slice_height         = self.slice_h,
            slice_width          = self.slice_w,
            overlap_height_ratio = self.overlap,
            overlap_width_ratio  = self.overlap,
        )

        if not result.object_prediction_list:
            return []

        # ── Ambil nama kelas via category.id (lebih reliable dari category.name)
        sahi_names = (self.sahi_model.model.names
                      if hasattr(self.sahi_model, 'model') else {})

        all_boxes   : list = []
        all_confs   : list = []
        all_labels  : list = []
        person_boxes: list = []
        person_confs: list = []

        for pred in result.object_prediction_list:
            # Prioritas: id→names, fallback ke category.name
            cls_id = pred.category.id
            label  = (sahi_names.get(cls_id)
                      or sahi_names.get(str(cls_id))
                      or pred.category.name)

            box  = [pred.bbox.minx, pred.bbox.miny, pred.bbox.maxx, pred.bbox.maxy]
            conf = pred.score.value

            all_boxes.append(box)
            all_confs.append(conf)
            all_labels.append(label)

            if label in self.PERSON_CLASSES:
                person_boxes.append(box)
                person_confs.append(conf)

        if not person_boxes:
            return []

        # ── ByteTrack via supervision ────────────────────────────────────────
        dets = sv.Detections(
            xyxy       = np.array(person_boxes, dtype=np.float32),
            confidence = np.array(person_confs, dtype=np.float32),
            class_id   = np.zeros(len(person_boxes), dtype=int),
        )
        tracked = self.tracker.update_with_detections(dets)

        if tracked.tracker_id is None or len(tracked.tracker_id) == 0:
            return []

        # ── Per-person: PPE + helm color ─────────────────────────────────────
        head_boxes = [b for b, l in zip(all_boxes, all_labels)
                      if l in self.HEAD_CLASSES]
        outputs = []
        for bbox, track_id, conf in zip(
            tracked.xyxy, tracked.tracker_id, tracked.confidence
        ):
            bl = bbox.tolist()
            px1, py1, px2, py2 = bl
            local_heads = [h for h in head_boxes
                           if px1 <= (h[0]+h[2])/2 <= px2
                           and py1 <= (h[1]+h[3])/2 <= py2]
            person_labels = self._get_labels_for_person(bl, all_boxes, all_labels)
            helm_color    = self.classify_helm_color(frame_bgr, bl,
                                                     local_heads or None)
            ppe           = self._check_ppe(person_labels)

            outputs.append({
                'track_id':   int(track_id),
                'helm_color': helm_color,
                'role_label': self.HELM_COLOR_ROLE.get(helm_color, 'Unknown'),
                **ppe,
                'confidence': float(conf),
                'bbox':       [int(v) for v in bl],
                'camera_id':  camera_id,
            })

        return outputs

    # ──────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ──────────────────────────────────────────────────────────────────────────

    def _get_labels_for_person(
        self,
        person_bbox: list,
        all_boxes:   list,
        all_labels:  list,
    ) -> list:
        """Cari PPE labels yang berada di dalam area bounding box orang."""
        px1, py1, px2, py2 = person_bbox
        margin_x = (px2 - px1) * 0.20   # 20% margin horizontal

        return [
            label
            for box, label in zip(all_boxes, all_labels)
            if label not in self.PERSON_CLASSES
            and (px1 - margin_x) <= (box[0]+box[2])/2 <= (px2 + margin_x)
            and py1 <= (box[1]+box[3])/2 <= py2
        ]

    def _check_ppe(self, labels: list) -> dict:
        """Cek kepatuhan APD dari list label yang ada di area orang."""
        ls = {l.lower() for l in labels}

        has_helm  = bool(ls & {c.lower() for c in self.HELM_CLASSES})
        has_vest  = bool(ls & {c.lower() for c in self.VEST_CLASSES})
        has_shoes = bool(ls & {c.lower() for c in self.SHOE_CLASSES})

        missing = []
        if not has_helm:  missing.append('helm')
        if not has_vest:  missing.append('vest')
        if not has_shoes: missing.append('sepatu')

        return {
            'missing_helm':  not has_helm,
            'missing_vest':  not has_vest,
            'missing_shoes': not has_shoes,
            'missing_ppe':   missing,
            'is_compliant':  len(missing) == 0,
        }

    def classify_helm_color(
        self,
        frame_bgr: np.ndarray,
        person_bbox: list,
        head_boxes: list = None,
    ) -> str:
        """
        Klasifikasi warna helm dari area kepala.
        Prioritas: head_boxes (jika ada) → 1/4 atas person_bbox.
        """
        crop = None

        if head_boxes:
            px1, py1, px2, py2 = [int(v) for v in person_bbox]
            for hb in head_boxes:
                hx1, hy1, hx2, hy2 = [int(v) for v in hb]
                candidate = frame_bgr[max(0,hy1):hy2, max(0,hx1):hx2]
                if candidate.size > 0:
                    crop = candidate
                    break

        if crop is None:
            x1, y1, x2, y2 = [int(v) for v in person_bbox]
            head_y2 = y1 + (y2 - y1) // 4
            crop = frame_bgr[max(0,y1):max(0,head_y2), max(0,x1):max(0,x2)]

        if crop is None or crop.size == 0:
            return 'Unknown'

        hsv   = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        total = hsv.shape[0] * hsv.shape[1]
        if total == 0:
            return 'Unknown'

        ratios = {
            color: cv2.countNonZero(cv2.inRange(hsv, lo, hi)) / total
            for color, (lo, hi) in self.HELM_HSV.items()
        }
        best = max(ratios, key=ratios.get)
        return best if ratios[best] > 0.10 else 'Unknown'

    def _role_from_color(self, color: str) -> str:
        return self.HELM_COLOR_ROLE.get(color, 'Unknown')
