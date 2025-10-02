import os
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    # Get the absolute path to the index.html file
    # This is necessary because we're running a local file, not a web server.
    file_path = f"file://{os.path.abspath('index.html')}"

    # 1. Navigate to the game page.
    page.goto(file_path)

    # 2. Assert that the canvas is now larger (800x800).
    canvas = page.locator("#dartboard")
    expect(canvas).to_have_attribute("width", "800")
    expect(canvas).to_have_attribute("height", "800")

    # 3. Take a screenshot of the initial enlarged game board.
    page.screenshot(path="jules-scratch/verification/01_enlarged_board.png")

    # 4. Select the "Chainsaw" weapon.
    # We use get_by_role for robustness.
    chainsaw_button = page.get_by_role("button", name="Tronçonneuse 🪚")
    chainsaw_button.click()

    # 5. Assert that the chainsaw button is now active.
    expect(chainsaw_button).to_have_class("weapon-button active")

    # 6. "Throw" the chainsaw by clicking on the canvas.
    # We click slightly off-center to make the projectile visible.
    canvas.click(position={'x': 450, 'y': 450})

    # 7. Wait for the animation to complete. A simple sleep is sufficient here
    # since there's no network activity to wait for.
    page.wait_for_timeout(1000) # 1 second should be enough for the animation

    # 8. Take a final screenshot to show the chainsaw on the board.
    page.screenshot(path="jules-scratch/verification/02_chainsaw_thrown.png")

# Main execution block
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    run_verification(page)
    browser.close()

print("Verification script executed successfully. Screenshots created.")