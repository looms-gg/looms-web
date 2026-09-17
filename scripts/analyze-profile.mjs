// Firefox profiler JSON analyzer. Usage:
//   node scripts/analyze-profile.mjs "profile.json[.gz]"
// Gecko profile format (version 36+):
//   - stackTable uses RELATIVE prefix offsets: a node's parent is
//     (index - prefixOffset[index]); offset 0 means root. Treating the offset
//     as an absolute index walks garbage.
//   - marker/sample timestamps share a clock but NOT the zero of
//     meta.startTime; bucket from the earliest timestamp seen instead.
import fs from 'node:fs'
import zlib from 'node:zlib'

let raw = fs.readFileSync(process.argv[2])
if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw)
const p = JSON.parse(raw.toString())

const S = p.shared.stringArray
const st = p.shared.stackTable
const fr = p.shared.frameTable
const fu = p.shared.funcTable

// Native macOS idle plumbing: frames whose whole chain is these = idle.
const IDLE_CHAIN = /mach_msg|psynch|kevent|CFRunLoop|__select|mutexwait|_pthread|RunCurrentEventLoop|_DPSNextEvent|ReceiveNextEventCommon/i

function chainIndices(s0) {
  const out = []
  let s = s0
  while (s != null && s >= 0 && s < st.length && out.length < 500) {
    out.push(s)
    const off = st.prefixOffset[s] || 0
    if (off === 0) break
    s = s - off
  }
  return out
}

function frameName(f) {
  const fi = fr.func[f]
  return fu.name[fi] != null ? S[fu.name[fi]] : `(native f=${f})`
}

function chainFrames(s0) {
  return chainIndices(s0).map(f => frameName(st.frame[f]))
}

let t0 = Infinity, tEnd = -Infinity
for (const t of p.threads) {
  if (!t.samples?.time) continue
  for (const v of t.samples.time) { if (v < t0) t0 = v; if (v > tEnd) tEnd = v }
}
console.log(`capture: ~${((tEnd - t0) / 1000).toFixed(1)}s`)
const sec = v => Math.floor((v - t0) / 1000)

console.log('pages:', (p.pages || []).map(pg => `${pg.url} (tab=${pg.tabID})`).join('\n  '))

function summarizeThread(t) {
  const names = (t.markers?.name?.length ?? 0)
  const mk = new Map()
  for (let i = 0; i < names; i++) {
    const nm = S[t.markers.name[i]]
    const e = mk.get(nm) || { n: 0, tot: 0, max: 0 }
    e.n++
    if (t.markers.endTime?.[i] != null) {
      const d = t.markers.endTime[i] - t.markers.startTime[i]
      e.tot += d
      if (d > e.max) e.max = d
    }
    mk.set(nm, e)
  }
  const ut = new Map()
  for (let i = 0; i < names; i++) {
    if (S[t.markers.name[i]] !== 'UserTiming') continue
    const d = t.markers.data?.[i]
    if (!d?.name) continue
    const e = ut.get(d.name) || { n: 0, tot: 0, max: 0 }
    e.n++
    if (t.markers.endTime?.[i] != null) {
      const dur = t.markers.endTime[i] - t.markers.startTime[i]
      e.tot += dur
      if (dur > e.max) e.max = dur
    }
    ut.set(d.name, e)
  }
  let busy = 0
  const sigs = new Map()
  for (let i = 0; i < t.samples.length; i++) {
    const s0 = t.samples.stack[i]
    if (s0 == null) continue
    const chain = chainFrames(s0)
    const real = chain.filter(n => !IDLE_CHAIN.test(n))
    if (!real.length) continue
    busy++
    sigs.set(real.slice(0, 14).reverse().join(' > '), (sigs.get(real.slice(0, 14).reverse().join(' > ')) || 0) + 1)
  }
  // JS inclusive self/incl counts
  const js = new Map()
  for (let i = 0; i < t.samples.length; i++) {
    const s0 = t.samples.stack[i]
    if (s0 == null) continue
    const idxs = chainIndices(s0)
    for (const [pos, s] of idxs.entries()) {
      const fi = fr.func[st.frame[s]]
      if (fu.isJS?.[fi] === true && fu.name[fi] != null) {
        const nm = S[fu.name[fi]]
        const e = js.get(nm) || { incl: 0, self: 0 }
        e.incl++
        if (pos === 0) e.self++
        js.set(nm, e)
      }
    }
  }
  return { mk, ut, busy, sigs, js }
}

