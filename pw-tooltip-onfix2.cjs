const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  await page.goto('http://localhost:5183/agent-next-gen-v3/');
  await page.waitForTimeout(800);
  await page.click('text=Launch');
  await page.waitForTimeout(6000);
  await page.getByText('Go Available').click().catch(()=>{});
  await page.waitForTimeout(600);
  await page.getByText('Agent Workspace 2.0 | Phase 1', { exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByText('Agent Workspace 2.0 | Phase 2', { exact: true }).click();
  await page.waitForTimeout(2500);
  await page.getByText('Go Available').click().catch(()=>{});
  await page.waitForTimeout(800);
  await page.mouse.click(30, 74);
  await page.waitForTimeout(600);
  await page.getByText('Dial Pad').click();
  await page.waitForTimeout(600);
  await page.fill('input[placeholder="(555) 555-5555"]', '2125551234');
  await page.click('text=Dial Number');
  await page.waitForTimeout(4000);
  // Click to open the popover
  await page.mouse.click(1623, 131);
  await page.waitForTimeout(500);
  // Move away then back onto the trigger to re-trigger hover/tooltip while popover stays open
  await page.mouse.move(900, 500);
  await page.waitForTimeout(300);
  await page.mouse.move(1623, 131);
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/tooltip-onfix2.png', clip: { x: 1250, y: 80, width: 450, height: 200 } });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
