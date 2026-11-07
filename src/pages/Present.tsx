import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Overview } from '../api'
import { useApi } from '../api'
import { AuditChart, EscalationChart, OnsetChart, ReliabilityChart, StreamingCurves } from '../charts'
import { C } from '../theme'
import { Kpi } from '../ui'
import { AuthorLine, Authors } from '../authors'
import { ConformalPlayground } from './Decision'
import { LiveStream } from './Events'
import { STAGES } from './Workflow'
import type { StageId } from '../workflowDiagram'
import { WorkflowDiagram } from '../workflowDiagram'

function WorkflowSlide() {
  const [active, setActive] = useState<StageId>('decision')
  return (
    <div>
      <div className="wf-figure"><WorkflowDiagram active={active} onSelect={setActive} /></div>
      <p className="lead-sm"><b>{STAGES[active].n} · {STAGES[active].title}:</b> {STAGES[active].body}</p>
    </div>
  )
}

function TitleSlide() {
  const { data } = useApi<Overview>('results/overview.json')
  return (
    <div className="slide-title">
      <div className="eyebrow">100-Car Naturalistic Driving Study · {data?.events ?? 828} real conflicts</div>
      <h1>Calibrated early warning of crash escalation</h1>
      <Authors large />
      <p className="lead">A leakage-free benchmark: what vehicle kinematics can — and cannot — tell a warning system.</p>
      {data && (
        <div className="kpis big">
          <Kpi label="Crashes / near-crashes" value={`${data.crashes} / ${data.near_crashes}`} note={`${data.vehicles} vehicles`} />
          <Kpi label="Onset ROC-AUC" value={data.onset_auc.h0.toFixed(2)} accent={C.blue} />
          <Kpi label="Escalation PR-AUC (+2 s)" value={data.escalation_pr.tau2.toFixed(2)} note={`base rate ${data.escalation_pr.prevalence.toFixed(3)}`} accent={C.amber} />
        </div>
      )}
    </div>
  )
}

const DEMO_EVENT = 8313

const SLIDES: { title: string; note: string; body: ReactNode }[] = [
  { title: '', note: 'Title', body: <TitleSlide /> },
  { title: 'Published crash predictors report > 0.9. Why?', note: 'Leakage',
    body: <><p className="lead">Same model, same 10 Hz samples — only the train/test split changes.</p><AuditChart height={360} /></> },
  { title: 'A leakage-free protocol', note: 'Workflow', body: <WorkflowSlide /> },
  { title: 'Onset is detectable — mainly in the last 2–3 s', note: 'T1',
    body: <><p className="lead">Toggle “RF, no gas”: without the pedal channel the 5 s signal falls to the placebo level.</p><OnsetChart height={340} /></> },
  { title: 'Escalation is decided after the conflict starts', note: 'T2',
    body: <><p className="lead">Crash vs near-crash from kinematics: weak before onset, better once the evasive response unfolds.</p><EscalationChart height={330} /></> },
  { title: 'Scores are not probabilities — until recalibrated', note: 'Calibration', body: <ReliabilityChart height={300} /> },
  { title: 'Choose the miss rate; pay for it in alarms', note: 'Conformal', body: <ConformalPlayground compact /> },
  { title: 'Streaming: one threshold per event, not per step', note: 'Streaming', body: <StreamingCurves height={330} /> },
  { title: 'Live: a real conflict, replayed at 10 Hz', note: 'Live demo',
    body: <><p className="lead">Scored by the model that never saw this vehicle. The outcome is revealed at the end.</p><LiveStream eventId={DEMO_EVENT} compact /></> },
  { title: 'Take-aways', note: 'Conclusions', body: (
    <ol className="takeaways">
      <li><b>Evaluate honestly:</b> group by vehicle — random rows turn 0.64 into 1.00.</li>
      <li><b>Kinematics are weak:</b> onset 2–3 s ahead (ROC-AUC ≤ 0.70); escalation PR-AUC ≤ 0.22.</li>
      <li><b>Skip SMOTE:</b> class weighting wins in 29/30 paired runs.</li>
      <li><b>Calibrate and control:</b> Platt + conformal risk control give a stated miss rate on unseen vehicles.</li>
      <li><b>Streaming:</b> calibrate once on the running maximum, or the guarantee is lost.</li>
      <li><b>Use today:</b> a rule-out screen for conflict triage; escalation warnings need video and driver-state channels.</li>
    </ol>) },
]

export default function Present() {
  const [params] = useSearchParams()
  const [i, setI] = useState(Math.max(0, Math.min(SLIDES.length - 1, (Number(params.get('slide')) || 1) - 1)))
  const nav = useNavigate()
  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(SLIDES.length - 1, x + d))), [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1) }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1) }
      if (e.key === 'Escape') nav('/')
      if (e.key === 'f') document.documentElement.requestFullscreen?.()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [go, nav])
  const s = SLIDES[i]
  return (
    <div className="present">
      <div className="slide">
        {s.title && <h2 className="slide-h">{s.title}</h2>}
        <div className="slide-body">{s.body}</div>
      </div>
      <footer className="slide-foot">
        <button className="btn" onClick={() => go(-1)} disabled={i === 0}>←</button>
        <div className="dots">
          {SLIDES.map((x, k) => <button key={k} className={k === i ? 'on' : ''} title={x.note} onClick={() => setI(k)} />)}
        </div>
        <span className="slide-count">{i + 1} / {SLIDES.length} · {s.note}</span>
        <button className="btn" onClick={() => go(1)} disabled={i === SLIDES.length - 1}>→</button>
        {i > 0 && <AuthorLine />}
        <span className="keys">← → keys · F fullscreen · Esc exit</span>
      </footer>
    </div>
  )
}
