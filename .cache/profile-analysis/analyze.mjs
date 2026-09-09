// Firefox profiler (Gecko) profile analyzer — columnar format v36
// Usage: node analyze.mjs profile.json [--thread substr] [--top N]
import fs from "node:fs"
import zlib from "node:zlib"

const raw = fs.readFileSync(process.argv[2])
const text = process.argv[2].endsWith(".gz") ? zlib.gunzipSync(raw).toString("utf8") : raw.toString("utf8")
const profile = JSON.parse(text)
const args = process.argv.slice(3)
const threadFilter = args.includes("--thread") ? args[args.indexOf("--thread") + 1] : null
const topN = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 25

const shared = profile.shared ?? {}
const stackTable = shared.stackTable
const frameTable = shared.frameTable
const funcTable = shared.funcTable
const resourceTable = shared.resourceTable
const stringArray = shared.stringArray ?? []

const nameOf = (funcIdx) => {
  if (funcIdx == null || funcIdx < 0) return "(unknown)"
  const nm = stringArray[funcTable.name[funcIdx]] ?? "?"
  const resIdx = funcTable.resource?.[funcIdx] ?? -1
  let file = ""
  if (resIdx >= 0 && resourceTable.name) {
    const resName = stringArray[resourceTable.name[resIdx]] ?? ""
    // For JS resources this is often the URL; take last path segment
    file = resName.split(/[?#]/)[0].split("/").slice(-2).join("/")
  }
  const line = funcTable.lineNumber?.[funcIdx]
  return `${nm}${file ? ` (${file}${line != null ? ":" + line : ""})` : ""}`
}

const toMs = (v, unit) => (unit === "ns" ? v / 1e6 : unit === "us" ? v / 1e3 : unit === "s" ? v * 1e3 : v)

let threads = profile.threads ?? []
if (threadFilter) threads = threads.filter((t) => (t.name ?? "").toLowerCase().includes(threadFilter.toLowerCase()))

console.log(`profile: interval=${profile.meta?.interval}ms startTime=${new Date(profile.meta?.startTime).toISOString()}`)

for (const t of threads) {
  const samples = t.samples ?? {}
  const n = samples.length ?? samples.time?.length ?? 0
  if (!n) continue
  const timeUnit = samples.meta?.timeUnit ?? profile.meta?.sampleUnits?.time ?? "ms"
  const interval = toMs(profile.meta?.interval ?? 1, timeUnit === "ms" ? "ms" : timeUnit)

  // self time per stack
  const stackSelf = new Float64Array(stackTable.length)
  let totalTime = 0
  for (let i = 0; i < n; i++) {
    const w = samples.weight?.[i] ?? 1
    const ms = toMs(w, timeUnit)
    totalTime += ms
    const s = samples.stack?.[i]
    if (s != null && s >= 0) stackSelf[s] += ms
  }

  // aggregate per func
  const selfPerFunc = new Map()
  const incPerFunc = new Map()
  const prefixOf = (i) => {
    const off = stackTable.prefixOffset[i] ?? 0
    return off === 0 ? -1 : i - off
  }
  for (let s = 0; s < stackTable.length; s++) {
    const ms = stackSelf[s]
    if (!ms) continue
    // walk prefixes once, distributing self time of this stack to every ancestor func
    let cur = s
    let first = true
    while (cur >= 0) {
      const f = frameTable.func[stackTable.frame[cur]]
      if (first) selfPerFunc.set(f, (selfPerFunc.get(f) ?? 0) + ms)
      incPerFunc.set(f, (incPerFunc.get(f) ?? 0) + ms)
      first = false
      cur = prefixOf(cur)
    }
  }

  const total = totalTime || 1
  console.log(`\n===== thread: ${t.name} (tid ${t.tid}) samples=${n} totalTime=${total.toFixed(0)}ms =====`)

  // markers
  const markers = t.markers ?? {}
  if (markers.length) {
    // Markers come as start rows (phase=2) and end rows (phase=3); phase=0 =
    // instant. This export fills unused slots with stale values, so trust only
    // startTime on start rows and endTime on end rows.
    const open = new Map()
    const closed = new Map()
    for (let i = 0; i < markers.length; i++) {
      const mname = stringArray[markers.name[i]] ?? "?"
      const phase = markers.phase?.[i] ?? 0
      if (phase === 2) {
        const start = markers.startTime?.[i]
        if (start != null && start > 0) {
          const st = open.get(mname) ?? []
          st.push(start)
          open.set(mname, st)
        }
      } else if (phase === 3) {
        const end = markers.endTime?.[i]
        const st = open.get(mname)
        const s = st?.pop()
        if (s != null && end != null && end > 0) {
          const dur = Math.max(0, end - s)
          const a = closed.get(mname) ?? { count: 0, total: 0, max: 0 }
          a.count++
          a.total += dur
          a.max = Math.max(a.max, dur)
          closed.set(mname, a)
        }
      }
    }
    const sorted = [...closed.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 20)
    console.log(`  -- markers (paired intervals, top by total):`)
    for (const [mname, a] of sorted) console.log(`     ${mname}: n=${a.count} total=${a.total.toFixed(0)}ms max=${a.max.toFixed(1)}ms avg=${(a.total / a.count).toFixed(2)}ms`)
    const inst = [...open.entries()].map(([k, v]) => [k, v.length]).filter(([, c]) => c > 0)
    if (inst.length) console.log(`  -- unpaired marker starts:`, inst.map(([k, c]) => `${k}(${c})`).join(" "))
  }

  // event delay = jank indicator
  const eventDelay = samples.eventDelay
  if (eventDelay) {
    let maxDelay = 0
    let over50 = 0
    let over100 = 0
    let over250 = 0
    for (let i = 0; i < n; i++) {
      const d = eventDelay[i] ?? 0
      if (d > maxDelay) maxDelay = d
      if (d > 50) over50++
      if (d > 100) over100++
      if (d > 250) over250++
    }
    console.log(`  -- eventDelay: max=${toMs(maxDelay, timeUnit).toFixed(0)}ms samples>50ms=${over50} >100ms=${over100} >250ms=${over250}`)
  }

  const sortedSelf = [...selfPerFunc.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN)
  console.log(`  -- self time top ${topN}:`)
  for (const [f, ms] of sortedSelf) console.log(`     ${ms.toFixed(0)}ms (${((ms / total) * 100).toFixed(1)}%) ${nameOf(f)}`)

  const sortedInc = [...incPerFunc.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN)
  console.log(`  -- inclusive time top ${topN}:`)
  for (const [f, ms] of sortedInc) console.log(`     ${ms.toFixed(0)}ms (${((ms / total) * 100).toFixed(1)}%) ${nameOf(f)}`)
}
