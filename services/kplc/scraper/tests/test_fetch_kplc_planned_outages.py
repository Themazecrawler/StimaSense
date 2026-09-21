import datetime as dt
import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).parents[1] / "fetch_kplc_planned_outages.py"
SPEC = importlib.util.spec_from_file_location("kplc_scraper", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ValidateItemsTests(unittest.TestCase):
    def test_parses_kplc_region_area_and_kenya_time_window(self):
        text = """
NAIROBI REGION
AREA: PARTS OF KOMAROCK
DATE: Tuesday 22.09.2026 TIME: 9.00 A.M. – 5.00 P.M.
"""
        items = MODULE.parse_pdf_for_outages(text, "https://www.kplc.co.ke/notice.pdf")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["region"], "NAIROBI REGION")
        self.assertEqual(items[0]["area"], "PARTS OF KOMAROCK")
        self.assertEqual(items[0]["startTime"], "2026-09-22T06:00:00Z")
        self.assertEqual(items[0]["endTime"], "2026-09-22T14:00:00Z")

    def test_keeps_only_current_notices_with_complete_provenance(self):
        now = dt.datetime(2026, 9, 21, tzinfo=dt.timezone.utc)
        valid = {
            "id": "notice-1",
            "region": "Nairobi",
            "area": "Westlands",
            "startTime": "2026-09-22T06:00:00Z",
            "endTime": "2026-09-22T12:00:00Z",
            "sourceUrl": "https://www.kplc.co.ke/notice.pdf",
            "createdAt": "2026-09-21T10:00:00Z",
        }
        malformed = {**valid, "id": "notice-2", "startTime": "", "endTime": ""}

        self.assertEqual(MODULE.validate_items([malformed, valid], now), [valid])

    def test_rejects_navigation_and_expired_rows(self):
        now = dt.datetime(2026, 9, 21, tzinfo=dt.timezone.utc)
        item = {
            "id": "notice-1",
            "region": "Nairobi",
            "area": "Home",
            "startTime": "2025-09-20T06:00:00Z",
            "endTime": "2025-09-20T12:00:00Z",
            "sourceUrl": "https://www.kplc.co.ke/notice.pdf",
            "createdAt": "2025-09-19T10:00:00Z",
        }
        self.assertEqual(MODULE.validate_items([item], now), [])


if __name__ == "__main__":
    unittest.main()
