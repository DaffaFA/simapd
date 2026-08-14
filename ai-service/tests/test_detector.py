import pytest, numpy as np, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from detector import PPEDetector

@pytest.fixture
def det():
  d = PPEDetector.__new__(PPEDetector)
  d.HELM_CLASSES = {'helmet'}
  d.VEST_CLASSES = {'safety vest'}
  d.SHOE_CLASSES = {'safety boots'}
  d.PPE_IOA_THRESHOLD = 0.6
  d.COMPLIANCE_GRACE_FRAMES = 15
  d._frame_counter = 0
  d._compliance_history = {}
  return d

class TestCheckPpe:
  def test_all_present(self, det):
    r = det._check_ppe({'helm': True, 'vest': True, 'shoes': 1})
    assert r['is_compliant'] == True
    assert r['missing_ppe'] == []

  def test_missing_vest(self, det):
    r = det._check_ppe({'helm': True, 'vest': False, 'shoes': 1})
    assert r['missing_vest'] == True
    assert 'vest' in r['missing_ppe']
    assert r['is_compliant'] == False

  def test_all_missing(self, det):
    r = det._check_ppe({'helm': False, 'vest': False, 'shoes': 0})
    assert r['missing_helm'] == True
    assert r['missing_vest'] == True
    assert r['missing_shoes'] == True
    assert len(r['missing_ppe']) == 3

class TestCalculateIoa:
  def test_fully_contained_is_1(self, det):
    person = [0, 0, 100, 100]
    item   = [10, 10, 30, 30]
    assert det._calculate_ioa(person, item) == pytest.approx(1.0)

  def test_no_overlap_is_0(self, det):
    person = [0, 0, 10, 10]
    item   = [50, 50, 60, 60]
    assert det._calculate_ioa(person, item) == 0.0

  def test_partial_overlap(self, det):
    person = [0, 0, 10, 10]
    item   = [5, 5, 15, 15]   # half of item's area (50) overlaps
    assert det._calculate_ioa(person, item) == pytest.approx(0.25)

class TestAssignPpe:
  def test_assigns_to_person_with_highest_ioa(self, det):
    person_a = [0, 0, 10, 10]
    person_b = [20, 0, 30, 10]
    helmet_for_b = [22, 0, 28, 5]   # mostly overlaps person_b, not person_a

    equipment = det._assign_ppe(
      [person_a, person_b],
      [helmet_for_b],
      ['helmet'],
    )
    assert equipment[0] == {'helm': False, 'vest': False, 'shoes': 0}
    assert equipment[1]['helm'] == True

  def test_below_threshold_not_assigned(self, det):
    person = [0, 0, 10, 10]
    # Only slightly overlaps the person box -> IoA well below 0.6
    helmet = [8, 8, 18, 18]

    equipment = det._assign_ppe([person], [helmet], ['helmet'])
    assert equipment[0]['helm'] == False

  def test_counts_multiple_shoes(self, det):
    person = [0, 0, 10, 10]
    shoe_a = [1, 1, 5, 5]
    shoe_b = [1, 1, 5, 5]

    equipment = det._assign_ppe([person], [shoe_a, shoe_b], ['safety boots', 'safety boots'])
    assert equipment[0]['shoes'] == 2

class TestSmoothCompliance:
  def test_none_track_id_passthrough(self, det):
    assert det._smooth_compliance(None, False) == False
    assert det._smooth_compliance(None, True) == True

  def test_compliant_stays_compliant(self, det):
    det._frame_counter = 1
    assert det._smooth_compliance(1, True) == True

  def test_violation_within_grace_period_overridden(self, det):
    det._frame_counter = 1
    det._smooth_compliance(1, True)   # compliant at frame 1

    det._frame_counter = 5
    assert det._smooth_compliance(1, False) == True   # within grace

  def test_violation_after_grace_period_expires(self, det):
    det._frame_counter = 1
    det._smooth_compliance(1, True)   # compliant at frame 1

    det._frame_counter = 20
    assert det._smooth_compliance(1, False) == False   # grace expired

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
