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
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SCRAPE_INTERVAL_HOURS = 12      # change to adjust run frequency
BATCH_PER_SITE        = 20      # max new recipes saved per site per run
REQUEST_DELAY_MIN     = 0.5     # min seconds between page requests
REQUEST_DELAY_MAX     = 1.5     # max seconds between page requests
MAX_PAGES_CATEGORY    = 50      # max paginated category pages to walk per site
MAX_WORKERS           = 6       # parallel threads for recipe page fetching
MAX_URL_WORKERS       = 4       # parallel threads for URL-collection (sitemaps/pages)
DB_PATH               = "seen_urls.db"

API_URL    = os.getenv("SITE_API_URL", "http://localhost:3000/api/external/recipes")
API_SECRET = os.getenv("SCRAPER_SECRET", "change_me")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
]

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
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
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
def random_headers() -> dict:
    return {
        "User-Agent":      random.choice(USER_AGENTS),
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT":             "1",
    }

def fetch(url: str, timeout: int = 15) -> Optional[BeautifulSoup]:
    try:
        r = requests.get(url, headers=random_headers(), timeout=timeout)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.warning(f"fetch failed [{url}]: {e}")
        return None

def polite_delay():
    time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

def extract_json_ld(soup: BeautifulSoup) -> Optional[dict]:
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

