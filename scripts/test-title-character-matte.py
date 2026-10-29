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

if __name__ == '__main__':
    unittest.main()
