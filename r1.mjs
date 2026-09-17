import('playwright').then(async ({chromium}) => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: {width: 1000, height: 800} });
  await p.goto('http://localhost:5207/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  // find bear tile
  await p.evaluate(() => window.scrollTo(0, 300));
  await p.waitForTimeout(9000);
  const data = await p.evaluate(() => {
    const out = {};
    for (const f of document.querySelectorAll('.iso-frame')) {
      const card = f.closest('[role="listitem"], a, article') || f.parentElement?.parentElement?.parentElement;
      const name = f.closest('[aria-label]')?.getAttribute('aria-label');
      const bg = f.querySelector('.iso-thumb-figure')?.style.backgroundImage || '';
      const m = bg.match(/url\("(.+?)"\)/);
      out[name||('n'+Math.random())] = m ? m[1] : 'nourl';
    }
    return out;
  });
  const fs = await import('fs');
  for (const [name, url] of Object.entries(data)) {
    const slug = name.includes('Bear') ? 'bear' : name.includes('Dinosaur') ? 'dino' : null;
    if (slug) fs.writeFileSync(`/tmp/variant-${slug}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(Object.keys(data));
  await b.close();
}).catch(e => console.error('ERR', e));
