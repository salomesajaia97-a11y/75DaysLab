#!/usr/bin/env python3
"""
Recipe Web Scraper — 5 sites → 75DaysLab API
Runs every SCRAPE_INTERVAL_HOURS hours automatically.

Setup:
  pip install -r requirements.txt
  set SCRAPER_SECRET=your_secret   (must match .env.local SCRAPER_SECRET)
  set SITE_API_URL=https://your-domain.com/api/external/recipes
  python recipe_scraper.py
"""

import os
import re
import json
import time
import random
import logging
import sqlite3
import schedule
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from typing import Optional, Generator

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SCRAPE_INTERVAL_HOURS = 12      # change to adjust run frequency
BATCH_PER_SITE        = 20      # max new recipes saved per site per run
REQUEST_DELAY_MIN     = 1.5     # min seconds between page requests
REQUEST_DELAY_MAX     = 4.0     # max seconds between page requests
MAX_PAGES_CATEGORY    = 50      # max paginated category pages to walk per site
DB_PATH               = "seen_urls.db"

API_URL    = os.getenv("SITE_API_URL", "http://localhost:3000/api/external/recipes")
API_SECRET = os.getenv("SCRAPER_SECRET", "change_me")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# ─── LOGGING ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("scraper.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# ─── SQLITE DEDUP ─────────────────────────────────────────────────────────────
def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS seen_urls (
            url        TEXT PRIMARY KEY,
            scraped_at TEXT NOT NULL
        )
    """)
    conn.commit()
    return conn

def is_seen(conn: sqlite3.Connection, url: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM seen_urls WHERE url = ?", (url,)
    ).fetchone() is not None

def mark_seen(conn: sqlite3.Connection, url: str) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO seen_urls (url, scraped_at) VALUES (?, ?)",
        (url, datetime.utcnow().isoformat()),
    )
    conn.commit()

# ─── SHARED UTILITIES ─────────────────────────────────────────────────────────
def fetch(url: str, timeout: int = 15) -> Optional[BeautifulSoup]:
    """Fetch URL and return BeautifulSoup, or None on any error."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.warning(f"fetch failed [{url}]: {e}")
        return None

def polite_delay():
    time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

def extract_json_ld(soup: BeautifulSoup) -> Optional[dict]:
    """Pull schema.org Recipe JSON-LD from any page."""
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            raw = json.loads(tag.string or "")
            items = raw if isinstance(raw, list) else raw.get("@graph", [raw])
            for item in items:
                if not isinstance(item, dict):
                    continue
                t = item.get("@type", "")
                if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
                    return item
        except (json.JSONDecodeError, AttributeError):
            continue
    return None

def parse_iso_duration(iso: Optional[str]) -> Optional[int]:
    """PT1H30M → 90 minutes"""
    if not iso:
        return None
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?", iso)
    if not m:
        return None
    return int(m.group(1) or 0) * 60 + int(m.group(2) or 0) or None

def parse_calories(val) -> Optional[int]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return round(val)
    m = re.search(r"\d+", str(val))
    return int(m.group()) if m else None

def parse_servings(val) -> Optional[int]:
    if val is None:
        return None
    if isinstance(val, int):
        return val
    m = re.search(r"\d+", str(val))
    return int(m.group()) if m else None

def image_from_ld(ld: dict) -> Optional[str]:
    img = ld.get("image")
    if isinstance(img, str):
        return img
    if isinstance(img, list) and img:
        return img[0] if isinstance(img[0], str) else (img[0] or {}).get("url")
    if isinstance(img, dict):
        return img.get("url")
    return None

def extract_instructions(ld: dict) -> list:
    """
    recipeInstructions can be:
      - plain string
      - list of strings
      - list of HowToStep objects  {"@type": "HowToStep", "text": "..."}
      - list of HowToSection objects (with nested itemListElement)
    """
    raw = ld.get("recipeInstructions", [])
    if isinstance(raw, str):
        return [raw.strip()] if raw.strip() else []

    steps = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str):
                if item.strip():
                    steps.append(item.strip())
            elif isinstance(item, dict):
                t = item.get("@type", "")
                if t == "HowToSection":
                    for sub in item.get("itemListElement", []):
                        text = (sub.get("text") or sub.get("name") or "").strip()
                        if text:
                            steps.append(text)
                else:
                    text = (item.get("text") or item.get("name") or "").strip()
                    if text:
                        steps.append(text)
    return steps

