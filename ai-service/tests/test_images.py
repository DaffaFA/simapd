"""
Integration smoke test: runs PPEDetector.process_frame() against every
real image found in this directory using the actual yolo9m.pt model.
"""
import glob
import os
import sys

import cv2
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from detector import PPEDetector

TESTS_DIR  = os.path.dirname(__file__)
MODEL_PATH = os.path.join(TESTS_DIR, '..', 'models', 'yolo9m.pt')

IMAGE_EXTENSIONS = ('*.jpg', '*.jpeg', '*.png', '*.bmp')

IMAGE_PATHS = sorted({
    path
    for ext in IMAGE_EXTENSIONS
    for path in glob.glob(os.path.join(TESTS_DIR, ext))
})

IMAGE_IDS = [os.path.basename(p) for p in IMAGE_PATHS]


@pytest.fixture(scope='module')
def detector():
    if not os.path.exists(MODEL_PATH):
        pytest.skip(f'Model tidak ditemukan: {MODEL_PATH}')
    d = PPEDetector(model_path=MODEL_PATH)
    d.load()
    return d


@pytest.mark.parametrize('image_path', IMAGE_PATHS, ids=IMAGE_IDS)
class TestProcessFrameOnImages:
    def test_image_loads(self, image_path):
        frame = cv2.imread(image_path)
        assert frame is not None, f'Gagal membaca gambar: {image_path}'
        assert frame.ndim == 3 and frame.shape[2] == 3

    def test_process_frame_runs_without_error(self, detector, image_path):
        frame = cv2.imread(image_path)
        results = detector.process_frame(frame, camera_id='test-camera')
        assert isinstance(results, list)

    def test_person_detections_have_expected_shape(self, detector, image_path):
        frame = cv2.imread(image_path)
        results = detector.process_frame(frame, camera_id='test-camera')

        for person in results:
            assert isinstance(person['track_id'], int)
            assert person['helm_color'] in {'Kuning', 'Putih', 'Hijau', 'Unknown'}
            assert isinstance(person['is_compliant'], bool)
            assert isinstance(person['missing_ppe'], list)
            assert 0.0 <= person['confidence'] <= 1.0
            assert len(person['bbox']) == 4
            assert person['camera_id'] == 'test-camera'


def test_at_least_one_image_found():
    assert IMAGE_PATHS, f'Tidak ada gambar ditemukan di {TESTS_DIR}'
