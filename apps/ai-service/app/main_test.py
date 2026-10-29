import unittest
from app.main import app

class TestAiService(unittest.TestCase):
    def test_app_created(self):
        self.assertIsNotNone(app)
        self.assertEqual(app.title, "GroupDrive AI Engine")

if __name__ == "__main__":
    unittest.main()
