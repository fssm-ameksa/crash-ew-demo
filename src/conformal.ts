// Conformal risk control of the missed-crash rate, computed in the browser.
// Port of run_conformal.crc_threshold and the per-fold (cross-conformal) evaluation used in the paper:
// thresholds come only from each fold's training-vehicle scores and are applied to its held-out events.
import type { Summary } from './api'

export interface ConformalData {
  tau: number; model: string
  y: number[]; p: number[]; p_cal: number[]; fold: number[]
  strata: Record<string, string[]>
  folds: { k: number; q: number[]; y: number[]; strata: Record<string, string[]> }[]
}

/** Largest threshold whose calibration miss count keeps (n*FNR + 1)/(n + 1) <= alpha. */
export function crcThreshold(posScores: number[], alpha: number): number {
  const s = [...posScores].sort((a, b) => a - b)
  const m = Math.floor(alpha * (s.length + 1) - 1)
  return m < 0 ? -Infinity : s[m]
}

export function flags(d: ConformalData, alpha: number, mondrian: string): boolean[] {
  const f = new Array<boolean>(d.y.length).fill(false)
  for (const fc of d.folds) {
    if (mondrian === 'none') {
      const thr = crcThreshold(fc.q.filter((_, i) => fc.y[i] === 1), alpha)
      d.y.forEach((_, i) => { if (d.fold[i] === fc.k) f[i] = d.p[i] >= thr })
    } else {
      const lab = d.strata[mondrian], flab = fc.strata[mondrian]
      for (const lev of new Set(lab)) {
        const cq = fc.q.filter((_, i) => fc.y[i] === 1 && flab[i] === lev)
        const thr = cq.length ? crcThreshold(cq, alpha) : -Infinity
        d.y.forEach((_, i) => { if (d.fold[i] === fc.k && lab[i] === lev) f[i] = d.p[i] >= thr })
      }
    }
  }
  return f
}

export function summarize(y: number[], f: boolean[]): Summary {
  let pos = 0, neg = 0, missed = 0, alarmNeg = 0, flagged = 0, flaggedPos = 0, unflagged = 0, unflaggedPos = 0
  y.forEach((yi, i) => {
    if (yi === 1) { pos++; if (!f[i]) missed++ } else { neg++; if (f[i]) alarmNeg++ }
    if (f[i]) { flagged++; flaggedPos += yi } else { unflagged++; unflaggedPos += yi }
  })
  return {
    miss_rate: pos ? missed / pos : 0, alarm_rate_neg: neg ? alarmNeg / neg : 0,
    precision: flagged ? flaggedPos / flagged : null, flag_rate: flagged / y.length,
    crash_rate_unflagged: unflagged ? unflaggedPos / unflagged : null, n_pos: pos, n_neg: neg,
  }
}

export function conformal(d: ConformalData, alpha: number, mondrian: string) {
  const f = flags(d, alpha, mondrian)
  const groups: Record<string, (Summary & { level: string })[]> = {}
  for (const [name, lab] of Object.entries(d.strata)) {
    groups[name] = [...new Set(lab)].sort().map((lev) => {
      const idx = lab.map((l, i) => (l === lev ? i : -1)).filter((i) => i >= 0)
      return { level: lev, ...summarize(idx.map((i) => d.y[i]), idx.map((i) => f[i])) }
    })
  }
  const curve = []
  for (let a = 0.02; a <= 0.5001; a += 0.02) {
    const aa = Math.round(a * 100) / 100
    curve.push({ alpha: aa, ...summarize(d.y, flags(d, aa, mondrian)) })
  }
  return {
    overall: summarize(d.y, f), groups, curve,
    baselines: { 'threshold 0.5': summarize(d.y, d.p.map((p) => p >= 0.5)) } as Record<string, Summary>,
  }
}

export function screening(d: ConformalData, alpha: number, mondrian: string, high = 0.15) {
  const f = flags(d, alpha, mondrian)
  const hi = d.p_cal.map((p) => p >= high)
  const tiers = [
    { tier: 'High', sel: f.map((x, i) => x && hi[i]) },
    { tier: 'Standard', sel: f.map((x, i) => x && !hi[i]) },
    { tier: 'Deferred', sel: f.map((x) => !x) },
  ].map(({ tier, sel }) => {
    const n = sel.filter(Boolean).length
    const c = sel.reduce((s, x, i) => s + (x ? d.y[i] : 0), 0)
    return { tier, events: n, crashes: c, crash_share: n ? c / n : null }
  })
  const bins = Array.from({ length: 26 }, (_, i) => i * 0.02)
  const hist = new Array(25).fill(0), histCrash = new Array(25).fill(0)
  d.p_cal.forEach((p, i) => {
    if (p < 0 || p > 0.5) return
    const b = Math.min(24, Math.floor(p / 0.02))
    hist[b]++; if (d.y[i] === 1) histCrash[b]++
  })
  return { overall: summarize(d.y, f), tiers, p_hist: hist, p_hist_crash: histCrash, p_bins: bins }
}
