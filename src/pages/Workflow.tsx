import { Authors } from '../authors'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { C } from '../theme'

export const STAGES = [
  { n: 1, title: 'Data', group: 'data', script: 'Reconstruct100CarNDSData/RawData', to: '/events',
    body: 'Public 100-Car NDS crash/near-crash release (CC0): 828 events — 68 crashes, 760 near-crashes — from 90 vehicles, 10 Hz kinematics and radar, plus video-coded onset and context.' },
  { n: 2, title: 'Preprocessing', group: 'data', script: 'prep.py', to: '/events',
    body: 'Align each event on conflict onset t₀ (−30 to +15 s), causal forward fill, 16 derived channels, gas standardised on the −30…−20 s baseline, only fully covered windows.' },
  { n: 3, title: 'Tasks', group: 'model', script: 'run_t1.py · run_t2.py · run_audit.py', to: '/results/onset',
    body: 'T1 onset anticipation (case-crossover, lead 0–5 s, placebo, no-gas ablation); T2 escalation, crash vs near-crash at −2…+2 s; split-protocol audit on 10 Hz rows.' },
  { n: 4, title: 'Models', group: 'model', script: 'common.py · run_fm.py · run_ttc_baseline.py', to: '/results/foundation',
    body: '87 window summaries + 11 real-time context features. Logistic, RF, RF+SMOTE, XGBoost, MiniRocket, frozen Chronos probes, and training-free TTC / deceleration baselines.' },
  { n: 5, title: 'Evaluation', group: 'model', script: 'common.oof_predict · run_importance.py', to: '/results/escalation',
    body: 'Stratified 5-fold CV grouped by vehicle, 2–3 seeds, fixed hyperparameters. ROC-AUC, PR-AUC, Brier, ECE; cluster bootstrap over vehicles; permutation importance.' },
  { n: 6, title: 'Decision layer', group: 'decision', script: 'run_calibration.py · run_conformal.py · run_alarm.py', to: '/decision',
    body: 'Platt / isotonic recalibration; conformal risk control of the missed-crash rate; Mondrian thresholds by lighting, surface, traffic; streaming running-max CRC. All fitted on training vehicles only.' },
  { n: 7, title: 'Statistics', group: 'release', script: 'stats.py · make_tables.py', to: '/results/smote',
    body: 'Wilcoxon and sign tests, a synthetic CRC validity check, held-out miss and alarm rates, operating-point tables.' },
  { n: 8, title: 'Screening protocol', group: 'release', script: 'paper/screening_protocol.md', to: '/decision',
    body: 'Rule-out triage of conflict events: eligibility, quality checks, calibrated outputs, audit of unflagged events, recalibration triggers.' },
  { n: 9, title: 'Release', group: 'release', script: 'run_all.py', to: '/',
    body: 'One command reproduces every number: tables (Markdown + LaTeX), figures, the LaTeX article and this demo.' },
]
const GROUP_COLOR: Record<string, string> = { data: C.grey, model: C.blue, decision: C.red, release: C.amber }

export default function Workflow() {
  const [active, setActive] = useState(6)
  const s = STAGES.find((x) => x.n === active)!
  return (
    <div className="page">
      <h1>Study workflow</h1>
      <Authors />
      <p className="lead">Nine stages from the raw public data to the released article. Click a stage for details.</p>
      <div className="workflow">
        {STAGES.map((st) => (
          <button key={st.n} className={`wf ${active === st.n ? 'on' : ''}`} onClick={() => setActive(st.n)}
            style={{ borderColor: GROUP_COLOR[st.group], ['--wf' as string]: GROUP_COLOR[st.group] }}>
            <span className="wf-head" style={{ background: GROUP_COLOR[st.group] }}>{st.n} · {st.title}</span>
            <span className="wf-arrow">{st.n % 3 !== 0 ? '→' : st.n < 9 ? '↓' : ''}</span>
          </button>
        ))}
      </div>
      <div className="wf-detail" style={{ borderLeftColor: GROUP_COLOR[s.group] }}>
        <h2>{s.n}. {s.title}</h2>
        <p>{s.body}</p>
        <p className="mono">{s.script}</p>
        <Link className="btn" to={s.to}>See it in the demo →</Link>
      </div>
      <div className="legend-row">
        {Object.entries({ 'Data & preprocessing': C.grey, 'Tasks, models, evaluation': C.blue, 'Decision layer (training vehicles only)': C.red, 'Statistics, protocol, release': C.amber }).map(([k, c]) => (
          <span key={k}><i style={{ background: c }} />{k}</span>
        ))}
      </div>
    </div>
  )
}
