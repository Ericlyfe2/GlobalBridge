const { chromium } = require('playwright');
const { execSync } = require('child_process');

const rand = Math.random().toString(36).slice(2, 8);
const EMAIL = `qa.mobile.${rand}@example.com`;
const PASSWORD = 'TestPass123!';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } }); // iPhone-ish

  const issues = [];
  page.on('pageerror', (err) => issues.push(`[pageerror] ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') issues.push(`[console.error] ${msg.text()}`); });

  // Sign up fresh at mobile width
  await page.goto('http://localhost:3000/auth?mode=signup', { waitUntil: 'networkidle' });
  await page.fill('#full-name', 'QA Mobile');
  await page.click('button[role="radio"]:has-text("Student")');
  await page.fill('#origin', 'Kenya');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/verify-email', { timeout: 8000 });

  execSync(`npx tsx verify_test_user.ts ${EMAIL}`, { cwd: '..\\backend', encoding: 'utf-8' });
  await page.click('button:has-text("I have verified")');
  await page.waitForURL('**/dashboard/**', { timeout: 8000 });
  await page.waitForTimeout(1500);

  const pages = [
    { name: 'dashboard', url: 'http://localhost:3000/dashboard/student' },
    { name: 'opportunities', url: 'http://localhost:3000/opportunities' },
    { name: 'opportunity-detail', url: 'http://localhost:3000/opportunities/8b30b374-3e9c-4434-8929-b22f64f64859' },
    { name: 'housing', url: 'http://localhost:3000/housing' },
    { name: 'settings', url: 'http://localhost:3000/settings' },
  ];

  for (const p of pages) {
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const viewportWidth = window.innerWidth;
      const overflowing = [];
      if (docWidth > viewportWidth + 5) {
        document.querySelectorAll('*').forEach((el) => {
          if (el.scrollWidth > viewportWidth + 5 && overflowing.length < 5) {
            overflowing.push({ tag: el.tagName, cls: (el.className + '').slice(0, 60), width: el.scrollWidth });
          }
        });
      }
      return { docWidth, viewportWidth, hasHorizontalOverflow: docWidth > viewportWidth + 5, culprits: overflowing };
    });
    console.log(`\n=== ${p.name} (375px) ===`);
    console.log(JSON.stringify(overflow, null, 2));
    await page.screenshot({ path: `C:\\Users\\ERICSM~1\\AppData\\Local\\Temp\\claude\\C--Users-ERIC-SMITH-Documents-GitHub-GlobalBridge\\43088b7f-2634-47b9-b41b-ccf6b2542c88\\scratchpad\\mobile-${p.name}.png`, fullPage: true });
  }

  console.log('\n=== ISSUES ===');
  console.log(issues.length ? [...new Set(issues)].join('\n') : 'none');

  await browser.close();
})();
