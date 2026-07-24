const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE_ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  
  // click login button
  await page.waitForSelector('button.bg-red-600.hover\\:bg-red-700'); // Let's try to find login button
  // Actually, wait, let's just log what we see
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
