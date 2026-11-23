"""Record the invitation's card pages frame by frame (with their reveal
animations) from the page's ?render= mode, using the installed Chrome."""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5178/"
OUT = sys.argv[1]
FPS = 30
PAGES = [("verse", 5.5), ("fathers", 10.5), ("details", 11.0)]

SET_TIME = """(t) => {
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    ctx = browser.new_context(viewport={"width": 540, "height": 960}, device_scale_factor=2)
    page = ctx.new_page()
    for name, seconds in PAGES:
        folder = os.path.join(OUT, name)
        os.makedirs(folder, exist_ok=True)
        page.goto(f"{BASE}?render={name}", wait_until="load")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(1500)
        page.evaluate(SET_TIME, 0)
        frames = int(round(seconds * FPS))
        for f in range(frames):
            page.evaluate(SET_TIME, f * 1000 / FPS)
            page.screenshot(path=os.path.join(folder, f"{f:05d}.jpg"), type="jpeg", quality=93)
        print(name, frames, "frames", flush=True)
    browser.close()
