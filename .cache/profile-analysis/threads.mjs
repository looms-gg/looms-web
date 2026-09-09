// List all threads with sample counts and durations
import fs from "node:fs"
const profile = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))

const toMs = (t, v) => {
  const u = t?.samples?.meta?.timeUnit ?? "ms"
  return u === "ns" ? v / 1e6 : u === "us" ? v / 1e3 : u === "s" ? v * 1e3 : v
}

const rows = []
for (const proc of profile.processes ?? []) {
  const pid = proc.pid ?? proc.pidString ?? "?"
  for (const t of proc.threads ?? []) {
    const samples = t.samples?.data ?? []
    if (samples.length === 0) continue
    let dur = 0
    for (const s of samples) dur += toMs(t, s[2] ?? 1)
    rows.push({ pid, name: t.name, tid: t.tid ?? t.tidString, n: samples.length, dur })
  }
}
rows.sort((a, b) => b.dur - a.dur)
for (const r of rows.slice(0, 40)) {
  console.log(`pid=${r.pid} tid=${r.tid} ${r.name}: samples=${r.n} captured=${r.dur.toFixed(0)}ms`)
}
console.log(`total threads with samples: ${rows.length}`)
