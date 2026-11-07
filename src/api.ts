import { useEffect, useState } from 'react'

/** Static data shipped in public/data (built once by scripts/export_static.py). No server needed. */
const BASE = `${import.meta.env.BASE_URL}data/`
const cache = new Map<string, Promise<unknown>>()

export function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, fetch(BASE + path).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${path}`)
      return r.json()
    }))
  }
  return cache.get(path) as Promise<T>
}

/** Load a JSON file from public/data; `null` skips. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!path) return
    let alive = true
    setLoading(true)
    setError(null)
    load<T>(path)
      .then((d) => alive && setData(d))
      .catch((e) => { cache.delete(path); if (alive) setError(String(e)) })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [path])
  return { data, error, loading }
}

// ---------------------------------------------------------------- types
export interface Overview {
  events: number; crashes: number; near_crashes: number; vehicles: number; channels: number; hz: number
  onset_auc: { h0: number; h0_ci: [number, number]; h5: number; placebo: number }
  escalation_pr: { tau2: number; tau2_ci: [number, number]; tau_m2: number; prevalence: number }
  audit: { random_rows: number; grouped_vehicle: number }
}
export interface OnsetRow { task: string; h: number | null; series: string; auc: number; lo: number | null; hi: number | null }
export interface EscRow { tau: number; features: string; series: string; pr: number; roc: number; lo: number | null; hi: number | null }
export interface AuditRow { protocol: string; model: string; ROC_AUC: number; PR_AUC: number; F1: number; accuracy: number }
export interface Summary {
  miss_rate: number; alarm_rate_neg: number; precision: number | null; flag_rate: number
  crash_rate_unflagged: number | null; n_pos: number; n_neg: number
}
export interface EventRow {
  event_id: number; vehicle: number; crash: number; severity: string; event_nature: string; precipitating_event: string
  light: string; traffic: string; surface: string; weather: string; locality: string; age: number | null; gender: string; scorable: boolean
}
export interface ScoreStep {
  t: number; p: number; p_cal: number; z: number; running_max: number; thr_naive: number; alarm_naive: boolean; alarm_rm: boolean
}
export interface EventScore {
  fold: number; n_cal_crashes: number; times: number[]
  steps: { t: number; p: number; p_cal: number; z: number; running_max: number }[]
  thr_naive: Record<string, number[]>                 // alpha -> threshold per decision time
  lambda_rm: Record<string, Record<string, number>>   // deadline -> alpha -> running-max threshold
  note: string
}
export interface EventDetail {
  event_id: number; crash: number; meta: Record<string, string | number | null>; time: number[]
  channels: { name: string; unit: string; values: number[] }[]; scorable: boolean; score?: EventScore
}
export interface ScoreResult {
  lambda_rm: number; steps: ScoreStep[]; first_alarm_naive: number | null; first_alarm_rm: number | null; note: string; fold: number
}

const akey = (a: number) => String(Math.round(a * 100) / 100)
const dkey = (d: number) => d.toFixed(1)

/** Apply both alarm policies for a given alpha and deadline (same logic as the paper's run_alarm.py). */
export function scoreEvent(s: EventScore, alpha: number, deadline: number): ScoreResult {
  const lam = s.lambda_rm[dkey(deadline)][akey(alpha)]
  const thr = s.thr_naive[akey(alpha)]
  let firstNaive: number | null = null
  let firstRm: number | null = null
  const steps = s.steps.map((st, j) => {
    const alarm_naive = st.p >= thr[j]
    const alarm_rm = st.running_max >= lam && st.t <= deadline + 1e-9
    if (alarm_naive && firstNaive == null) firstNaive = st.t
    if (alarm_rm && firstRm == null) firstRm = st.t
    return { ...st, thr_naive: thr[j], alarm_naive, alarm_rm }
  })
  return { lambda_rm: lam, steps, first_alarm_naive: firstNaive, first_alarm_rm: firstRm, note: s.note, fold: s.fold }
}
