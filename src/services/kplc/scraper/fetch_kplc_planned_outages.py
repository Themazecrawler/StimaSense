import json
import re
import sys
from datetime import datetime
from typing import List, Dict

import requests
from bs4 import BeautifulSoup


SOURCE_URL = "https://kplc.co.ke/customer-support#powerschedule"


def parse_datetime_range(text: str):
    # Heuristic parse: look for patterns like DD.MM.YYYY or DD/MM/YYYY and time ranges
    # This can be refined once exact HTML is known.
    date_match = re.search(r"(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})", text)
    time_range = re.search(r"(\d{1,2}:\d{2}\s*(AM|PM|am|pm)?)[\s\-toTO]+(\d{1,2}:\d{2}\s*(AM|PM|am|pm)?)", text)

    start_iso = None
    end_iso = None
    if date_match and time_range:
        date_str = date_match.group(1).replace('.', '/').replace('-', '/')
        start_t = time_range.group(1)
        end_t = time_range.group(3)
        try:
            start_dt = datetime.strptime(f"{date_str} {start_t}", "%d/%m/%Y %I:%M %p")
        except Exception:
            try:
                start_dt = datetime.strptime(f"{date_str} {start_t}", "%d/%m/%Y %H:%M")
            except Exception:
                start_dt = None
        try:
            end_dt = datetime.strptime(f"{date_str} {end_t}", "%d/%m/%Y %I:%M %p")
        except Exception:
            try:
                end_dt = datetime.strptime(f"{date_str} {end_t}", "%d/%m/%Y %H:%M")
            except Exception:
                end_dt = None
        if start_dt:
            start_iso = start_dt.isoformat()
        if end_dt:
            end_iso = end_dt.isoformat()
    return start_iso, end_iso


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def fetch() -> List[Dict]:
    resp = requests.get(SOURCE_URL, timeout=30)
    resp.raise_for_status()
    html = resp.text
    soup = BeautifulSoup(html, 'html.parser')

    items: List[Dict] = []

    # Heuristic scraping based on headings like "Power Maintenance Notice"
    for article in soup.find_all(['article', 'div']):
        title = normalize(article.get_text(" "))
        if not title:
            continue
        if "Power Maintenance Notice" in title or "SPECIAL POWER SUPPLY INTERRUPTION" in title.upper():
            region = None
            area = None
            start_iso, end_iso = parse_datetime_range(title)

            # Try to detect region/area tokens
            # Commonly regions like Nairobi, Mombasa, Kisumu etc.
            # This is a placeholder heuristic; refine with real samples.
            m_region = re.search(r"Region[:\-]\s*([A-Za-z\s]+)", title)
            if m_region:
                region = normalize(m_region.group(1))
            m_area = re.search(r"Areas?[:\-]\s*([A-Za-z0-9,\s\/\-]+)", title)
            if m_area:
                area = normalize(m_area.group(1))

            # Fallback: split by hyphen and infer
            if not region:
                parts = [p.strip() for p in title.split('-') if p.strip()]
                if len(parts) >= 2:
                    region = parts[1]
            if not area:
                area = "Planned maintenance"

            link = SOURCE_URL
            created_at = datetime.utcnow().isoformat() + "Z"
            stable_id = normalize(title)[:120]

            items.append({
                "id": stable_id,
                "region": region or "",
                "area": area or "",
                "startTime": start_iso or "",
                "endTime": end_iso or "",
                "sourceUrl": link,
                "createdAt": created_at,
            })

    # Deduplicate by id
    seen = set()
    deduped = []
    for it in items:
        if it["id"] in seen:
            continue
        seen.add(it["id"]) 
        deduped.append(it)

    return deduped


if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "planned_outages.json"
    data = fetch()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(data)} records to {out_path}")


