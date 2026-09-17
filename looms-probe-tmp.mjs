import('playwright').then(async ({chromium}) => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: {width: 1400, height: 1200} });
  await p.goto('https://looms.gg/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  for (let i=0;i<10;i++){ await p.evaluate((y)=>window.scrollTo(0,y), i*700); await p.waitForTimeout(900); }
  const targets = ['bear','dinosaur','orange cat','semi white','elegant uniform','blue button'];
  for (const t of targets) {
    const el = p.locator(`.iso-frame:has(.iso-thumb-figure[aria-label*="${t}" i])`).first();
    try {
      await el.scrollIntoViewIfNeeded();
      await p.waitForTimeout(600);
      const parent = el.locator('xpath=ancestor::*[self::article or self::a or @role="listitem"][1]');
      const shot = (await parent.count()) ? parent : el;
      await shot.screenshot({ path: `/tmp/looms-pieces/tile-${t.replace(/\s+/g,'')}.png` });
    } catch (e) { console.log('miss', t, e.message.slice(0,80)); }
  }
  console.log('done');
  await b.close();
}).catch(e => console.error('ERR', e));
