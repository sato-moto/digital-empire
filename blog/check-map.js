const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('https://kumatori-info.com/kumatori-pukupuku-kitchen/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: 'C:/Users/motok/OneDrive/Desktop/pukupuku-check.png', fullPage: true });
  await browser.close();
})();
