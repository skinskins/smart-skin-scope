const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    page.on('pageerror', err => {
      console.log('PAGE_ERROR:', err.toString());
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('CONSOLE_ERROR:', msg.text());
      }
    });

    console.log('Navigating to http://localhost:8080/dashboard...');
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle0' });
    
    const cards = await page.$$('.premium-card');
    for (const card of cards) {
      const text = await page.evaluate(el => el.textContent, card);
      if (text.includes('Activité')) {
        console.log('Clicking Activité card...');
        await card.click();
        break;
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));
    console.log('Done.');
    await browser.close();
  } catch (e) {
    console.log('SCRIPT_ERROR:', e);
  }
})();
