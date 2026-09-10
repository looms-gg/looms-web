import fs from 'node:fs';
import zlib from 'node:zlib';

let raw = fs.readFileSync(process.argv[2]);
if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw);
const p = JSON.parse(raw.toString());

console.log('sourceURL:', p.meta.sourceURL);
console.log('pages:', p.pages?.map(pg => `${pg.url} (id=${pg.tabID})`).join('\n  '));

// Timeline of compositor frame durations over the capture (1s buckets)
const strings = p.shared.stringArray;
const renderer = p.threads.find(t => t.name === 'Renderer');
const m = renderer.markers;
const start = p.meta.startTime;
const buckets = new Map();
for (let i = 0; i < m.name.length; i++) {
  if (strings[m.name[i]] !== 'WR OS Compositor frame') continue;
  const st = m.startTime[i], en = m.endTime[i];
  if (st == null || en == null) continue;
  const sec = Math.floor((st - start) / 1000);
  const e = buckets.get(sec) || { n: 0, max: 0, over: 0 };
  e.n++;
  if (en - st > e.max) e.max = en - st;
  if (en - st > 20) e.over++;
  buckets.set(sec, e);
}
console.log('\nper-second: (sec, frames, maxMs, frames>20ms)');
for (const [sec, e] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${String(sec).padStart(3)}s  n=${e.n} max=${e.max.toFixed(0)}ms slow=${e.over}`);
}

// UserTiming markers on tab thread (app perf marks) + network loads
const tab = p.threads.find(t => t.processType === 'tab');
const tm = tab.markers;
const ut = new Map();
for (let i = 0; i < tm.name.length; i++) {
  const nm = strings[tm.name[i]];
  if (nm === 'UserTiming' && tm.data[i]?.name) {
    const k = tm.data[i].name;
    const e = ut.get(k) || { n: 0, max: 0 };
    e.n++;
    const d = (tm.endTime[i] ?? 0) - tm.startTime[i];
    if (d > e.max) e.max = d;
    ut.set(k, e);
  }
}
if (ut.size) console.log('\nUserTiming:', [...ut.entries()].map(([k, e]) => `${k}: n=${e.n} max=${e.max.toFixed(1)}ms`).join(', '));

// biggest JS frames overall (inclusive-ish: any frame in JS category with line info)
const stack = p.shared.stackTable, frames = p.shared.frameTable, funcs = p.shared.funcTable;
const jsCount = new Map();  for (let i = 0; i < tab.samples.length; i++) {
    let s = tab.samples.stack[i];
    const seen = new Set();
    while (s != null && !seen.has(s)) {
      seen.add(s);
      const f = stack.frame[s];
      const fi = frames.func[f];
      if (funcs.isJS[fi] && funcs.name[fi] != null) {
        const nm = strings[funcs.name[fi]];
        jsCount.set(nm, (jsCount.get(nm) || 0) + 1);
      }
      s = stack.prefixOffset ? stack.prefixOffset[s] : stack.prefix?.[s];
    }
  }
const topJs = [...jsCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('\ntop JS frames (inclusive, % of tab samples):');
for (const [nm, c] of topJs) console.log(`  ${(100 * c / tab.samples.length).toFixed(1)}%  ${nm}`);
