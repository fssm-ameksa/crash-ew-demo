import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter,
  ScatterChart, Tooltip, XAxis, YAxis, ZAxis, LabelList,
} from 'recharts'
import type { AuditRow, EscRow, OnsetRow } from './api'
import { useApi } from './api'
import { C, color, f3 } from './theme'
import { Chips, Seg, Status } from './ui'

const axis = { stroke: C.muted, fontSize: 12 }
const tip = { contentStyle: { fontSize: 12, borderRadius: 8, borderColor: C.grid } }

/** Pivot long rows into {x, seriesA, seriesB, ...} for Recharts. */
function pivot<T>(rows: T[], x: (r: T) => number | null, s: (r: T) => string, v: (r: T) => number) {
  const m = new Map<number, Record<string, number>>()
  rows.forEach((r) => {
    const xv = x(r)
    if (xv == null) return
    const o = m.get(xv) ?? { x: xv }
    o[s(r)] = v(r)
    m.set(xv, o)
  })
  return [...m.values()].sort((a, b) => a.x - b.x)
}

const toggle = (list: string[], s: string) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s])

// ---------------------------------------------------------------- T1 onset
export function OnsetChart({ initial = ['RF', 'XGBoost', 'RF, no gas', 'max decel (no training)', 'max 1/TTC (no training)'], height = 360 }:
  { initial?: string[]; height?: number }) {
  const { data, error, loading } = useApi<OnsetRow[]>('results/onset.json')
  const [sel, setSel] = useState(initial)
  const all = useMemo(() => [...new Set((data ?? []).filter((r) => r.h != null).map((r) => r.series))], [data])
  const rows = useMemo(() => pivot(data ?? [], (r) => r.h, (r) => r.series, (r) => r.auc), [data])
  const placebo = data?.find((r) => r.task === 'placebo' && r.series === 'RF')?.auc
  return (
    <div>
      <Status loading={loading} error={error} />
      <Chips all={all} selected={sel} onToggle={(s) => setSel(toggle(sel, s))} colorOf={color} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 10, right: 24, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="x" type="number" reversed domain={[0, 5]} ticks={[0, 0.5, 1, 2, 3, 5]} {...axis}
            label={{ value: 'Lead time before conflict onset (s)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
          <YAxis domain={[0.45, 0.75]} ticks={[0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75]} {...axis} tickFormatter={(v) => v.toFixed(2)}
            label={{ value: 'ROC-AUC', angle: -90, position: 'insideLeft', fontSize: 12 }} />
          <Tooltip {...tip} formatter={(v) => f3(v as number)} labelFormatter={(l) => `${l} s before onset`} />
          <ReferenceLine y={0.5} stroke={C.ink} strokeDasharray="2 3" label={{ value: 'chance', fontSize: 11, position: 'insideBottomRight' }} />
          {placebo && <ReferenceLine y={placebo} stroke={C.grey} strokeDasharray="6 3"
            label={{ value: `placebo ${placebo.toFixed(2)}`, fontSize: 11, position: 'insideTopRight', fill: C.muted }} />}
          {sel.filter((s) => all.includes(s)).map((s) => (
            <Line key={s} dataKey={s} stroke={color(s)} strokeWidth={s === 'RF' ? 3 : 2}
              strokeDasharray={s.includes('no gas') ? '6 4' : s.includes('no training') ? '2 3' : undefined}
              dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          ))}
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------- T2 escalation
export function EscalationChart({ height = 360 }: { height?: number }) {
  const { data, error, loading } = useApi<{ rows: EscRow[]; prevalence: number }>('results/escalation.json')
  const [fs, setFs] = useState('telemetry+context')
  const [metric, setMetric] = useState<'pr' | 'roc'>('pr')
  const rows = useMemo(() => {
    const r = (data?.rows ?? []).filter((x) => x.features === fs || x.features === 'no training')
      .filter((x) => !(fs !== 'telemetry' && x.series === 'MiniRocket'))
    return pivot(r, (x) => x.tau, (x) => (x.features === 'no training' ? `${x.series} (no training)` : x.series), (x) => x[metric])
  }, [data, fs, metric])
  const series = useMemo(() => [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== 'x')))], [rows])
  const [hidden, setHidden] = useState<string[]>(['Logistic'])
  return (
    <div>
      <Status loading={loading} error={error} />
      <div className="controls">
        <Seg label="Features" value={fs} onChange={setFs} options={[
          { value: 'telemetry', label: 'Telemetry' }, { value: 'telemetry+context', label: 'Telemetry + context' }]} />
        <Seg label="Metric" value={metric} onChange={setMetric} options={[{ value: 'pr', label: 'PR-AUC' }, { value: 'roc', label: 'ROC-AUC' }]} />
      </div>
      <Chips all={series} selected={series.filter((s) => !hidden.includes(s))} onToggle={(s) => setHidden(toggle(hidden, s))} colorOf={color} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 10, right: 24, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="x" type="number" domain={[-2, 2]} ticks={[-2, -1, 0, 1, 2]} {...axis}
            label={{ value: 'Prediction time relative to onset (s)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
          <YAxis {...axis} domain={metric === 'pr' ? [0.05, 0.25] : [0.4, 0.75]} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip {...tip} formatter={(v) => f3(v as number)} labelFormatter={(l) => `τ = ${l} s`} />
          <ReferenceLine x={0} stroke={C.grid} strokeWidth={2} label={{ value: 'onset', fontSize: 11, position: 'top' }} />
          {metric === 'pr' && data && <ReferenceLine y={data.prevalence} stroke={C.ink} strokeDasharray="2 3"
            label={{ value: `prevalence ${data.prevalence.toFixed(3)}`, fontSize: 11, position: 'insideBottomRight' }} />}
          {metric === 'roc' && <ReferenceLine y={0.5} stroke={C.ink} strokeDasharray="2 3" />}
          {series.filter((s) => !hidden.includes(s)).map((s) => (
            <Line key={s} dataKey={s} stroke={color(s)} strokeWidth={s === 'RF' ? 3 : 2}
              strokeDasharray={s.includes('no training') ? '2 3' : undefined} dot={{ r: 3 }} isAnimationActive={false} />
          ))}
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------- split audit
export function AuditChart({ height = 320, compact = false }: { height?: number; compact?: boolean }) {
  const { data, error, loading } = useApi<AuditRow[]>('results/audit.json')
  const [metric, setMetric] = useState<'ROC_AUC' | 'PR_AUC' | 'F1' | 'accuracy'>('ROC_AUC')
  const protos = ['random rows', 'grouped by event', 'grouped by vehicle']
  const shades: Record<string, string> = { 'random rows': C.red, 'grouped by event': C.lblue, 'grouped by vehicle': C.blue }
  const rows = ['RF', 'XGBoost'].map((m) => {
    const o: Record<string, number | string> = { model: m }
    protos.forEach((p) => { const r = data?.find((d) => d.model === m && d.protocol === p); if (r) o[p] = r[metric] })
    return o
  })
  return (
    <div>
      <Status loading={loading} error={error} />
      {!compact && <Seg label="Metric" value={metric} onChange={setMetric} options={[
        { value: 'ROC_AUC', label: 'ROC-AUC' }, { value: 'PR_AUC', label: 'PR-AUC' }, { value: 'F1', label: 'F1' }, { value: 'accuracy', label: 'Accuracy' }]} />}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 24, right: 16, bottom: 8, left: 4 }} barGap={4}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="model" {...axis} />
          <YAxis domain={[0, 1]} {...axis} tickFormatter={(v) => v.toFixed(1)} />
          <Tooltip {...tip} formatter={(v) => f3(v as number)} />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
          {protos.map((p) => (
            <Bar key={p} dataKey={p} fill={shades[p]} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey={p} position="top" fontSize={11} formatter={(v) => (v as number)?.toFixed(2)} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------- SMOTE paired differences
export function SmoteChart({ height = 300 }: { height?: number }) {
  const { data, error, loading } = useApi<{ rows: { features: string; tau: number; seed: number; diff: number }[]; positive: number; n: number }>('results/smote.json')
  const pts = (fs: string, off: number) => (data?.rows ?? []).filter((r) => r.features === fs).map((r) => ({ x: r.tau + off, y: r.diff, seed: r.seed, tau: r.tau }))
  return (
    <div>
      <Status loading={loading} error={error} />
      {data && <p className="lead-sm">Class-weighted RF beats RF+SMOTE in <b>{data.positive}/{data.n}</b> paired runs (Wilcoxon p = 5.6×10⁻⁹).</p>}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="x" type="number" domain={[-2.5, 2.5]} ticks={[-2, -1, 0, 1, 2]} {...axis}
            label={{ value: 'Prediction time relative to onset (s)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
          <YAxis dataKey="y" {...axis} tickFormatter={(v) => v.toFixed(2)} label={{ value: 'PR-AUC: RF − RF+SMOTE', angle: -90, position: 'insideLeft', fontSize: 12 }} />
          <ZAxis range={[60, 60]} />
          <ReferenceLine y={0} stroke={C.ink} />
          <Tooltip {...tip} formatter={(v, n) => (n === 'y' ? f3(v as number) : String(v))} />
          <Scatter name="telemetry" data={pts('telemetry', -0.12)} fill={C.grey} />
          <Scatter name="telemetry + context" data={pts('telemetry+context', 0.12)} fill={C.blue} />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------- calibration
interface CalTab { tau: number; model: string; calibration: string; ROC_AUC: number; Brier: number; BSS: number; ECE: number; cal_intercept: number; cal_slope: number }
interface RelPt { tau: number; model: string; calibration: string; p: number; obs: number; n: number }
export function ReliabilityChart({ height = 340 }: { height?: number }) {
  const { data, error, loading } = useApi<{ table: CalTab[]; reliability: RelPt[] }>('results/calibration.json')
  const [model, setModel] = useState('XGBoost')
  const [tau, setTau] = useState(2)
  const kinds: [string, string][] = [['none', C.grey], ['platt', C.blue], ['isotonic', C.amber]]
  const pts = (k: string) => (data?.reliability ?? []).filter((r) => r.model === model && r.tau === tau && r.calibration === k).sort((a, b) => a.p - b.p)
  const tab = (data?.table ?? []).filter((r) => r.model === model && r.tau === tau)
  const maxv = Math.min(1, Math.max(0.1, ...(data?.reliability ?? []).filter((r) => r.model === model && r.tau === tau).flatMap((r) => [r.p, r.obs])) * 1.1)
  return (
    <div>
      <Status loading={loading} error={error} />
      <div className="controls">
        <Seg label="Model" value={model} onChange={setModel} options={['Logistic', 'RF', 'XGBoost'].map((m) => ({ value: m, label: m }))} />
        <Seg label="τ" value={tau} onChange={setTau} options={[0, 1, 2].map((t) => ({ value: t, label: `${t > 0 ? '+' : ''}${t} s` }))} />
      </div>
      <div className="two-col">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart margin={{ top: 10, right: 16, bottom: 24, left: 4 }}>
            <CartesianGrid stroke={C.grid} />
            <XAxis dataKey="p" type="number" domain={[0, maxv]} {...axis} tickFormatter={(v) => v.toFixed(2)}
              label={{ value: 'Predicted crash probability', position: 'insideBottom', offset: -12, fontSize: 12 }} allowDuplicatedCategory={false} />
            <YAxis dataKey="obs" type="number" domain={[0, maxv]} {...axis} tickFormatter={(v) => v.toFixed(2)}
              label={{ value: 'Observed crash share', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <Tooltip {...tip} formatter={(v) => f3(v as number)} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxv, y: maxv }]} stroke={C.ink} strokeDasharray="4 4" />
            {kinds.map(([k, c]) => (
              <Line key={k} data={pts(k)} dataKey="obs" name={k} stroke={c} strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
            ))}
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
          </LineChart>
        </ResponsiveContainer>
        <table className="tbl">
          <thead><tr><th>Recalibration</th><th>Slope</th><th>Intercept</th><th>BSS</th><th>ROC-AUC</th></tr></thead>
          <tbody>
            {tab.map((r) => (
              <tr key={r.calibration}>
                <td>{r.calibration}</td><td className={Math.abs(r.cal_slope - 1) < 0.2 ? 'good' : 'bad'}>{r.cal_slope.toFixed(2)}</td>
                <td>{r.cal_intercept.toFixed(2)}</td><td className={r.BSS > 0 ? 'good' : 'bad'}>{r.BSS.toFixed(3)}</td><td>{r.ROC_AUC.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Ideal: slope 1, intercept 0, Brier skill score (BSS) &gt; 0. Calibrators are fitted on training vehicles only.</p>
    </div>
  )
}

// ---------------------------------------------------------------- importance
export function ImportanceChart({ height = 360 }: { height?: number }) {
  const { data, error, loading } = useApi<{ task: string; group: string; mean: number; std: number }[]>('results/importance.json')
  const tasks = [...new Set((data ?? []).map((r) => r.task))]
  const [task, setTask] = useState('escalation tau=2')
  const rows = (data ?? []).filter((r) => r.task === task).sort((a, b) => b.mean - a.mean).slice(0, 10)
  return (
    <div>
      <Status loading={loading} error={error} />
      <Seg label="Task" value={task} onChange={setTask} options={tasks.map((t) => ({ value: t, label: t }))} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} layout="vertical" margin={{ top: 10, right: 40, bottom: 20, left: 40 }}>
          <CartesianGrid stroke={C.grid} horizontal={false} />
          <XAxis type="number" {...axis} tickFormatter={(v) => v.toFixed(3)}
            label={{ value: task.startsWith('onset') ? 'ROC-AUC drop when permuted' : 'PR-AUC drop when permuted', position: 'insideBottom', offset: -10, fontSize: 12 }} />
          <YAxis type="category" dataKey="group" width={110} {...axis} />
          <Tooltip {...tip} formatter={(v) => (v as number).toFixed(4)} />
          <Bar dataKey="mean" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rows.map((r, i) => <Cell key={r.group} fill={i === 0 ? C.blue : r.group.startsWith('ctx:') ? C.amber : C.lblue} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="note">Blue: signal channels; amber: real-time context variables. Permutation on held-out vehicles, no refitting.</p>
    </div>
  )
}

// ---------------------------------------------------------------- foundation models
export function FoundationChart({ height = 340 }: { height?: number }) {
  const fm = useApi<{ task: string; x: number; size: string; value: number }[]>('results/foundation.json')
  const on = useApi<OnsetRow[]>('results/onset.json')
  const esc = useApi<{ rows: EscRow[] }>('results/escalation.json')
  const [task, setTask] = useState<'T1' | 'T2'>('T1')
  const rows = useMemo(() => {
    const r: { x: number; s: string; v: number }[] = []
    ;(fm.data ?? []).filter((d) => d.task === task && (task === 'T1' || (d.x >= -2 && d.x <= 2))).forEach((d) => r.push({ x: d.x, s: `Chronos-${d.size}`, v: d.value }))
    if (task === 'T1') (on.data ?? []).filter((d) => ['RF', 'MiniRocket'].includes(d.series) && d.h != null).forEach((d) => r.push({ x: d.h as number, s: d.series, v: d.auc }))
    else (esc.data?.rows ?? []).filter((d) => d.features === 'telemetry' && ['RF', 'MiniRocket'].includes(d.series)).forEach((d) => r.push({ x: d.tau, s: d.series, v: d.pr }))
    return pivot(r, (d) => d.x, (d) => d.s, (d) => d.v)
  }, [fm.data, on.data, esc.data, task])
  const series = ['RF', 'MiniRocket', 'Chronos-small', 'Chronos-base', 'Chronos-large']
  return (
    <div>
      <Status loading={fm.loading} error={fm.error} />
      <Seg label="Task" value={task} onChange={setTask} options={[{ value: 'T1', label: 'T1 onset (ROC-AUC)' }, { value: 'T2', label: 'T2 escalation (PR-AUC)' }]} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 10, right: 24, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="x" type="number" reversed={task === 'T1'} domain={task === 'T1' ? [0, 5] : [-2, 2]} {...axis}
            label={{ value: task === 'T1' ? 'Lead time before onset (s)' : 'Prediction time relative to onset (s)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
          <YAxis {...axis} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(2)} />
          <Tooltip {...tip} formatter={(v) => f3(v as number)} />
          {series.map((s) => (
            <Line key={s} dataKey={s} stroke={color(s)} strokeWidth={s === 'RF' ? 3 : 2} strokeDasharray={s === 'MiniRocket' ? '5 4' : undefined}
              dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          ))}
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="note">Frozen Chronos-T5 encoders (46 M / 200 M / 710 M parameters) with a linear probe. Larger is not better.</p>
    </div>
  )
}

// ---------------------------------------------------------------- streaming policy curves
export function StreamingCurves({ height = 340 }: { height?: number }) {
  const { data, error, loading } = useApi<{ model: string; policy: string; alpha: number; t: number; crash_warned: number; nearcrash_alarmed: number }[]>('results/streaming.json')
  const [model, setModel] = useState('RF')
  const [alpha, setAlpha] = useState(0.2)
  const policies = ['per-time CRC (naive)', 'running-max CRC, deadline +2 s']
  const rows = pivot((data ?? []).filter((d) => d.model === model && d.alpha === alpha && policies.includes(d.policy)).flatMap((d) => [
    { x: d.t, s: `${d.policy.startsWith('per') ? 'Naive' : 'Running-max'}: crashes warned`, v: d.crash_warned },
    { x: d.t, s: `${d.policy.startsWith('per') ? 'Naive' : 'Running-max'}: near-crashes alarmed`, v: d.nearcrash_alarmed },
  ]), (d) => d.x, (d) => d.s, (d) => d.v)
  const lines: [string, string, string | undefined][] = [
    ['Naive: crashes warned', C.red, undefined], ['Naive: near-crashes alarmed', C.red, '5 4'],
    ['Running-max: crashes warned', C.blue, undefined], ['Running-max: near-crashes alarmed', C.blue, '5 4']]
  return (
    <div>
      <Status loading={loading} error={error} />
      <div className="controls">
        <Seg label="Model" value={model} onChange={setModel} options={['RF', 'XGBoost'].map((m) => ({ value: m, label: m }))} />
        <Seg label="α" value={alpha} onChange={setAlpha} options={[0.1, 0.2, 0.3].map((a) => ({ value: a, label: String(a) }))} />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 10, right: 24, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="x" type="number" domain={[-2, 2]} ticks={[-2, -1, 0, 1, 2]} {...axis}
            label={{ value: 'Time relative to conflict onset (s)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
          <YAxis domain={[0, 1]} {...axis} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
          <Tooltip {...tip} formatter={(v) => `${((v as number) * 100).toFixed(1)}%`} />
          <ReferenceLine y={1 - alpha} stroke={C.good} strokeDasharray="3 3" label={{ value: `target: warn ≥ ${Math.round((1 - alpha) * 100)}% of crashes`, fontSize: 11, position: 'insideBottomRight', fill: C.good }} />
          {lines.map(([s, c, d]) => <Line key={s} dataKey={s} stroke={c} strokeDasharray={d} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />)}
          <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: 12 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