def recipe_from_ld(ld: dict, url: str, site: str) -> Optional[dict]:
    """Convert JSON-LD Recipe → our API schema."""
    title = str(ld.get("name", "")).strip()
    if not title:
        return None

    nutrition  = ld.get("nutrition") or {}
    calories   = parse_calories(nutrition.get("calories"))
    cook_time  = parse_iso_duration(ld.get("cookTime"))
    prep_time  = parse_iso_duration(ld.get("prepTime"))
    total_time = parse_iso_duration(ld.get("totalTime")) or (
        (cook_time or 0) + (prep_time or 0) or None
    )

    keywords = ld.get("keywords", "")
    if isinstance(keywords, str):
        tags = [t.strip() for t in keywords.split(",") if t.strip()][:10]
    elif isinstance(keywords, list):
        tags = [str(k) for k in keywords[:10]]
    else:
        tags = []

    cat_raw  = ld.get("recipeCategory")
    category = (cat_raw[0] if isinstance(cat_raw, list) else cat_raw) or None

    ingredients = ld.get("recipeIngredient", [])
    ingredients = [str(i) for i in ingredients[:30]] if isinstance(ingredients, list) else []

    instructions = extract_instructions(ld)

    return {
        "title":        title,
        "sourceUrl":    url,
        "sourceSite":   site,
        "imageUrl":     image_from_ld(ld),
        "calories":     calories,
        "cookTimeMin":  cook_time,
        "prepTimeMin":  prep_time,
        "totalTimeMin": total_time,
        "servings":     parse_servings(ld.get("recipeYield")),
        "description":  str(ld.get("description", ""))[:500].strip() or None,
        "category":     category,
        "tags":         tags,
        "ingredients":  ingredients,
        "instructions": instructions,
    }

def locs_from_sitemap(url: str) -> list:
    """Fetch an XML sitemap and return all <loc> values."""
    soup = fetch(url)
    if not soup:
        return []
    return [loc.get_text(strip=True) for loc in soup.find_all("loc")]

def all_sub_sitemaps(index_url: str) -> list:
    """From a sitemap index, return all sub-sitemap URLs."""
    locs = locs_from_sitemap(index_url)
    return [u for u in locs if "sitemap" in u.lower()]

def ordered_dedup(lst: list) -> list:
    seen = set()
    return [x for x in lst if not (x in seen or seen.add(x))]

# ─── SITE 1: kulinaria.ge ─────────────────────────────────────────────────────
def get_urls_kulinaria() -> list:
    """
    Primary: XML sitemap.
    Fallback: category pages with page-number pagination.
    """
    urls = []

    # 1. Try sitemap
    sitemap_soup = fetch("https://kulinaria.ge/sitemap.xml")
    if sitemap_soup:
        for loc in sitemap_soup.find_all("loc"):
            u = loc.get_text(strip=True)
            # keep only recipe-depth URLs (at least 4 path segments)
            if "kulinaria.ge" in u and u.count("/") >= 4:
                urls.append(u)

        # sitemap index → sub-sitemaps
        for sub in [l.get_text(strip=True) for l in sitemap_soup.find_all("loc") if "sitemap" in l.get_text()]:
            polite_delay()
            for u in locs_from_sitemap(sub):
                if "kulinaria.ge" in u and u.count("/") >= 4:
                    urls.append(u)

    if urls:
        log.info(f"kulinaria: {len(urls)} from sitemap")
        return ordered_dedup(urls)

    # 2. Category page pagination fallback
    CATEGORIES = ["/receptebi/", "/sadilis/", "/salatebi/", "/desert/", "/sauzme/"]
    for cat in CATEGORIES:
        for page in range(1, MAX_PAGES_CATEGORY + 1):
            page_url = (
                f"https://kulinaria.ge{cat}"
                if page == 1
                else f"https://kulinaria.ge{cat}page/{page}/"
            )
            polite_delay()
            soup = fetch(page_url)
            if not soup:
                break

            found_any = False
            for a in soup.find_all("a", href=True):
                h = a["href"]
                full = h if h.startswith("http") else f"https://kulinaria.ge{h}"
                if "kulinaria.ge" in full and full.count("/") >= 4:
                    urls.append(full)
                    found_any = True

            # stop paginating when page returns no links or looks like a 404
            if not found_any:
                break

    log.info(f"kulinaria: {len(urls)} from category pages")
    return ordered_dedup(urls)

