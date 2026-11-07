import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Authors } from '../authors'
import type { StageId } from '../workflowDiagram'
import { WorkflowDiagram } from '../workflowDiagram'

export const STAGES: Record<StageId, { n: string; title: string; body: string; script: string; to: string; color: string }> = {
  data: { n: 'Stage 1', title: 'Data', color: '#8c8c8c', to: '/events', script: 'Reconstruct100CarNDSData/RawData',
    body: 'Public 100-Car NDS crash/near-crash release (CC0): 828 events (68 crashes, 760 near-crashes) from 90 vehicles. Telemetry (speed, pedals, yaw rate), forward and rear radar (range, closing speed, TTC), real-time context (weather, lighting, road) and the video-coded event table (onset t0, outcome).' },
  prep: { n: 'Stage 2', title: 'Preprocessing', color: '#8aa6c4', to: '/events', script: 'prep.py',
    body: 'Every event is aligned on conflict onset t0 (start of the precipitating event), resampled to 10 Hz with causal forward filling, and turned into 16 channels; the gas pedal is standardised on the −30…−20 s baseline. Only windows fully covered by the original recording are used.' },
  tasks: { n: 'Stage 3', title: 'Tasks', color: '#4a4f57', to: '/results/onset', script: 'run_t1.py · run_t1_sensitivity.py · run_t2.py · run_audit.py',
    body: 'T1 onset anticipation: case-crossover pairs (5 s before onset vs the same event 15 s earlier), with a placebo and a no-gas ablation. T2 escalation: crash vs near-crash from windows ending −2…+2 s around t0. Split-protocol audit: 65,040 row-level instances scored under random vs event- and vehicle-grouped splits.' },
  models: { n: 'Stage 4', title: 'Models', color: '#3d7fc4', to: '/results/foundation', script: 'common.py · run_fm.py · run_ttc_baseline.py',
    body: '87 window summaries + 11 real-time context features. Learned models: logistic regression, random forest, XGBoost, RF + SMOTE. Time-series probes: MiniRocket and frozen Chronos-T5 (small/base/large). Training-free kinematic baselines: peak inverse TTC and deceleration.' },
  eval: { n: 'Stage 5', title: 'Evaluation', color: '#2e7d32', to: '/results/escalation', script: 'common.oof_predict · run_importance.py',
    body: 'Stratified 5-fold cross-validation grouped by vehicle (2–3 seeds, fixed hyperparameters); ROC-AUC, PR-AUC, Brier and ECE on pooled out-of-fold predictions; 95% cluster-bootstrap CIs over vehicles; grouped permutation importance on held-out vehicles.' },
  decision: { n: 'Stage 6', title: 'Decision layer', color: '#d9822b', to: '/decision', script: 'run_calibration.py · run_conformal.py · run_alarm.py',
    body: 'Platt and isotonic recalibration; conformal risk control of the missed-crash rate — marginal, Mondrian (per lighting, surface, traffic) and streaming with one running-maximum threshold per event. All fitted on inner out-of-fold scores of the training vehicles only.' },
  stats: { n: 'Stage 7', title: 'Statistics', color: '#2a6fb0', to: '/results/smote', script: 'stats.py · make_tables.py',
    body: 'Paired Wilcoxon and sign tests (e.g. class weighting vs SMOTE), a synthetic check that the CRC formula hits its target, and held-out miss and alarm rates for every operating point.' },
  protocol: { n: 'Stage 8', title: 'Event-screening protocol', color: '#3fa34d', to: '/decision', script: 'paper/screening_protocol.md',
    body: 'Rule-out triage of conflict events: eligibility rules, calibrated outputs and priority tiers, a random audit of unflagged events to measure the realised miss rate, and recalibration triggers.' },
}

export default function Workflow() {
  const [active, setActive] = useState<StageId>('decision')
  const s = STAGES[active]
  return (
    <div className="page wide">
      <h1>Study workflow</h1>
      <Authors />
      <p className="lead">From public naturalistic data to an event-screening protocol in eight stages. Click a stage for details.</p>
      <div className="wf-figure">
        <WorkflowDiagram active={active} onSelect={setActive} />
      </div>
      <div className="wf-detail" style={{ borderLeftColor: s.color }}>
        <div className="eyebrow">{s.n}</div>
        <h2>{s.title}</h2>
        <p>{s.body}</p>
        <p className="mono">{s.script}</p>
        <Link className="btn" to={s.to}>See it in the demo →</Link>
      </div>
    </div>
  )
}