for (const t of p.threads) {
  if (t.processType !== 'tab') continue
  const { mk, ut, busy, sigs, js } = summarizeThread(t)
  console.log(`\n=== tab thread tid=${t.tid} pid=${t.pid} samples=${t.samples.length} busy=${busy} ===`)
  console.log('  markers (totals > 0):')
  for (const [n, e] of [...mk.entries()].filter(([, e]) => e.tot > 0).sort((a, b) => b[1].tot - a[1].tot).slice(0, 12))
    console.log(`    ${n}: n=${e.n} tot=${e.tot.toFixed(0)}ms max=${e.max.toFixed(0)}ms`)
  if (ut.size) {
    console.log('  UserTiming:')
    for (const [n, e] of [...ut.entries()].sort((a, b) => b[1].tot - a[1].tot).slice(0, 15))
      console.log(`    ${n}: n=${e.n} tot=${e.tot.toFixed(0)}ms max=${e.max.toFixed(0)}ms`)
  }
  console.log('  top JS (inclusive % of samples):')
  for (const [n, e] of [...js.entries()].sort((a, b) => b[1].incl - a[1].incl).slice(0, 12))
    console.log(`    ${(100 * e.incl / t.samples.length).toFixed(1)}%  ${n.slice(0, 100)}`)
}

console.log('\nLongTask summary:')
for (const t of p.threads) {
  if (t.processType !== 'tab' || !t.markers) continue
  const durs = []
  for (let i = 0; i < t.markers.name.length; i++) {
    if (S[t.markers.name[i]] === 'LongTask' && t.markers.endTime?.[i] != null)
      durs.push(t.markers.endTime[i] - t.markers.startTime[i])
  }
  if (!durs.length) continue
  const tot = durs.reduce((a, b) => a + b, 0)
  console.log(`  tab tid=${t.tid}: n=${durs.length} tot=${tot.toFixed(0)}ms max=${Math.max(...durs).toFixed(0)}ms`)
}

for (const t of p.threads) {
  if (t.name !== 'Compositor' || !t.markers) continue
  const cft = []
  let skipped = 0
  for (let i = 0; i < t.markers.name.length; i++) {
    const nm = S[t.markers.name[i]]
    if (nm === 'CONTENT_FRAME_TIME' && t.markers.endTime?.[i] != null)
      cft.push({ s: t.markers.startTime[i], d: t.markers.endTime[i] - t.markers.startTime[i] })
    else if (nm === 'SkippedComposite') skipped++
  }
  if (!cft.length && !skipped) continue
  const buck = new Map()
  for (const f of cft) {
    const e = buck.get(sec(f.s)) || { n: 0, max: 0, over: 0 }
    e.n++
    if (f.d > e.max) e.max = f.d
    if (f.d > 20) e.over++
    buck.set(sec(f.s), e)
  }
  console.log(`\n=== GPU compositing tid=${t.tid} (CONTENT_FRAME_TIME per sec) ===`)
  for (const [s, e] of [...buck.entries()].sort((a, b) => a[0] - b[0]))
    console.log(`  +${s}s n=${e.n} max=${e.max.toFixed(0)}ms over20ms=${e.over}`)
  if (skipped) console.log(`  SkippedComposite: ${skipped}`)
}

let busiest = null, bestBusy = -1
for (const t of p.threads) {
  if (t.processType !== 'tab') continue
  let jsSamples = 0
  for (let i = 0; i < t.samples.length; i++) {
    const s0 = t.samples.stack[i]
    if (s0 == null) continue
    for (const s of chainIndices(s0)) {
      const fi = fr.func[st.frame[s]]
      if (fu.isJS?.[fi] === true && fu.name[fi] != null) { jsSamples++; break }
    }
  }
  if (jsSamples > bestBusy) { bestBusy = jsSamples; busiest = t }
}
if (busiest) {
  const { sigs } = summarizeThread(busiest)
  console.log(`\n=== top collapsed stacks (busiest tab tid=${busiest.tid} ===`)
  for (const [k, c] of [...sigs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20))
    console.log(`  ${c}: ${k.slice(0, 400)}`)
}
