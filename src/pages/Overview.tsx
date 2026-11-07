import { Link } from 'react-router-dom'
import type { Overview as O } from '../api'
import { useApi } from '../api'
import { C } from '../theme'
import { Card, Kpi, Status } from '../ui'
import { Authors } from '../authors'

const FINDINGS = [
  { n: '1', title: 'The split protocol decides the score', text: 'Random row splits give ROC-AUC 1.00; grouping by vehicle gives 0.64 — same model, same data.', to: '/results/audit' },
  { n: '2', title: 'Onset is detectable 2–3 s ahead', text: 'ROC-AUC 0.70 at onset; the 5 s signal vanishes without the gas pedal. TTC rules reach only 0.54.', to: '/results/onset' },
  { n: '3', title: 'Escalation is decided after onset', text: 'Crash vs near-crash: PR-AUC 0.13 before onset, 0.22 at +2 s, against a 0.078 base rate.', to: '/results/escalation' },
  { n: '4', title: 'Honest alarms are possible', text: 'Conformal risk control holds the missed-crash rate on unseen vehicles, at a cost in alarms.', to: '/decision' },
  { n: '5', title: 'Streaming needs one event-level threshold', text: 'Per-step thresholds alarm on up to 99.5% of near-crashes; a running-max threshold restores control.', to: '/events' },
]

export default function Overview() {
  const { data, error, loading } = useApi<O>('results/overview.json')
  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow">Research demo · 100-Car Naturalistic Driving Study</div>
        <h1 className="title">Calibrated early warning of crash escalation from naturalistic driving data</h1>
        <Authors />
        <p className="lead">A leakage-free benchmark: can vehicle kinematics tell, seconds ahead, whether a traffic conflict will end in a crash —
          and can a warning system state in advance how many crashes it will miss?</p>
        <div className="hero-actions">
          <Link className="btn primary" to="/present">▶ Start presentation</Link>
          <Link className="btn" to="/events">Live event demo</Link>
          <Link className="btn" to="/workflow">Study workflow</Link>
        </div>
      </div>
      <Status loading={loading} error={error} />
      {data && (
        <div className="kpis big">
          <Kpi label="Real conflict events" value={data.events} note={`${data.crashes} crashes · ${data.near_crashes} near-crashes · ${data.vehicles} vehicles`} />
          <Kpi label="Onset detection (RF)" value={data.onset_auc.h0.toFixed(2)} note={`ROC-AUC at onset [${data.onset_auc.h0_ci.map((v) => v.toFixed(2)).join(', ')}] · placebo ${data.onset_auc.placebo.toFixed(2)}`} accent={C.blue} />
          <Kpi label="Crash vs near-crash (RF)" value={data.escalation_pr.tau2.toFixed(2)} note={`PR-AUC at +2 s · base rate ${data.escalation_pr.prevalence.toFixed(3)}`} accent={C.amber} />
          <Kpi label="Leakage inflation" value={<>{data.audit.random_rows.toFixed(2)} <span className="vs">vs</span> {data.audit.grouped_vehicle.toFixed(2)}</>} note="ROC-AUC: random rows vs grouped by vehicle" accent={C.red} />
        </div>
      )}
      <h2>Five findings</h2>
      <div className="findings">
        {FINDINGS.map((f) => (
          <Link key={f.n} to={f.to} className="finding">
            <div className="f-n">{f.n}</div>
            <div><div className="f-title">{f.title}</div><div className="f-text">{f.text}</div></div>
          </Link>
        ))}
      </div>
      <Card title="Data and protocol">
        <ul className="plain">
          <li><b>Data:</b> public 100-Car NDS crash/near-crash set (VTTI, CC0), 16 channels at 10 Hz aligned on the video-coded conflict onset.</li>
          <li><b>T1 onset anticipation:</b> within-event case-crossover — the 5 s before onset vs the same event 15 s earlier, with a placebo.</li>
          <li><b>T2 escalation:</b> crash vs near-crash from the 5 s window ending at −2 … +2 s around onset.</li>
          <li><b>Evaluation:</b> 5-fold cross-validation grouped by vehicle, cluster-bootstrap CIs, thresholds set only on training vehicles.</li>
        </ul>
      </Card>
    </div>
  )
}
