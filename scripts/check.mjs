// Cross-check the browser CRC port against the Python numbers (RF, tau=2, alpha=0.2, marginal).
import fs from 'node:fs'
const d = JSON.parse(fs.readFileSync(new URL('../public/data/conformal/tau2_RF.json', import.meta.url)))
const thr = (s, a) => { s = [...s].sort((x, y) => x - y); const m = Math.floor(a * (s.length + 1) - 1); return m < 0 ? -Infinity : s[m] }
const f = d.y.map(() => false)
for (const fc of d.folds) { const t = thr(fc.q.filter((_, i) => fc.y[i] === 1), 0.2); d.y.forEach((_, i) => { if (d.fold[i] === fc.k) f[i] = d.p[i] >= t }) }
const pos = d.y.filter((y) => y === 1).length, neg = d.y.length - pos
console.log('miss', (d.y.filter((y, i) => y === 1 && !f[i]).length / pos).toFixed(4), 'alarm_neg', (d.y.filter((y, i) => y === 0 && f[i]).length / neg).toFixed(4))