def parse_grams(val) -> Optional[float]:
    """Parse '20 g', '20.5g', 20 → float grams."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return round(float(val), 1)
    m = re.search(r"[\d.]+", str(val))
    return round(float(m.group()), 1) if m else None

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
    title = str(ld.get("name", "")).strip()
    if not title:
        return None

    nutrition  = ld.get("nutrition") or {}
    calories   = parse_calories(nutrition.get("calories"))
    protein    = parse_grams(nutrition.get("proteinContent"))
    carbs      = parse_grams(nutrition.get("carbohydrateContent"))
    fat        = parse_grams(nutrition.get("fatContent"))

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

    suitable = ld.get("suitableForDiet")

    return {
        "title":        title,
        "sourceUrl":    url,
        "sourceSite":   site,
        "imageUrl":     image_from_ld(ld),
        "calories":     calories,
        "protein":      protein,
        "carbs":        carbs,
        "fat":          fat,
        "cookTimeMin":  cook_time,
        "prepTimeMin":  prep_time,
        "totalTimeMin": total_time,
        "servings":     parse_servings(ld.get("recipeYield")),
        "description":  str(ld.get("description", ""))[:500].strip() or None,
        "category":     category,
        "tags":         tags,
        "suitableForDiet": suitable,
        "ingredients":  ingredients,
        "instructions": instructions,
    }

def locs_from_sitemap(url: str) -> list:
    soup = fetch(url)
    if not soup:
        return []
    return [loc.get_text(strip=True) for loc in soup.find_all("loc")]

def all_sub_sitemaps(index_url: str) -> list:
    locs = locs_from_sitemap(index_url)
    return [u for u in locs if "sitemap" in u.lower()]

def ordered_dedup(lst: list) -> list:
    seen = set()
    return [x for x in lst if not (x in seen or seen.add(x))]

def _fetch_sitemap(url: str) -> tuple:
    time.sleep(random.uniform(0.3, 1.0))
    return url, fetch(url)

def fetch_sitemaps_parallel(urls: list) -> list:
    """Fetch multiple sitemap URLs concurrently. Returns list of (url, soup) for non-None."""
    results = []
    with ThreadPoolExecutor(max_workers=MAX_URL_WORKERS) as pool:
        for url, soup in pool.map(_fetch_sitemap, urls):
            if soup:
                results.append((url, soup))
    return results

def fetch_pages_parallel(page_urls: list) -> list:
    """Fetch multiple HTML pages concurrently. Returns list of (url, soup)."""
    results = []
    with ThreadPoolExecutor(max_workers=MAX_URL_WORKERS) as pool:
        futures = {pool.submit(_fetch_sitemap, u): u for u in page_urls}
        for future in as_completed(futures):
            try:
                url, soup = future.result()
                if soup:
                    results.append((url, soup))
            except Exception:
                pass
    return results

# ─── SITE 1: kulinaria.ge ─────────────────────────────────────────────────────
def get_urls_kulinaria() -> list:
    urls = []
    sitemap_soup = fetch("https://kulinaria.ge/sitemap.xml")
    if sitemap_soup:
        for loc in sitemap_soup.find_all("loc"):
            u = loc.get_text(strip=True)
            if "kulinaria.ge" in u and u.count("/") >= 4:
                urls.append(u)
        sub_sitemaps = [
            l.get_text(strip=True)
            for l in sitemap_soup.find_all("loc")
            if "sitemap" in l.get_text()
        ]
        for _url, soup in fetch_sitemaps_parallel(sub_sitemaps):
            for loc in soup.find_all("loc"):
                u = loc.get_text(strip=True)
                if "kulinaria.ge" in u and u.count("/") >= 4:
                    urls.append(u)

    if urls:
        log.info(f"kulinaria: {len(urls)} from sitemap")
        return ordered_dedup(urls)

    CATEGORIES = ["/receptebi/", "/sadilis/", "/salatebi/", "/desert/", "/sauzme/"]
    page_urls = []
    for cat in CATEGORIES:
        for page in range(1, MAX_PAGES_CATEGORY + 1):
            page_urls.append(
                f"https://kulinaria.ge{cat}"
                if page == 1
                else f"https://kulinaria.ge{cat}page/{page}/"
            )
    for _url, soup in fetch_pages_parallel(page_urls):
        for a in soup.find_all("a", href=True):
            h = a["href"]
            full = h if h.startswith("http") else f"https://kulinaria.ge{h}"
            if "kulinaria.ge" in full and full.count("/") >= 4:
                urls.append(full)

    log.info(f"kulinaria: {len(urls)} from category pages")
    return ordered_dedup(urls)

def parse_kulinaria(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    if ld:
        return recipe_from_ld(ld, url, "kulinaria")
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
            "imageUrl": image_url, "calories": None, "protein": None, "carbs": None, "fat": None,
            "cookTimeMin": None, "prepTimeMin": None, "totalTimeMin": None, "servings": None,
            "description": None, "category": None, "tags": [],
            "ingredients": ingredients[:20], "instructions": [],
        }
    except Exception as e:
        log.warning(f"kulinaria HTML fallback failed [{url}]: {e}")
        return None

# ─── SITE 2: eatingwell.com ───────────────────────────────────────────────────
def get_urls_eatingwell() -> list:
    urls = []
    sub_maps = all_sub_sitemaps("https://www.eatingwell.com/sitemap_index.xml")
    log.info(f"eatingwell: {len(sub_maps)} sub-sitemaps")
    for _url, soup in fetch_sitemaps_parallel(sub_maps):
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
            if "/recipe/" in u:
                urls.append(u)
    if not urls:
        PATHS = ["/recipes/", "/recipes/healthy-dinner-recipes/",
                 "/recipes/healthy-chicken-recipes/", "/recipes/healthy-soup-recipes/"]
        page_urls = []
        for path in PATHS:
            for page in range(1, MAX_PAGES_CATEGORY + 1):
                page_urls.append(
                    f"https://www.eatingwell.com{path}"
                    if page == 1
                    else f"https://www.eatingwell.com{path}?page={page}"
                )
        for _url, soup in fetch_pages_parallel(page_urls):
            for a in soup.find_all("a", href=True):
                h = a["href"]
                if "/recipe/" in h:
                    full = h if h.startswith("http") else f"https://www.eatingwell.com{h}"
                    urls.append(full)
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
    sitemap_list = [
        "https://www.skinnytaste.com/post-sitemap.xml",
        "https://www.skinnytaste.com/post-sitemap2.xml",
        "https://www.skinnytaste.com/post-sitemap3.xml",
        "https://www.skinnytaste.com/post-sitemap4.xml",
        "https://www.skinnytaste.com/post-sitemap5.xml",
    ]
    urls = []
    for _url, soup in fetch_sitemaps_parallel(sitemap_list):
        if not soup:
            continue
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
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
    for _url, soup in fetch_sitemaps_parallel(sub_maps):
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
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
    for _url, soup in fetch_sitemaps_parallel(sub_maps):
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
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

# ─── SITE 6: minimalistbaker.com ──────────────────────────────────────────────
def get_urls_minimalistbaker() -> list:
    urls = []
    sub_maps = [u for u in all_sub_sitemaps("https://minimalistbaker.com/sitemap_index.xml")
                if "post" in u.lower()]
    if not sub_maps:
        sub_maps = all_sub_sitemaps("https://minimalistbaker.com/sitemap_index.xml")
    log.info(f"minimalistbaker: {len(sub_maps)} sub-sitemaps")
    SKIP = {"category", "tag", "author", "about", "contact", "shop", "recipe-index", "feed"}
    for _url, soup in fetch_sitemaps_parallel(sub_maps):
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
            if "minimalistbaker.com" in u and not any(sk in u for sk in SKIP):
                urls.append(u.rstrip("/"))
    log.info(f"minimalistbaker: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_minimalistbaker(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "minimalistbaker") if ld else None

# ─── SITE 7: loveandlemons.com ────────────────────────────────────────────────
def get_urls_loveandlemons() -> list:
    urls = []
    sub_maps = [u for u in all_sub_sitemaps("https://www.loveandlemons.com/sitemap_index.xml")
                if "post" in u.lower()]
    if not sub_maps:
        sub_maps = all_sub_sitemaps("https://www.loveandlemons.com/sitemap_index.xml")
    log.info(f"loveandlemons: {len(sub_maps)} sub-sitemaps")
    SKIP = {"category", "tag", "author", "about", "contact", "shop", "recipes", "feed"}
    for _url, soup in fetch_sitemaps_parallel(sub_maps):
        for loc in soup.find_all("loc"):
            u = loc.get_text(strip=True)
            if "loveandlemons.com" in u and not any(sk in u for sk in SKIP):
                urls.append(u.rstrip("/"))
    log.info(f"loveandlemons: {len(urls)} candidates")
    return ordered_dedup(urls)

def parse_loveandlemons(url: str) -> Optional[dict]:
    soup = fetch(url)
    if not soup:
        return None
    ld = extract_json_ld(soup)
    return recipe_from_ld(ld, url, "loveandlemons") if ld else None

# ─── SITE REGISTRY ────────────────────────────────────────────────────────────
SITES = [
    {"name": "kulinaria",   "get_urls": get_urls_kulinaria,   "parse": parse_kulinaria},
    {"name": "eatingwell",  "get_urls": get_urls_eatingwell,  "parse": parse_eatingwell},
    {"name": "skinnytaste", "get_urls": get_urls_skinnytaste, "parse": parse_skinnytaste},
    {"name": "seriouseats", "get_urls": get_urls_seriouseats, "parse": parse_seriouseats},
    {"name": "spruceeats",  "get_urls": get_urls_spruceeats,  "parse": parse_spruceeats},
    {"name": "minimalistbaker", "get_urls": get_urls_minimalistbaker, "parse": parse_minimalistbaker},
    {"name": "loveandlemons",   "get_urls": get_urls_loveandlemons,   "parse": parse_loveandlemons},
]

# ─── UPLOAD ───────────────────────────────────────────────────────────────────
def upload_recipe(recipe: dict) -> str:
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

# ─── PARALLEL WORKER ──────────────────────────────────────────────────────────
def _fetch_and_parse(url: str, parse_fn, conn: sqlite3.Connection) -> Optional[dict]:
    """Used by ThreadPoolExecutor — fetch + parse one URL. Returns recipe or None."""
    if is_seen(conn, url):
        return None
    polite_delay()
    try:
        return parse_fn(url)
    except Exception as e:
        log.warning(f"parse crashed [{url}]: {e}")
        return None

# ─── MAIN LOOP ────────────────────────────────────────────────────────────────
def scrape_all():
    log.info("══════════ Scrape run started ══════════")
    conn   = init_db()
    totals = {"saved": 0, "skipped": 0, "errors": 0}

    for site in SITES:
        name     = site["name"]
        parse_fn = site["parse"]
        log.info(f"── {name}: collecting URLs …")

        try:
            candidates = site["get_urls"]()
        except Exception as e:
            log.error(f"{name} get_urls crashed: {e}")
            continue

        # Filter already-seen before spawning threads
        new_urls = [u for u in candidates if not is_seen(conn, u)]
        skipped  = len(candidates) - len(new_urls)
        totals["skipped"] += skipped

        to_scrape = new_urls[:BATCH_PER_SITE]
        log.info(f"── {name}: {len(candidates)} candidates, {skipped} seen, scraping {len(to_scrape)}")

        saved = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {
                pool.submit(_fetch_and_parse, url, parse_fn, conn): url
                for url in to_scrape
            }
            for future in as_completed(futures):
                url = futures[future]
                try:
                    recipe = future.result()
                except Exception as e:
                    log.warning(f"{name} future raised [{url}]: {e}")
                    mark_seen(conn, url)
                    totals["errors"] += 1
                    continue

                if not recipe:
                    mark_seen(conn, url)
                    totals["errors"] += 1
                    continue

                status = upload_recipe(recipe)
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
