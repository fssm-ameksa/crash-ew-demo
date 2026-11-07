import { Authors } from '../authors'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApi } from '../api'
import type { ConformalData } from '../conformal'
import { conformal, screening } from '../conformal'
import { C, pct } from '../theme'
import { Card, Kpi, Seg, Status } from '../ui'

const axis = { stroke: C.muted, fontSize: 12 }

/** The live alpha slider: CRC thresholds recomputed in the browser from training-vehicle scores. */
export function ConformalPlayground({ compact = false }: { compact?: boolean }) {
  const [tau, setTau] = useState(2)
  const [model, setModel] = useState('RF')
  const [alpha, setAlpha] = useState(0.2)
  const [mondrian, setMondrian] = useState('none')
  const [groupBy, setGroupBy] = useState('traffic')
  const { data: raw, error, loading } = useApi<ConformalData>(`conformal/tau${tau}_${model}.json`)
  const data = useMemo(() => (raw ? conformal(raw, alpha, mondrian) : null), [raw, alpha, mondrian])
  const o = data?.overall
  return (
    <div>
      <div className="controls">
        <Seg label="Model" value={model} onChange={setModel} options={['RF', 'XGBoost'].map((m) => ({ value: m, label: m }))} />
        <Seg label="Prediction time τ" value={tau} onChange={setTau} options={[0, 1, 2].map((t) => ({ value: t, label: t ? `+${t} s` : 'onset' }))} />
        <Seg label="Thresholds" value={mondrian} onChange={setMondrian} options={[
          { value: 'none', label: 'Marginal' }, { value: 'traffic', label: 'Per traffic' }, { value: 'lighting', label: 'Per lighting' }, { value: 'surface', label: 'Per surface' }]} />
      </div>
      <div className="slider-row">
        <label htmlFor="alpha">Target missed-crash rate α = <b>{alpha.toFixed(2)}</b></label>
        <input id="alpha" type="range" min={0.02} max={0.5} step={0.02} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} />
      </div>
      <Status loading={loading && !data} error={error} />
      {o && (
        <div className="kpis">
          <Kpi label="Crashes missed" value={pct(o.miss_rate)} note={`target ≤ ${pct(alpha, 0)} · ${o.n_pos} crashes`} accent={o.miss_rate <= alpha + 0.03 ? C.good : C.red} />
          <Kpi label="Near-crashes alarmed" value={pct(o.alarm_rate_neg)} note={`of ${o.n_neg} near-crashes`} accent={C.amber} />
          <Kpi label="Crash share when alarmed" value={pct(o.precision)} note="base rate ≈ 7.9%" />
          <Kpi label="Crash share, no alarm" value={pct(o.crash_rate_unflagged)} note="rule-out value" accent={C.blue} />
          {!compact && data?.baselines['threshold 0.5'] && (
            <Kpi label="Fixed 0.5 threshold misses" value={pct(data.baselines['threshold 0.5'].miss_rate)} note="the usual default" accent={C.red} />
          )}
        </div>
      )}
      {data && (
        <div className={compact ? '' : 'two-col'}>
          <ResponsiveContainer width="100%" height={compact ? 380 : 300}>
            <LineChart data={data.curve} margin={{ top: 10, right: 20, bottom: 24, left: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="alpha" type="number" domain={[0, 0.5]} {...axis} label={{ value: 'α (target missed-crash rate)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
              <YAxis domain={[0, 1]} {...axis} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <Tooltip formatter={(v) => pct(v as number)} labelFormatter={(l) => `α = ${l}`} contentStyle={{ fontSize: 12 }} />
              <Line dataKey="miss_rate" name="crashes missed" stroke={C.red} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line dataKey="alarm_rate_neg" name="near-crashes alarmed" stroke={C.amber} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line dataKey="alpha" name="target (y = α)" stroke={C.ink} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              <ReferenceLine x={alpha} stroke={C.blue} strokeWidth={2} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
          {!compact && (
            <div>
              <Seg label="Missed crashes by" value={groupBy} onChange={setGroupBy} options={['traffic', 'lighting', 'surface'].map((g) => ({ value: g, label: g }))} />
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.groups[groupBy]} margin={{ top: 16, right: 16, bottom: 8, left: 4 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="level" {...axis} />
                  <YAxis domain={[0, 0.5]} {...axis} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <Tooltip formatter={(v) => pct(v as number)} contentStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={alpha} stroke={C.ink} strokeDasharray="4 3" label={{ value: `α = ${alpha}`, fontSize: 11, position: 'insideTopRight' }} />
                  <Bar dataKey="miss_rate" name="crashes missed" fill={C.red} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="alarm_rate_neg" name="near-crashes alarmed" fill={C.amber} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
              <p className="note">Switch “Thresholds” to “Per {groupBy}” (Mondrian CRC) to equalise misses across groups.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScreeningPicker() {
  const [model, setModel] = useState('RF')
  const [alpha, setAlpha] = useState(0.2)
  const [mondrian, setMondrian] = useState('none')
  const { data: raw, error } = useApi<ConformalData>('conformal/tau2_' + model + '.json')
  const data = useMemo(() => (raw ? screening(raw, alpha, mondrian) : null), [raw, alpha, mondrian])
  const hist = data ? data.p_hist.map((n, i) => ({ bin: `${data.p_bins[i].toFixed(2)}`, nearcrash: n - data.p_hist_crash[i], crash: data.p_hist_crash[i] })) : []
  const total = data ? data.tiers.reduce((s, t) => s + t.events, 0) : 0
  return (
    <div>
      <div className="controls">
        <Seg label="Model" value={model} onChange={setModel} options={['RF', 'XGBoost'].map((m) => ({ value: m, label: m }))} />
        <Seg label="α" value={alpha} onChange={setAlpha} options={[0.1, 0.2, 0.3].map((a) => ({ value: a, label: String(a) }))} />
        <Seg label="Thresholds" value={mondrian} onChange={setMondrian} options={[{ value: 'none', label: 'Marginal' }, { value: 'traffic', label: 'Per traffic' }]} />
      </div>
      <Status error={error} />
      {data && (
        <div className="two-col">
          <div>
            <table className="tbl">
              <thead><tr><th>Priority tier</th><th>Events</th><th>Share of workload</th><th>Crashes</th><th>Crash share</th></tr></thead>
              <tbody>
                {data.tiers.map((t) => (
                  <tr key={t.tier}><td><b>{t.tier}</b></td><td>{t.events}</td><td>{pct(t.events / total, 0)}</td><td>{t.crashes}</td><td>{pct(t.crash_share)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="note">High = flagged and calibrated p ≥ 0.15 · Standard = flagged · Deferred = not flagged (audit ≥ 10% of these).
              At this setting {pct(data.overall.miss_rate)} of crashes land in Deferred.</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hist} margin={{ top: 10, right: 10, bottom: 24, left: 4 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="bin" {...axis} interval={4} label={{ value: 'Calibrated crash probability (Platt)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
              <YAxis {...axis} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="nearcrash" stackId="a" name="near-crashes" fill={C.grey} isAnimationActive={false} />
              <Bar dataKey="crash" stackId="a" name="crashes" fill={C.red} isAnimationActive={false} />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function Decision() {
  return (
    <div className="page">
      <h1>Decision tools</h1>
      <Authors />
      <p className="lead">Turn a weak score into an honest alarm. Every threshold below is set by conformal risk control on the
        <b> training vehicles only</b>, then checked on vehicles the model never saw — computed live in your browser (τ = prediction time; out-of-fold, seed 0).</p>
      <Card title="Conformal risk control playground" subtitle="Pick the missed-crash rate you can accept; see what it costs in alarms.">
        <ConformalPlayground />
      </Card>
      <Card title="Screening operating-point picker" subtitle="Retrospective triage of conflict events at τ = +2 s: review workload versus missed crashes.">
        <ScreeningPicker />
      </Card>
    </div>
  )
}
