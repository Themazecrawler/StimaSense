#!/usr/bin/env python3
"""
Fetch KPLC planned outages and write a JSON array to the given output path.

Usage:
  python services/kplc/scraper/fetch_kplc_planned_outages.py models/planned_outages.json [--mirror src/models/planned_outages.json]

Notes:
- This script is resilient: it always writes a JSON file (possibly empty []) and exits 0
  so CI won't fail if KPLC site structure changes.
- If BeautifulSoup is available, it will use it; otherwise falls back to simple regex parsing.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import urllib.request
from typing import List, Dict


DEFAULT_SOURCE_URL = os.environ.get(
    "KPLC_SOURCE_URL",
    "https://www.kplc.co.ke/customer-support#powerschedule",
)


def http_get(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; StimaSense/1.0; +https://stimasense.app)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def normalize_space(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def hash_id(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8", errors="ignore")).hexdigest()[:16]


def extract_pdf_links_bs4(html: str, base_url: str) -> List[str]:
    try:
        from bs4 import BeautifulSoup  # type: ignore
    except Exception:
        return []

    soup = BeautifulSoup(html, "html.parser")
    pdfs = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().endswith(".pdf"):
            if href.startswith("http"):
                pdfs.append(href)
            else:
                # construct absolute URL
                if href.startswith("/"):
                    # take scheme+host from base
                    m = re.match(r"^(https?://[^/]+)", base_url)
                    host = m.group(1) if m else ""
                    pdfs.append(host + href)
                else:
                    # relative
                    pdfs.append(base_url.rsplit("/", 1)[0] + "/" + href)
    # Deduplicate preserve order
    seen = set()
    uniq = []
    for u in pdfs:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    return uniq


def parse_list_section_bs4(html: str) -> List[Dict]:
    """Fallback: extract visible maintenance items from the HTML list as coarse entries."""
    try:
        from bs4 import BeautifulSoup  # type: ignore
    except Exception:
        return []
    soup = BeautifulSoup(html, "html.parser")
    keywords = ["Power Maintenance Notice", "Planned", "Interruption", "Outage"]
    texts = []
    for el in soup.find_all(text=True):
        t = normalize_space(el)
        if any(k.lower() in t.lower() for k in keywords) and len(t) > 12:
            texts.append(t)
    seen = set()
    uniq = []
    for t in texts:
        if t not in seen:
            seen.add(t)
            uniq.append(t)
    now_iso = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    outages = []
    for t in uniq[:50]:
        outages.append({
            "id": hash_id(t),
            "region": t[:120],
            "area": "Planned maintenance",
            "startTime": "",
            "endTime": "",
            "sourceUrl": DEFAULT_SOURCE_URL,
            "createdAt": now_iso,
        })
    return outages


def fetch_pdf_text(url: str) -> str:
    data = urllib.request.urlopen(url, timeout=30).read()
    text = ""
    # Try pdfminer.six
    try:
        from pdfminer.high_level import extract_text  # type: ignore
        import io
        text = extract_text(io.BytesIO(data)) or ""
        if text.strip():
            return text
    except Exception:
        pass
    # Try PyPDF2
    try:
        import PyPDF2  # type: ignore
        import io
        reader = PyPDF2.PdfReader(io.BytesIO(data))
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception:
        return ""


def parse_pdf_for_outages(text: str, pdf_url: str) -> List[Dict]:
    lines = [normalize_space(l) for l in text.splitlines()]
    now_iso = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    outages: List[Dict] = []

    region = ""
    area = ""
    start = ""
    end = ""

    date_re = re.compile(r"(?i)date\s*:\s*([A-Za-z]+\s*\d{1,2}[./-]\d{1,2}[./-]\d{4})")
    time_re = re.compile(r"(?i)time\s*:\s*([0-9.:\sAPMapm–\-]+)")
    area_re = re.compile(r"(?i)^area\s*:\s*(.+)")
    region_re = re.compile(r"(?i)(region\s*:\s*|^)([A-Z\s]+REGION|PARTS OF [A-Z\s]+ COUNTY)")

    def flush():
        nonlocal region, area, start, end
        if area or start or end or region:
            outages.append({
                "id": hash_id(f"{pdf_url}|{region}|{area}|{start}|{end}"),
                "region": region or "",
                "area": area or "",
                "startTime": start,
                "endTime": end,
                "sourceUrl": pdf_url,
                "createdAt": now_iso,
            })
            region = area = start = end = ""

    for ln in lines:
        if not ln:
            continue
        m = region_re.search(ln)
        if m:
            # start a new block
            flush()
            region = m.group(2).strip()
            continue
        m = area_re.search(ln)
        if m:
            area = m.group(1).strip()
            continue
        m = date_re.search(ln)
        if m:
            # crude ISO conversion attempt
            start = m.group(1).strip()
            continue
        m = time_re.search(ln)
        if m:
            # store raw time range
            end = m.group(1).strip()
            continue

    flush()
    # Fallback: if nothing parsed, create one generic entry
    if not outages and lines:
        outages.append({
            "id": hash_id(pdf_url),
            "region": lines[0][:120],
            "area": "Planned maintenance",
            "startTime": "",
            "endTime": "",
            "sourceUrl": pdf_url,
            "createdAt": now_iso,
        })
    return outages


def parse_with_regex(html: str) -> List[Dict]:
    now_iso = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    # Simple pattern around phrases like "Power Maintenance Notice" lines
    pattern = re.compile(r"(?i)(power\s+maintenance\s+notice[^<\n\r]*)")
    matches = pattern.findall(html or "")
    outages = []
    for m in matches[:50]:  # cap
        t = normalize_space(m)
        outages.append(
            {
                "id": hash_id(t),
                "region": t[:120],
                "area": "Planned maintenance",
                "startTime": "",
                "endTime": "",
                "sourceUrl": DEFAULT_SOURCE_URL,
                "createdAt": now_iso,
            }
        )
    return outages


def merge_and_sort(items: List[Dict]) -> List[Dict]:
    dedup = {}
    for it in items:
        dedup[it["id"]] = it
    # Sort descending by createdAt as fallback
    return sorted(dedup.values(), key=lambda x: x.get("createdAt", ""), reverse=True)


def ensure_parent_dir(path: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch KPLC planned outages")
    parser.add_argument("output", help="Output JSON path (e.g., models/planned_outages.json)")
    parser.add_argument("--mirror", help="Optional second output path to mirror the JSON", default=None)
    parser.add_argument("--source", help="Override source URL", default=DEFAULT_SOURCE_URL)
    args = parser.parse_args(argv)

    html = ""
    try:
        html = http_get(args.source)
    except Exception as e:
        # Non-fatal; we will write an empty array
        print(f"WARN: failed to fetch source: {e}", file=sys.stderr)

    items: List[Dict] = []
    items = []
    pdf_links = extract_pdf_links_bs4(html, args.source)
    if pdf_links:
        for pdf in pdf_links[:15]:  # cap requests
            try:
                txt = fetch_pdf_text(pdf)
                if not txt:
                    continue
                items.extend(parse_pdf_for_outages(txt, pdf))
            except Exception as e:
                print(f"WARN: failed pdf parse {pdf}: {e}", file=sys.stderr)
    else:
        # fallback to page text extraction
        try:
            items = parse_list_section_bs4(html)
        except Exception as e:
            print(f"WARN: bs4 list parse failed: {e}", file=sys.stderr)
        if not items:
            try:
                items = parse_with_regex(html)
            except Exception as e:
                print(f"WARN: regex parse failed: {e}", file=sys.stderr)

    items = merge_and_sort(items)

    # Always write a JSON array (possibly empty)
    payload = json.dumps(items, ensure_ascii=False, indent=2)
    try:
        ensure_parent_dir(args.output)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(payload)
        print(f"Wrote {len(items)} outages -> {args.output}")
    except Exception as e:
        print(f"ERROR: failed writing output: {e}", file=sys.stderr)

    if args.mirror:
        try:
            ensure_parent_dir(args.mirror)
            with open(args.mirror, "w", encoding="utf-8") as f:
                f.write(payload)
            print(f"Mirrored -> {args.mirror}")
        except Exception as e:
            print(f"WARN: failed to mirror output: {e}", file=sys.stderr)

    # Never fail CI; data may be empty if structure changes
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))


