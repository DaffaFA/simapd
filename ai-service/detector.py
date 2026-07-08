import cv2, numpy as np
from ultralytics import YOLO
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction
import supervision as sv

class PPEDetector:
  HELM_CLASSES = {'helmet', 'hard-hat', 'hard hat'}
  VEST_CLASSES = {'safety vest', 'vest', 'safety-vest'}
  SHOE_CLASSES = {'safety boots', 'boots', 'safety shoes', 'shoe'}

  def __init__(self, model_path, confidence=0.45, slice_h=640, slice_w=640, overlap=0.2):
    self.model_path = model_path
    self.confidence = confidence
    self.slice_h = slice_h; self.slice_w = slice_w; self.overlap = overlap
    self.sahi_model = None; self.tracker = None; self.is_loaded = False

  def load(self):
    import os
    if not os.path.exists(self.model_path):
      raise FileNotFoundError(f'Model tidak ditemukan: {self.model_path}')
    self.sahi_model = AutoDetectionModel.from_pretrained(
      model_type='ultralytics', model_path=self.model_path,
      confidence_threshold=self.confidence,
      device='cuda:0' if self._has_cuda() else 'cpu',
    )
    self.tracker = sv.ByteTrack()
    self.is_loaded = True

  def _has_cuda(self):
    try: import torch; return torch.cuda.is_available()
    except ImportError: return False

  def classify_helm_color(self, frame_bgr, bbox) -> str:
    """
    Crop 1/3 atas dari bbox (area kepala) → konversi HSV → deteksi warna dominan.
    Range HSV:
      Kuning: H=[20,35], S=[100,255], V=[100,255]
      Hijau:  H=[40,80],  S=[50,255],  V=[50,255]
      Putih:  H=[0,180],  S=[0,40],    V=[180,255]
    Return "Kuning"|"Putih"|"Hijau"|"Unknown"
    Threshold minimum 10% dari area crop.
    """
    x1,y1,x2,y2 = [int(c) for c in bbox]
    head_y2 = y1 + (y2-y1)//3
    crop = frame_bgr[max(0,y1):head_y2, max(0,x1):x2]
    if crop.size == 0: return 'Unknown'
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    total = hsv.shape[0] * hsv.shape[1]
    masks = {
      'Kuning': cv2.inRange(hsv, np.array([20,100,100]), np.array([35,255,255])),
      'Hijau':  cv2.inRange(hsv, np.array([40,50,50]),   np.array([80,255,255])),
      'Putih':  cv2.inRange(hsv, np.array([0,0,180]),    np.array([180,40,255])),
    }
    ratios = {c: cv2.countNonZero(m)/total for c,m in masks.items()}
    best = max(ratios, key=ratios.get)
    return best if ratios[best] > 0.10 else 'Unknown'

  def _role_from_color(self, color: str) -> str:
    return {'Kuning':'Pekerja','Putih':'Supervisor','Hijau':'Safety Officer'}.get(color,'Unknown')

  def _check_ppe(self, labels: list) -> dict:
    ls = {l.lower() for l in labels}
    has_helm  = bool(ls & {c.lower() for c in self.HELM_CLASSES})
    has_vest  = bool(ls & {c.lower() for c in self.VEST_CLASSES})
    has_shoes = bool(ls & {c.lower() for c in self.SHOE_CLASSES})
    missing = [not has_helm and 'helm', not has_vest and 'vest', not has_shoes and 'sepatu']
    missing = [m for m in missing if m]
    return {'missing_helm':not has_helm,'missing_vest':not has_vest,'missing_shoes':not has_shoes,
            'missing_ppe':missing,'is_compliant':len(missing)==0}

  def process_frame(self, frame_bgr, camera_id: str) -> list:
    if not self.is_loaded: raise RuntimeError('load() belum dipanggil')
    result = get_sliced_prediction(
      frame_bgr, self.sahi_model,
      slice_height=self.slice_h, slice_width=self.slice_w,
      overlap_height_ratio=self.overlap, overlap_width_ratio=self.overlap,
    )
    if not result.object_prediction_list: return []
    boxes = np.array([[p.bbox.minx,p.bbox.miny,p.bbox.maxx,p.bbox.maxy] for p in result.object_prediction_list])
    confs = np.array([p.score.value for p in result.object_prediction_list])
    labels = [p.category.name for p in result.object_prediction_list]
    detections = sv.Detections(xyxy=boxes, confidence=confs, class_id=np.zeros(len(boxes),int))
    tracked = self.tracker.update_with_detections(detections)
    outputs = []
    for bbox, track_id, conf in zip(tracked.xyxy, tracked.tracker_id, tracked.confidence):
      hc = self.classify_helm_color(frame_bgr, bbox.tolist())
      ppe = self._check_ppe(labels)
      outputs.append({
        'track_id': int(track_id), 'helm_color': hc, 'role_label': self._role_from_color(hc),
        **ppe, 'confidence': float(conf),
        'bbox': [int(x) for x in bbox.tolist()], 'camera_id': camera_id,
      })
    return outputs