def parse_kulinaria(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None

    ld = extract_json_ld(soup)
    if ld:
        return recipe_from_ld(ld, url, "kulinaria")

    # HTML fallback
    try:
        title_tag = soup.find("h1") or soup.find("h2")
        title = title_tag.get_text(strip=True) if title_tag else None
        if not title:
            return None

        ingredients = [
            li.get_text(strip=True)
            for li in soup.select(
                ".ingredients li, .ingr li, [class*='ingredient'] li, "
                ".kulinaria-ingredients li, .recipe-ingredients li"
            )
        ]

        og_img = soup.find("meta", property="og:image")
        image_url = og_img["content"] if og_img else None

        return {
            "title": title, "sourceUrl": url, "sourceSite": "kulinaria",
            "imageUrl": image_url, "calories": None, "cookTimeMin": None,
            "prepTimeMin": None, "totalTimeMin": None, "servings": None,
            "description": None, "category": None, "tags": [],
            "ingredients": ingredients[:20], "instructions": [],
        }
    except Exception as e:
        log.warning(f"kulinaria HTML fallback failed [{url}]: {e}")
        return None

# ─── SITE 2: eatingwell.com ───────────────────────────────────────────────────
def get_urls_eatingwell() -> list:
    """Drain ALL sub-sitemaps from the sitemap index."""
    urls = []
    sub_maps = all_sub_sitemaps("https://www.eatingwell.com/sitemap_index.xml")
    log.info(f"eatingwell: {len(sub_maps)} sub-sitemaps")

    for sm in sub_maps:
        polite_delay()
        for u in locs_from_sitemap(sm):
            if "/recipe/" in u:
                urls.append(u)

    # Fallback if sitemap was empty
    if not urls:
        for path in ["/recipes/", "/recipes/healthy-dinner-recipes/",
                     "/recipes/healthy-chicken-recipes/", "/recipes/healthy-soup-recipes/"]:
            for page in range(1, MAX_PAGES_CATEGORY + 1):
                page_url = (
                    f"https://www.eatingwell.com{path}"
                    if page == 1
                    else f"https://www.eatingwell.com{path}?page={page}"
                )
                polite_delay()
                soup = fetch(page_url)
                if not soup:
                    break
                found = False
                for a in soup.find_all("a", href=True):
                    h = a["href"]
                    if "/recipe/" in h:
                        full = h if h.startswith("http") else f"https://www.eatingwell.com{h}"
                        urls.append(full)
                        found = True
                if not found:
                    break

    log.info(f"eatingwell: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_eatingwell(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "eatingwell") if ld else None

# ─── SITE 3: skinnytaste.com ──────────────────────────────────────────────────
def get_urls_skinnytaste() -> list:
    SKIP = {"cookbook", "vacation", "remodel", "guides", "tips-for",
            "how-to", "about", "contact", "shop", "category", "round-up"}
    urls = []

    # All known post-sitemaps
    for sm in ["https://www.skinnytaste.com/post-sitemap.xml",
               "https://www.skinnytaste.com/post-sitemap2.xml",
               "https://www.skinnytaste.com/post-sitemap3.xml",
               "https://www.skinnytaste.com/post-sitemap4.xml",
               "https://www.skinnytaste.com/post-sitemap5.xml"]:
        polite_delay()
        for u in locs_from_sitemap(sm):
            if "skinnytaste.com" in u and not any(sk in u for sk in SKIP):
                urls.append(u.rstrip("/"))

    log.info(f"skinnytaste: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_skinnytaste(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "skinnytaste") if ld else None

# ─── SITE 4: seriouseats.com ──────────────────────────────────────────────────
def get_urls_seriouseats() -> list:
    urls = []
    sub_maps = all_sub_sitemaps("https://www.seriouseats.com/sitemap_index.xml")
    log.info(f"seriouseats: {len(sub_maps)} sub-sitemaps")

    for sm in sub_maps:
        polite_delay()
        for u in locs_from_sitemap(sm):
            if "/recipes/" in u:
                urls.append(u)

    log.info(f"seriouseats: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_seriouseats(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "seriouseats") if ld else None

# ─── SITE 5: thespruceeats.com ────────────────────────────────────────────────
def get_urls_spruceeats() -> list:
    urls = []
    sub_maps = all_sub_sitemaps("https://www.thespruceeats.com/sitemap_index.xml")
    log.info(f"spruceeats: {len(sub_maps)} sub-sitemaps")

    for sm in sub_maps:
        polite_delay()
        for u in locs_from_sitemap(sm):
            if "thespruceeats.com" in u and "/recipe" in u:
                urls.append(u)

    log.info(f"spruceeats: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_spruceeats(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "spruceeats") if ld else None

# ─── SITE REGISTRY ────────────────────────────────────────────────────────────
# To add a new site: write get_urls_X() + parse_X(), append here.
SITES = [
    {"name": "kulinaria",   "get_urls": get_urls_kulinaria,   "parse": parse_kulinaria},
    {"name": "eatingwell",  "get_urls": get_urls_eatingwell,  "parse": parse_eatingwell},
    {"name": "skinnytaste", "get_urls": get_urls_skinnytaste, "parse": parse_skinnytaste},
    {"name": "seriouseats", "get_urls": get_urls_seriouseats, "parse": parse_seriouseats},
    {"name": "spruceeats",  "get_urls": get_urls_spruceeats,  "parse": parse_spruceeats},
]

# ─── UPLOAD ───────────────────────────────────────────────────────────────────
def upload_recipe(recipe: dict) -> str:
    """
    POST recipe to the API.
    Returns: 'saved' | 'skipped' | 'error'
    """
    try:
        r = requests.post(
            API_URL,
            json=recipe,
            headers={
                "Authorization": f"Bearer {API_SECRET}",
                "Content-Type":  "application/json",
            },
            timeout=15,
        )
        if r.status_code in (200, 201):
            data = r.json()
            return data.get("status", "saved")
        log.warning(f"upload HTTP {r.status_code} [{recipe['sourceUrl']}]: {r.text[:200]}")
        return "error"
    except Exception as e:
        log.error(f"upload exception [{recipe.get('sourceUrl')}]: {e}")
        return "error"

# ─── MAIN LOOP ────────────────────────────────────────────────────────────────
def scrape_all():
    log.info("══════════ Scrape run started ══════════")
    conn   = init_db()
    totals = {"saved": 0, "skipped": 0, "errors": 0}

    for site in SITES:
        name = site["name"]
        log.info(f"── {name}: collecting URLs …")

        try:
            candidates = site["get_urls"]()
        except Exception as e:
            log.error(f"{name} get_urls crashed: {e}")
            continue

        log.info(f"── {name}: {len(candidates)} candidates, scraping up to {BATCH_PER_SITE} new")
        saved = 0

        for url in candidates:
            if saved >= BATCH_PER_SITE:
                break

            # Local dedup — skip without hitting the network
            if is_seen(conn, url):
                totals["skipped"] += 1
                continue

            polite_delay()

            try:
                recipe = site["parse"](url)
            except Exception as e:
                log.warning(f"{name} parse crashed [{url}]: {e}")
                mark_seen(conn, url)
                totals["errors"] += 1
                continue

            if not recipe:
                mark_seen(conn, url)
                totals["errors"] += 1
                continue

            status = upload_recipe(recipe)

            # Mark seen regardless — 'skipped' means already in MongoDB
            mark_seen(conn, url)

            if status == "saved":
                saved += 1
                totals["saved"] += 1
                log.info(f"  ✓ {recipe['title']} ({len(recipe.get('instructions', []))} steps)")
            elif status == "skipped":
                totals["skipped"] += 1
            else:
                totals["errors"] += 1

        log.info(f"── {name}: +{saved} saved this run")

    conn.close()
    log.info(
        f"══════════ Done — "
        f"saved:{totals['saved']}  "
        f"skipped:{totals['skipped']}  "
        f"errors:{totals['errors']} ══════════"
    )

# ─── SCHEDULER ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log.info(f"Scraper starting — interval: every {SCRAPE_INTERVAL_HOURS}h")
    log.info(f"API: {API_URL}")

    scrape_all()  # run immediately on start

    schedule.every(SCRAPE_INTERVAL_HOURS).hours.do(scrape_all)
    while True:
        schedule.run_pending()
        time.sleep(30)
