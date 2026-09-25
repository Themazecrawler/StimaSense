#!/usr/bin/env python3
"""Fetch and validate Kenya Power planned-interruption notices."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List

DEFAULT_SOURCE_URL = os.environ.get(
    "KPLC_SOURCE_URL",
    "https://www.kplc.co.ke/customer-support#powerschedule",
)
KENYA_TIMEZONE = dt.timezone(dt.timedelta(hours=3))


def http_get(url: str, timeout: int = 20) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; StimaSense/1.0)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def hash_id(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", errors="ignore")).hexdigest()[:20]


def extract_pdf_links_bs4(html: str, base_url: str) -> List[str]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    links: List[str] = []
    for anchor in soup.find_all("a", href=True):
        label = normalize_space(anchor.get_text(" ", strip=True))
        href = anchor["href"].strip()
        if not re.search(r"power\s+i?maintenance\s+notice", label, re.I):
            continue
        if not href.lower().endswith(".pdf"):
            continue
        links.append(urllib.parse.urljoin(base_url, href))
    return list(dict.fromkeys(links))


def fetch_pdf_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "StimaSense/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = response.read()

    try:
        from pdfminer.high_level import extract_text
        text = extract_text(io.BytesIO(payload)) or ""
        if text.strip():
            return text
    except Exception:
        pass

    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(payload))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""


def _to_utc_iso(date_value: str, time_value: str, meridiem: str) -> str:
    normalized_date = date_value.replace("/", ".").replace("-", ".")
    normalized_time = time_value.replace(":", ".")
    normalized_meridiem = re.sub(r"[^APMapm]", "", meridiem).upper()
    parsed = dt.datetime.strptime(
        f"{normalized_date} {normalized_time} {normalized_meridiem}",
        "%d.%m.%Y %I.%M %p",
    ).replace(tzinfo=KENYA_TIMEZONE)
    return parsed.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def parse_pdf_for_outages(text: str, pdf_url: str) -> List[Dict]:
    lines = [normalize_space(line) for line in text.splitlines()]
    region_pattern = re.compile(r"^([A-Z][A-Z\s.]+ REGION)$")
    area_pattern = re.compile(r"(?i)^area\s*:\s*(.+)")
    schedule_pattern = re.compile(
        r"(?i)^date\s*:\s*[A-Za-z]+\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})"
        r"\s+time\s*:\s*(\d{1,2}[.:]\d{2})\s*([ap]\.?\s*m\.?)"
        r"\s*[–-]\s*(\d{1,2}[.:]\d{2})\s*([ap]\.?\s*m\.?)"
    )
    fetched_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    region = ""
    area = ""
    notices: List[Dict] = []

    for line in lines:
        region_match = region_pattern.fullmatch(line)
        if region_match:
            region = region_match.group(1).strip()
            continue
        area_match = area_pattern.fullmatch(line)
        if area_match:
            area = area_match.group(1).strip()
            continue
        schedule_match = schedule_pattern.search(line)
        if not schedule_match or not region or not area:
            continue

        start = _to_utc_iso(schedule_match.group(1), schedule_match.group(2), schedule_match.group(3))
        end = _to_utc_iso(schedule_match.group(1), schedule_match.group(4), schedule_match.group(5))
        notices.append({
            "id": hash_id(f"{pdf_url}|{region}|{area}|{start}|{end}"),
            "region": region,
            "area": area,
            "startTime": start,
            "endTime": end,
            "sourceUrl": pdf_url,
            "createdAt": fetched_at,
        })
        area = ""

    return notices


def parse_iso(value: str) -> dt.datetime | None:
    try:
        parsed = dt.datetime.fromisoformat((value or "").replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)
    except (TypeError, ValueError):
        return None


def validate_items(items: List[Dict], now: dt.datetime | None = None) -> List[Dict]:
    current_time = now or dt.datetime.now(dt.timezone.utc)
    valid: Dict[str, Dict] = {}
    for item in items:
        start = parse_iso(str(item.get("startTime", "")))
        end = parse_iso(str(item.get("endTime", "")))
        region = normalize_space(str(item.get("region", "")))
        area = normalize_space(str(item.get("area", "")))
        source_url = str(item.get("sourceUrl", ""))
        identifier = str(item.get("id", ""))
        if not identifier or not region or not area or not start or not end:
            continue
        if end <= start or end < current_time - dt.timedelta(hours=2):
            continue
        if not source_url.startswith("https://"):
            continue
        if area.lower() in {"home", "about", "contact", "customer support", "planned maintenance"}:
            continue
        valid[identifier] = {
            **item,
            "region": region,
            "area": area,
            "startTime": start.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "endTime": end.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        }
    return sorted(valid.values(), key=lambda item: item["startTime"])


def write_snapshot(path: str, notices: List[Dict]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + ".tmp")
    temporary.write_text(json.dumps(notices, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch KPLC planned interruptions")
    parser.add_argument("output")
    parser.add_argument("--mirror", default=None)
    parser.add_argument("--source", default=DEFAULT_SOURCE_URL)
    args = parser.parse_args(argv)

    try:
        html = http_get(args.source)
        pdf_links = extract_pdf_links_bs4(html, args.source)
        if not pdf_links:
            raise RuntimeError("no Power Maintenance Notice PDFs were found")

        parsed: List[Dict] = []
        for pdf_url in pdf_links[:15]:
            text = fetch_pdf_text(pdf_url)
            if text:
                parsed.extend(parse_pdf_for_outages(text, pdf_url))
        notices = validate_items(parsed)
        if not notices:
            raise RuntimeError("no current notices passed provenance and time-window validation")

        write_snapshot(args.output, notices)
        if args.mirror:
            write_snapshot(args.mirror, notices)
        print(f"Wrote {len(notices)} validated notices")
        return 0
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
