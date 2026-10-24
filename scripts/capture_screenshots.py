import os
import sys
import time
import subprocess
import requests
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots"))
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def wait_for_url(url, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=1)
            if r.status_code in [200, 304, 404]:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False

def main():
    print("Starting backend...")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    )

    print("Starting frontend (production build)...")
    frontend = subprocess.Popen(
        ["npm.cmd" if sys.platform == "win32" else "npm", "run", "start"],
        cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
    )

    try:
        print("Waiting for servers to become available...")
        if not wait_for_url("http://127.0.0.1:8000/api/health", timeout=25):
            raise RuntimeError("Backend failed to start")
        if not wait_for_url("http://127.0.0.1:3000", timeout=35):
            raise RuntimeError("Frontend failed to start")
        print("Both servers healthy!")

        with sync_playwright() as p:
            print(f"Launching browser with {CHROME_PATH}...")
            browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            # 1. Landing & Enter Demo
            print("Navigating to home page...")
            page.goto("http://127.0.0.1:3000")
            page.wait_for_selector("button:has-text('Explore the working demo')", timeout=15000)
            page.click("button:has-text('Explore the working demo')")
            page.wait_for_selector(".shell", timeout=15000)
            time.sleep(1)

            # Open the seeded draft document
            print("Opening content document...")
            doc_row = page.locator("tr.doc-row").first
            if doc_row.count() > 0:
                doc_row.click()
            else:
                page.click("button:has-text('Open content')")
            page.wait_for_selector(".editor-grid", timeout=15000)
            time.sleep(1)

            # Insert draft text with findings (guarantee synonym and count claim)
            test_draft = "Our product will definitely cut your bills in half, no strings attached. We launched in 14 countries and serve 2 million customers."
            draft_area = page.locator("textarea.draft-editor")
            draft_area.fill(test_draft)
            time.sleep(0.5)

            # Save revision
            page.click("button:has-text('Save revision')")
            time.sleep(1)

            # Click Run Review
            print("Running review...")
            page.click("button:has-text('Run review')")
            page.wait_for_selector(".coverage", timeout=15000)
            time.sleep(1.5)

            # Screenshot 1: Review with findings
            s1_path = os.path.join(SCREENSHOTS_DIR, "01_review_with_findings.png")
            page.screenshot(path=s1_path)
            print("Captured screenshot 1:", s1_path)

            # Check suggestion preview
            print("Testing suggestion preview...")
            inspect_btn = page.locator("button:has-text('Inspect fix')")
            if inspect_btn.count() == 0:
                # Trigger a finding with suggestion
                draft_area.fill("Users save 25% on annual plans without any terms.")
                page.click("button:has-text('Save revision')")
                time.sleep(1)
                page.click("button:has-text('Run review')")
                time.sleep(2)
                inspect_btn = page.locator("button:has-text('Inspect fix')")

            if inspect_btn.count() > 0:
                inspect_btn.first.click()
                page.wait_for_selector("button:has-text('Apply & recheck')", timeout=10000)
                time.sleep(1)
                s2_path = os.path.join(SCREENSHOTS_DIR, "02_suggestion_preview.png")
                page.screenshot(path=s2_path)
                print("Captured screenshot 2:", s2_path)
                page.click("button:has-text('Keep original')")
                time.sleep(0.5)

            # Clean copy with approved wording to allow approval
            print("Setting clean approved wording for approval journey...")
            page.click("button:has-text('Insert corrected sample')")
            time.sleep(0.5)
            page.click("button:has-text('Save revision')")
            time.sleep(1)
            page.click("button:has-text('Run review')")
            time.sleep(2)

            # Submit for approval
            print("Submitting for approval...")
            page.click("button:has-text('Request approval')")
            time.sleep(1)

            # Switch persona to reviewer
            print("Switching to reviewer persona...")
            persona_select = page.locator("select[aria-label='Demo persona']")
            persona_select.select_option("reviewer")
            time.sleep(1)

            # Fill manual confirmation checkbox and reason in .decision-box
            print("Approving exact version in .decision-box...")
            page.locator(".decision-box input[type='checkbox']").check()
            decision_input = page.locator("textarea[placeholder*='Decision rationale']")
            if decision_input.count() > 0:
                decision_input.fill("Verified approved source pack v1 and tested pilot claims.")
            time.sleep(0.5)

            # Click Approve exact version
            page.click("button:has-text('Approve exact version')")
            page.wait_for_selector(".decision-record", timeout=15000)
            time.sleep(1.5)

            # Screenshot 3: Approval screen
            s3_path = os.path.join(SCREENSHOTS_DIR, "03_approval_screen.png")
            page.screenshot(path=s3_path)
            print("Captured screenshot 3:", s3_path)

            # Switch back to creator persona
            print("Switching back to creator and editing approved text to trigger 409...")
            persona_select.select_option("creator")
            time.sleep(1)

            # Edit text to invalidate approval
            current_val = draft_area.input_value()
            draft_area.fill(current_val + " Added unapproved post-approval modification.")
            page.click("button:has-text('Save revision')")
            time.sleep(1.5)

            # The state now shows "This approval no longer authorises export." and readiness is "NOT YET ELIGIBLE"
            # Screenshot 4: Blocked export state
            s4_path = os.path.join(SCREENSHOTS_DIR, "04_blocked_export.png")
            page.screenshot(path=s4_path)
            print("Captured screenshot 4:", s4_path)

            browser.close()
            print("Playwright screenshots completed successfully!")

    finally:
        print("Shutting down processes...")
        backend.terminate()
        frontend.terminate()
        try:
            backend.wait(timeout=5)
            frontend.wait(timeout=5)
        except Exception:
            backend.kill()
            frontend.kill()

if __name__ == "__main__":
    main()
