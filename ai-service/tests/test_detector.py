import pytest, numpy as np, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from detector import PPEDetector

@pytest.fixture
def det():
  d = PPEDetector.__new__(PPEDetector)
  d.HELM_CLASSES = {'helmet'}
  d.VEST_CLASSES = {'safety vest'}
  d.SHOE_CLASSES = {'safety boots'}
  return d

class TestCheckPpe:
  def test_all_present(self, det):
    r = det._check_ppe(['helmet','safety vest','safety boots','person'])
    assert r['is_compliant'] == True
    assert r['missing_ppe'] == []

  def test_missing_vest(self, det):
    r = det._check_ppe(['helmet','safety boots'])
    assert r['missing_vest'] == True
    assert 'vest' in r['missing_ppe']
    assert r['is_compliant'] == False

  def test_all_missing(self, det):
    r = det._check_ppe(['person'])
    assert r['missing_helm'] == True
    assert r['missing_vest'] == True
    assert r['missing_shoes'] == True
    assert len(r['missing_ppe']) == 3

  def test_case_insensitive(self, det):
    r = det._check_ppe(['HELMET','Safety Vest','Safety Boots'])
    assert r['is_compliant'] == True

class TestRoleFromColor:
  def test_kuning_is_pekerja(self, det):    assert det._role_from_color('Kuning') == 'Pekerja'
  def test_putih_is_supervisor(self, det):  assert det._role_from_color('Putih')  == 'Supervisor'
  def test_hijau_is_safety(self, det):      assert det._role_from_color('Hijau')  == 'Safety Officer'
  def test_unknown_is_unknown(self, det):   assert det._role_from_color('Unknown') == 'Unknown'

class TestHelmColorClassification:
  def test_yellow_frame_returns_kuning(self, det):
    import cv2
    # BGR yellow: [0, 200, 200] → HSV H≈30 (masuk range Kuning)
    frame = np.full((100, 100, 3), [0, 200, 200], dtype=np.uint8)
    # bbox mencakup seluruh frame
    result = det.classify_helm_color(frame, [0, 0, 100, 100])
    assert result == 'Kuning'

  def test_empty_crop_returns_unknown(self, det):
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    result = det.classify_helm_color(frame, [5, 5, 5, 5])  # zero-size crop
    assert result == 'Unknown'
