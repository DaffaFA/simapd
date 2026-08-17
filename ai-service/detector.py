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
        'Kuning': (np.array([20, 100,  80]), np.array([35, 255, 255])),
        'Hijau':  (np.array([37,  40,  20]), np.array([100, 255, 255])),
        'Putih':  (np.array([ 0,   0, 170]), np.array([180,  40, 255])),
    }

    # Pixel V di atas ini biasanya specular highlight (pantulan cahaya di
    # permukaan helm yang glossy), bukan warna material helm itu sendiri.
    # Kalau ikut dihitung, glare pada helm kuning/hijau bisa ke-baca sebagai
    # "Putih" karena sama-sama low-saturation/high-value. Dibuang dari voting.
    HELM_SPECULAR_V_MAX = 250

    # IoA minimum agar item APD dianggap milik seorang pekerja
    PPE_IOA_THRESHOLD = 0.6
    # Jumlah frame toleransi sebelum pelanggaran benar-benar ditandai
    # (mencegah flicker akibat oklusi singkat, mis. tangan menutupi vest)
    COMPLIANCE_GRACE_FRAMES = 15

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
        self.device     = None   # str | torch.device — device model dijalankan

        # State untuk temporal smoothing kepatuhan (per track_id, persist antar frame)
        self._frame_counter      = 0
        self._compliance_history = {}   # track_id -> last_compliant_frame_idx

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

    def _has_directml(self) -> bool:
        try:
            import torch_directml
            return torch_directml.is_available()
        except ImportError:
            return False

    @staticmethod
    def _is_directml(device) -> bool:
        import torch
        return isinstance(device, torch.device) and device.type == 'privateuseone'

    _directml_patched = False   # process-wide, applied once

    @classmethod
    def _patch_directml_compat(cls) -> None:
        """
        torch-directml's PrivateUse1 backend has op-coverage gaps that
        ultralytics' CUDA/CPU-oriented code paths trip over:

        1. ultralytics decorates its inference entry points with
           torch.inference_mode() (via smart_inference_mode(), bound at
           import time). DirectML's BatchNorm kernel can't update the
           running-stat buffers' version_counter on tensors created inside
           inference_mode ("Cannot set version_counter for inference
           tensor"). Swapping torch.inference_mode -> torch.no_grad before
           ultralytics is first imported avoids that tensor category
           entirely. This must run before any `import ultralytics...`.
        2. Boolean mask indexing (`tensor[mask]`), used by
           non_max_suppression(), isn't implemented for DirectML and
           surfaces as a raw HRESULT ("Unknown error -2147024809"). Run NMS
           on a CPU copy of the raw predictions instead — cheap relative to
           the conv backbone that actually benefits from the GPU.
        """
        if cls._directml_patched:
            return

        import torch
        torch.inference_mode = torch.no_grad

        import ultralytics.utils.ops as ops
        orig_nms = ops.non_max_suppression

        def _to_cpu(x):
            if isinstance(x, torch.Tensor):
                return x.cpu()
            if isinstance(x, (list, tuple)):
                return type(x)(_to_cpu(v) for v in x)
            return x

        def _dml_safe_nms(prediction, *args, **kwargs):
            return orig_nms(_to_cpu(prediction), *args, **kwargs)

        ops.non_max_suppression = _dml_safe_nms
        cls._directml_patched = True

    def _get_device(self):
        """Resolve the device to run on. Returns a str for cpu/cuda (which
        Ultralytics' select_device() parses itself) or a torch.device object
        for DirectML (select_device() passes torch.device instances through
        untouched, so this is the only form DirectML can be requested in)."""
        env = os.environ.get('INFERENCE_DEVICE', '').strip().lower()

        if env in ('dml', 'directml'):
            if self._has_directml():
                import torch_directml
                return torch_directml.device()
            print('[PPEDetector] DirectML diminta tapi tidak tersedia, fallback ke CPU')
            return 'cpu'

        if env in ('cpu', 'cuda', 'cuda:0'):
            return env

        if self._has_cuda():
            return 'cuda:0'
        if self._has_directml():
            import torch_directml
            return torch_directml.device()
        return 'cpu'

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

        device = self._get_device()
        if self._is_directml(device):
            # Must run before ultralytics is imported anywhere else in the
            # process — see _patch_directml_compat() for why.
            self._patch_directml_compat()

        import torch
        torch.backends.cudnn.benchmark     = False
        torch.backends.cudnn.deterministic = True

        print(f'[PPEDetector] Device: {device} | SAHI: {self.use_sahi}')

        if self.use_sahi:
            self._load_sahi(device)
        else:
            self._load_direct(device)

        self.is_loaded = True
        mode = f'SAHI ({self.slice_h}x{self.slice_w})' if self.use_sahi else 'model.track()'
        print(f'[PPEDetector] Ready: {Path(self.model_path).name} | mode={mode}')

    def _load_direct(self, device) -> None:
        """Load model untuk mode no-SAHI (model.track())."""
        from ultralytics import YOLO
        self.model = YOLO(self.model_path)
        self.model.to(device)
        self.device = device

        if self._is_directml(device):
            # Ultralytics' RepConv.fuse_convs() rebuilds the fused layer as a
            # plain nn.Conv2d() without moving it to the source kernel's
            # device, so on DirectML `self.conv.weight.data = kernel` crashes
            # with a device-mismatch error. Skip fusion on this backend —
            # same numerics, just leaves BatchNorm unmerged.
            self.model.model.fuse = lambda verbose=True: self.model.model
            # AutoBackend warms up under torch.inference_mode() before it
            # ever calls .eval(), so BatchNorm still runs in training mode
            # (in-place running-stat updates). DirectML's PrivateUse1 backend
            # can't version-track that in-place buffer write inside
            # inference_mode ("Cannot set version_counter for inference
            # tensor"). Eval mode here avoids the in-place update entirely.
            self.model.model.eval()

        self._build_class_sets(self.model.names)
        print(f'[PPEDetector] Loaded via YOLO.track() — '
              f'{len(self.model.names)} kelas')

    def _load_sahi(self, device) -> None:
        """Load model untuk mode SAHI + supervision ByteTrack."""
        from sahi import AutoDetectionModel
        import supervision as sv

        self.device = device
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

        self._frame_counter += 1

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
            device         = self.device,   # setiap call re-resolve device sendiri,
                                             # jadi harus dikirim ulang di sini
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

        # ── Assign APD ke orang via IoA, lalu evaluasi kepatuhan ──────────────
        person_boxes = [bbox for bbox, _, _ in person_info]
        equipment    = self._assign_ppe(person_boxes, all_boxes, all_labels)

        # ── Per-person: PPE lookup + helm color ──────────────────────────────
        outputs = []
        for (bbox, track_id, conf), eq in zip(person_info, equipment):
            helm_color = self.classify_helm_color(frame_bgr, bbox, helmet_box=eq['helm_box'])
            ppe        = self._check_ppe(eq)
            ppe['is_compliant'] = self._smooth_compliance(track_id, ppe['is_compliant'])

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

        # ── Assign APD ke orang (post-tracking) via IoA ───────────────────────
        tracked_boxes = [bbox.tolist() for bbox in tracked.xyxy]
        equipment     = self._assign_ppe(tracked_boxes, all_boxes, all_labels)

        # ── Per-person: PPE + helm color ─────────────────────────────────────
        head_boxes = [b for b, l in zip(all_boxes, all_labels)
                      if l in self.HEAD_CLASSES]
        outputs = []
        for bl, track_id, conf, eq in zip(
            tracked_boxes, tracked.tracker_id, tracked.confidence, equipment
        ):
            px1, py1, px2, py2 = bl
            local_heads = [h for h in head_boxes
                           if px1 <= (h[0]+h[2])/2 <= px2
                           and py1 <= (h[1]+h[3])/2 <= py2]
            helm_color = self.classify_helm_color(frame_bgr, bl,
                                                   local_heads or None,
                                                   helmet_box=eq['helm_box'])
            ppe        = self._check_ppe(eq)
            ppe['is_compliant'] = self._smooth_compliance(int(track_id), ppe['is_compliant'])

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

    @staticmethod
    def _calculate_ioa(person_box: list, item_box: list) -> float:
        """
        Intersection over Area (IoA) dari item_box yang tercakup di dalam
        person_box. box format: [x1, y1, x2, y2].
        """
        px1, py1, px2, py2 = person_box
        ix1, iy1, ix2, iy2 = item_box

        x_left, y_top     = max(px1, ix1), max(py1, iy1)
        x_right, y_bottom = min(px2, ix2), min(py2, iy2)
        if x_right < x_left or y_bottom < y_top:
            return 0.0

        intersection = (x_right - x_left) * (y_bottom - y_top)
        item_area     = (ix2 - ix1) * (iy2 - iy1)
        if item_area == 0:
            return 0.0

        return intersection / item_area

    def _assign_ppe(
        self,
        person_boxes: list,
        all_boxes:    list,
        all_labels:   list,
    ) -> list:
        """
        Tetapkan tiap item APD (helm/vest/shoes) ke orang dengan IoA
        tertinggi (>= PPE_IOA_THRESHOLD). Mengembalikan satu dict per orang:
        {'helm': bool, 'vest': bool, 'shoes': int, 'helm_box': list|None}.
        helm_box adalah bbox helm asli (bukan perkiraan) — dipakai
        classify_helm_color() supaya crop warna presisi ke helm itu sendiri,
        bukan seperempat-atas bounding box orang.
        """
        equipment = [{'helm': False, 'vest': False, 'shoes': 0, 'helm_box': None}
                     for _ in person_boxes]
        if not person_boxes:
            return equipment

        helm_classes = {c.lower() for c in self.HELM_CLASSES}
        vest_classes = {c.lower() for c in self.VEST_CLASSES}
        shoe_classes = {c.lower() for c in self.SHOE_CLASSES}
        helm_best_ioa = [0.0] * len(person_boxes)

        for box, label in zip(all_boxes, all_labels):
            ll = label.lower()
            if ll in helm_classes:
                key = 'helm'
            elif ll in vest_classes:
                key = 'vest'
            elif ll in shoe_classes:
                key = 'shoes'
            else:
                continue

            best_ioa, best_idx = 0.0, -1
            for i, person_box in enumerate(person_boxes):
                ioa = self._calculate_ioa(person_box, box)
                if ioa > best_ioa:
                    best_ioa, best_idx = ioa, i

            if best_idx != -1 and best_ioa >= self.PPE_IOA_THRESHOLD:
                if key == 'shoes':
                    equipment[best_idx]['shoes'] += 1
                elif key == 'helm':
                    equipment[best_idx]['helm'] = True
                    # Simpan box IoA tertinggi kalau ada >1 kandidat helm.
                    if best_ioa > helm_best_ioa[best_idx]:
                        helm_best_ioa[best_idx] = best_ioa
                        equipment[best_idx]['helm_box'] = box
                else:
                    equipment[best_idx][key] = True

        return equipment

    def _check_ppe(self, equipment: dict) -> dict:
        """Cek kepatuhan APD dari hasil assignment {'helm','vest','shoes'}."""
        has_helm  = equipment['helm']
        has_vest  = equipment['vest']
        has_shoes = equipment['shoes'] >= 1

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

    def _smooth_compliance(self, track_id, is_compliant: bool) -> bool:
        """
        Temporal smoothing: pekerja hanya ditandai VIOLATION jika sudah
        non-compliant lebih lama dari COMPLIANCE_GRACE_FRAMES sejak terakhir
        kali terlihat compliant (mencegah flicker akibat oklusi singkat).
        """
        if track_id is None:
            return is_compliant

        frame_idx = self._frame_counter
        if track_id not in self._compliance_history:
            self._compliance_history[track_id] = (
                frame_idx if is_compliant else -self.COMPLIANCE_GRACE_FRAMES
            )

        if is_compliant:
            self._compliance_history[track_id] = frame_idx
            return True

        frames_missing = frame_idx - self._compliance_history[track_id]
        return frames_missing <= self.COMPLIANCE_GRACE_FRAMES

    def classify_helm_color(
        self,
        frame_bgr: np.ndarray,
        person_bbox: list,
        head_boxes: list = None,
        helmet_box: list = None,
    ) -> str:
        """
        Klasifikasi warna helm dari area kepala.
        Prioritas: helmet_box (bbox helm hasil deteksi model, paling presisi)
        → head_boxes (bbox kelas 'head', SAHI only) → 1/4 atas person_bbox
        (perkiraan kasar, dipakai kalau helm tidak terdeteksi sama sekali).
        """
        crop = None

        if helmet_box is not None:
            hx1, hy1, hx2, hy2 = [int(v) for v in helmet_box]
            candidate = frame_bgr[max(0,hy1):hy2, max(0,hx1):hx2]
            if candidate.size > 0:
                crop = candidate

        if crop is None and head_boxes:
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

        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)

        # Buang pixel blown-out (glare) dari perhitungan — total dan tiap
        # ratio warna dihitung hanya atas pixel non-specular.
        non_specular = cv2.inRange(
            hsv, (0, 0, 0), (180, 255, self.HELM_SPECULAR_V_MAX))
        total = cv2.countNonZero(non_specular)
        if total == 0:
            return 'Unknown'

        ratios = {
            color: cv2.countNonZero(
                cv2.bitwise_and(cv2.inRange(hsv, lo, hi), non_specular)) / total
            for color, (lo, hi) in self.HELM_HSV.items()
        }
        best = max(ratios, key=ratios.get)
        return best if ratios[best] > 0.10 else 'Unknown'

    def _role_from_color(self, color: str) -> str:
        return self.HELM_COLOR_ROLE.get(color, 'Unknown')
