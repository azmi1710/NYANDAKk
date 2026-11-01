const { chromium } = require("playwright");
const path = require("path");

const jobs = [
  { html: "mockup-customer.html", out: "assets/ui-customer.png" },
  { html: "mockup-kurir.html",    out: "assets/ui-kurir.png" },
  { html: "mockup-admin.html",    out: "assets/ui-admin.png" },
  { html: "flow.html",            out: "assets/flow-order.png" },
];

(async () => {
  const browser = await chromium.launch();
  for (const j of jobs) {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.goto("file://" + path.resolve(__dirname, j.html));
    await page.waitForTimeout(350); // font settle
    await page.screenshot({ path: path.resolve(__dirname, j.out), fullPage: true });
    const box = await page.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
    console.log(`${j.out}  ->  body ${box.w}x${box.h}`);
    await page.close();
  }
  await browser.close();
  console.log("DONE");
})();
