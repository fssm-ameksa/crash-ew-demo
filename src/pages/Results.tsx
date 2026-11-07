import { Authors } from '../authors'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { AuditChart, EscalationChart, FoundationChart, ImportanceChart, OnsetChart, ReliabilityChart, SmoteChart, StreamingCurves } from '../charts'
import { Card } from '../ui'

const TABS = [
  { id: 'onset', label: 'Onset anticipation', title: 'Conflict onset is detectable, mainly at short lead',
    sub: 'T1 case-crossover: ROC-AUC of the 5 s window ending h s before onset vs a control window 15 s earlier. Toggle models; dashed = no gas pedal; dotted = training-free.',
    body: <OnsetChart /> },
  { id: 'escalation', label: 'Escalation', title: 'Escalation becomes predictable only around and after onset',
    sub: 'T2: crash vs near-crash from the 5 s window ending at τ. Dotted line: base rate.', body: <EscalationChart /> },
  { id: 'audit', label: 'Split audit', title: 'The split protocol alone decides the headline score',
    sub: 'Same model, same 65,040 row-level samples: random rows vs grouped by event vs grouped by vehicle.', body: <AuditChart /> },
  { id: 'smote', label: 'SMOTE', title: 'Class weighting beats synthetic oversampling',
    sub: 'Paired PR-AUC difference, class-weighted RF minus RF+SMOTE, per prediction time and seed. Above zero favours class weighting.', body: <SmoteChart /> },
  { id: 'calibration', label: 'Calibration', title: 'Platt scaling restores calibration; isotonic overfits',
    sub: 'Reliability of raw, Platt and isotonic scores (out-of-fold).', body: <ReliabilityChart /> },
  { id: 'streaming', label: 'Streaming policies', title: 'Per-step thresholds break the guarantee',
    sub: 'Cumulative share of crashes warned (solid) and near-crashes alarmed (dashed): naive per-time CRC vs running-max CRC (deadline +2 s).', body: <StreamingCurves /> },
  { id: 'importance', label: 'Signals', title: 'Which signals carry the warning',
    sub: 'Grouped permutation importance on held-out vehicles (RF).', body: <ImportanceChart /> },
  { id: 'foundation', label: 'Foundation models', title: 'Frozen time-series foundation models do not beat simple trees',
    sub: 'Chronos-T5 small / base / large linear probes vs RF and MiniRocket.', body: <FoundationChart /> },
]

export default function Results() {
  const { tab } = useParams()
  const t = TABS.find((x) => x.id === tab)
  if (!t) return <Navigate to="/results/onset" replace />
  return (
    <div className="page">
      <h1>Results explorer</h1>
      <Authors />
      <nav className="subtabs">
        {TABS.map((x) => <NavLink key={x.id} to={`/results/${x.id}`} className={({ isActive }) => (isActive ? 'on' : '')}>{x.label}</NavLink>)}
      </nav>
      <Card title={t.title} subtitle={t.sub}>{t.body}</Card>
    </div>
  )
}
