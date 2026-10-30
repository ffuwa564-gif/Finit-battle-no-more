"""Visual invariants of the black-matte refinement; run with python directly."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location('title_matte', Path(__file__).with_name('refine-title-character.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CharacterMatteTests(unittest.TestCase):
    def scene(self):
        rgb = np.zeros((128, 128, 3), dtype=np.float32)
        rgb[20:108, 36:92] = [200, 180, 160]
        mask = np.zeros((128, 128), dtype=np.uint8)
        mask[20:108, 36:92] = 255
        return rgb, mask

    def test_fine_hair_outside_segmentation_is_restored_without_black_fringe(self):
        rgb, mask = self.scene()
        rgb[60:63, 5:40] = [80, 72, 64]  # 40% coverage of the same foreground color.
        result = module.refine(rgb, mask)
        self.assertGreater(int(result[61, 15, 3]), 90)
        self.assertLess(int(result[61, 15, 3]), 110)
        np.testing.assert_allclose(result[61, 15, :3], [200, 180, 160], atol=2)

    def test_dark_costume_inside_the_body_stays_opaque(self):
        rgb, mask = self.scene()
        rgb[60:70, 60:70] = [12, 10, 8]
        result = module.refine(rgb, mask)
        self.assertEqual(int(result[65, 65, 3]), 255)
        np.testing.assert_array_equal(result[65, 65, :3], [12, 10, 8])

    def test_disconnected_sparkle_and_background_are_transparent(self):
        rgb, mask = self.scene()
        rgb[7, 7] = [220, 220, 220]
        result = module.refine(rgb, mask)
        self.assertEqual(int(result[7, 7, 3]), 0)
        np.testing.assert_array_equal(result[7, 7, :3], [0, 0, 0])
        self.assertEqual(int(result[0, 0, 3]), 0)

class TrustedCutoutTests(unittest.TestCase):
    def test_original_hair_opening_removes_opaque_black_without_erasing_dark_costume(self):
        rgb = np.zeros((128, 128, 3), np.float32)
        rgb[10:118, 10:118] = [200, 180, 160]
        rgb[40:80, 80:100] = 0
        rgb[50:65, 40:55] = [12, 10, 8]
        coarse = np.zeros((128, 128), np.uint8)
        coarse[10:118, 10:118] = 255  # Incorrectly fills the hair opening.
        trusted = coarse.copy()
        trusted[40:80, 80:100] = 0
        result = module.refine(rgb, coarse, trusted, rgb)
        self.assertEqual(int(result[60, 90, 3]), 0)
        self.assertEqual(int(result[55, 45, 3]), 255)
        np.testing.assert_array_equal(result[55, 45, :3], [12, 10, 8])


    def test_flow_error_cannot_fill_a_background_gap_with_opaque_black(self):
        rgb = np.full((128, 128, 3), 200, np.float32)
        rgb[40:80, 70:100] = 0
        mask = np.full((128, 128), 255, np.uint8)
        trusted = mask.copy()  # Simulate a wrong flow mapping foreground over the gap.
        reference = np.full((128, 128, 3), 200, np.float32)
        result = module.refine(rgb, mask, trusted, reference)
        self.assertEqual(int(result[60, 85, 3]), 0)
        np.testing.assert_array_equal(result[60, 85, :3], [0, 0, 0])


class TemporalEdgeTests(unittest.TestCase):
    def test_matte_flicker_is_reduced_without_changing_opaque_detail(self):
        rgb = np.zeros((128, 128, 3), np.float32)
        rgb[20:108, 36:92] = [200, 180, 160]
        rgb[40:80, 35] = [80, 72, 64]
        current = np.zeros((128, 128, 4), np.uint8)
        current[20:108, 36:92] = [200, 180, 160, 255]
        current[40:80, 35] = [200, 180, 160, 102]
        neighbor = current.copy()
        neighbor[40:80, 35, 3] = 153
        result = module.stabilize_edges((rgb, current), (rgb, neighbor), (rgb, neighbor))
        self.assertGreater(int(result[60, 35, 3]), 102)
        self.assertLess(int(result[60, 35, 3]), 153)
        np.testing.assert_array_equal(result[65, 65], current[65, 65])

    def test_disoccluded_background_does_not_keep_a_trail(self):
        rgb = np.zeros((128, 128, 3), np.float32)
        current = np.zeros((128, 128, 4), np.uint8)
        previous_rgb = rgb.copy()
        previous_rgb[40:80, 40:80] = 200
        previous = current.copy()
        previous[40:80, 40:80] = [200, 200, 200, 255]
        result = module.stabilize_edges((rgb, current), (previous_rgb, previous), (rgb, current))
        self.assertEqual(int(result[:, :, 3].max()), 0)


if __name__ == '__main__':
    unittest.main()
