from playwright.sync_api import sync_playwright

def run_cuj(page):
    # It requires login via Raindrop to see collections, but wait, the button is disabled if not logged in.
    # So I can just check if the button renders correctly visually on the non-logged in page.
    page.goto("http://localhost:3000")
    page.wait_for_timeout(2000)

    # Take screenshot of the button area
    page.screenshot(path="/home/jules/verification/screenshots/verification.png", full_page=True)
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
