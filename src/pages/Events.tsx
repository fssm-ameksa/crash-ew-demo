import { Authors } from '../authors'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { EventDetail, EventRow, ScoreResult, ScoreStep } from '../api'
import { scoreEvent, useApi } from '../api'
import { C, pct } from '../theme'
import { Badge, Card, Chips, Seg, Status } from '../ui'

const axis = { stroke: C.muted, fontSize: 11 }
const tick = (v: number) => (Math.abs(v) < 2 && v !== 0 ? Number(v).toFixed(2) : Number(v).toFixed(1))
const DEFAULT_CH = ['speed', 'long_acc', 'brake', 'fwd_ttc_inv']
const CH_COLOR: Record<string, string> = { speed: C.blue, long_acc: C.red, lat_acc: C.amber, brake: C.ink, gas: C.teal, fwd_ttc_inv: C.amber, fwd_range: C.grey, yaw_rate: C.lblue }

// ---------------------------------------------------------------- browser
function EventBrowser({ selected, onSelect }: { selected: number | null; onSelect: (id: number) => void }) {
  const [outcome, setOutcome] = useState('all')
  const [light, setLight] = useState('all')
  const [traffic, setTraffic] = useState('all')
  const [q, setQ] = useState('')
  const { data: all, error, loading } = useApi<EventRow[]>('events.json')
  const data = useMemo(() => (all ?? []).filter((r) => r.scorable && (outcome === 'all' || r.crash === (outcome === 'crash' ? 1 : 0)) && (light === 'all' || r.light === light) && (traffic === 'all' || r.traffic === traffic)), [all, outcome, light, traffic])
  const rows = (data ?? []).filter((r) => !q || `${r.event_id} ${r.event_nature} ${r.precipitating_event}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Card title="100-Car events" subtitle={`${rows.length} events with full coverage for live scoring`}>
      <div className="controls col">
        <Seg value={outcome} onChange={setOutcome} options={[{ value: 'all', label: 'All' }, { value: 'crash', label: 'Crashes' }, { value: 'nearcrash', label: 'Near-crashes' }]} />
        <Seg value={light} onChange={setLight} options={[{ value: 'all', label: 'Any light' }, { value: 'daylight', label: 'Day' }, { value: 'dark/dawn/dusk', label: 'Dark/dusk' }]} />
        <Seg value={traffic} onChange={setTraffic} options={[{ value: 'all', label: 'Any traffic' }, { value: 'free flow', label: 'Free flow' }, { value: 'restricted', label: 'Restricted' }]} />
        <input className="search" placeholder="Search id or description…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Status loading={loading} error={error} />
      <div className="event-list">
        {rows.map((r) => (
          <button key={r.event_id} className={`event-item ${selected === r.event_id ? 'on' : ''}`} onClick={() => onSelect(r.event_id)}>
            <div className="ei-top"><b>#{r.event_id}</b><Badge tone={r.crash ? 'crash' : 'neutral'}>{r.crash ? 'crash' : 'near-crash'}</Badge></div>
            <div className="ei-sub">{r.event_nature}</div>
            <div className="ei-meta">{r.light} · {r.traffic} · {r.surface}</div>
          </button>
        ))}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- signals
function SignalPanel({ ev }: { ev: EventDetail }) {
  const [sel, setSel] = useState(DEFAULT_CH)
  const data = useMemo(() => ev.time.map((t, k) => {
    const o: Record<string, number> = { t }
    ev.channels.forEach((c) => { o[c.name] = c.values[k] })
    return o
  }), [ev])
  return (
    <div>
      <Chips all={ev.channels.map((c) => c.name)} selected={sel} onToggle={(s) => setSel(sel.includes(s) ? sel.filter((x) => x !== s) : [...sel, s])} colorOf={(s) => CH_COLOR[s] ?? C.grey} />
      <div className="small-multiples">
        {sel.map((name) => {
          const ch = ev.channels.find((c) => c.name === name)!
          return (
            <div key={name} className="sm">
              <div className="sm-title">{name} <span className="unit">{ch.unit}</span></div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} syncId="signals">
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="t" type="number" domain={[-30, 15]} ticks={[-30, -20, -15, -10, -5, 0, 5, 10, 15]} {...axis} />
                  <YAxis {...axis} width={44} domain={['auto', 'auto']} tickFormatter={tick} />
                  <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l) => `t = ${l} s`} formatter={(v) => Number(v).toFixed(3)} />
                  <ReferenceArea x1={-2} x2={2} fill={C.blue} fillOpacity={0.06} />
                  <ReferenceLine x={0} stroke={C.red} strokeDasharray="4 3" />
                  <Line dataKey={name} stroke={CH_COLOR[name] ?? C.grey} dot={false} strokeWidth={1.6} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>
      <p className="note">Red dashed line: conflict onset (start of the precipitating event, coded from video). Shaded: decision window −2…+2 s.</p>
    </div>
  )
}

// ---------------------------------------------------------------- risk timeline (offline scoring)
function RiskTimeline({ steps, lambda, deadline, height = 260 }: { steps: ScoreStep[]; lambda: number; deadline: number; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={steps} margin={{ top: 10, right: 20, bottom: 24, left: 4 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="t" type="number" domain={[-2, 2]} ticks={[-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]} {...axis}
          label={{ value: 'Decision time relative to onset (s)', position: 'insideBottom', offset: -12, fontSize: 12 }} />
        <YAxis domain={[0, 1]} {...axis} tickFormatter={(v) => v.toFixed(1)} />
        <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => Number(v).toFixed(3)} labelFormatter={(l) => `t = ${l} s`} />
        <ReferenceLine y={lambda} stroke={C.blue} strokeDasharray="5 3" label={{ value: `running-max threshold λ = ${lambda.toFixed(2)}`, fontSize: 11, position: 'insideTopLeft', fill: C.blue }} />
        <ReferenceLine x={0} stroke={C.red} strokeDasharray="4 3" />
        {deadline < 2 && <ReferenceArea x1={deadline} x2={2} fill={C.grey} fillOpacity={0.08} />}
        <Line dataKey="running_max" name="running max of z (alarm statistic)" stroke={C.blue} strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
        <Line dataKey="z" name="z = score vs training near-crashes" stroke={C.lblue} strokeWidth={1.5} dot={{ r: 2 }} isAnimationActive={false} />
        <Line dataKey="p_cal" name="calibrated crash probability" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: 12 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ScorePanel({ ev }: { ev: EventDetail }) {
  const [alpha, setAlpha] = useState(0.2)
  const [deadline, setDeadline] = useState(2)
  const crash = ev.crash
  const data: ScoreResult | null = useMemo(() => (ev.score ? scoreEvent(ev.score, alpha, deadline) : null), [ev, alpha, deadline])
  return (
    <div>
      <div className="controls">
        <Seg label="α" value={alpha} onChange={setAlpha} options={[0.1, 0.2, 0.3].map((a) => ({ value: a, label: String(a) }))} />
        <Seg label="Deadline" value={deadline} onChange={setDeadline} options={[{ value: 0, label: 'by onset' }, { value: 2, label: 'by +2 s' }]} />
      </div>
      {!data && <div className="status">This event lacks full signal coverage from −7 s to +2 s, so it cannot be scored.</div>}
      {data && (
        <>
          <div className="verdicts">
            <div className="verdict">
              <div className="v-label">Running-max CRC (valid)</div>
              {data.first_alarm_rm != null ? <Badge tone="alarm">ALARM at {data.first_alarm_rm} s</Badge> : <Badge tone="ok">no alarm</Badge>}
            </div>
            <div className="verdict">
              <div className="v-label">Per-time CRC (naive)</div>
              {data.first_alarm_naive != null ? <Badge tone="alarm">ALARM at {data.first_alarm_naive} s</Badge> : <Badge tone="ok">no alarm</Badge>}
            </div>
            <div className="verdict">
              <div className="v-label">Peak calibrated probability</div>
              <b>{pct(Math.max(...data.steps.map((s) => s.p_cal)))}</b>
            </div>
            <div className="verdict">
              <div className="v-label">Actual outcome</div>
              <Badge tone={crash ? 'crash' : 'neutral'}>{crash ? 'CRASH' : 'near-crash'}</Badge>
            </div>
          </div>
          <RiskTimeline steps={data.steps} lambda={data.lambda_rm} deadline={deadline} />
          <p className="note">{data.note} Thresholds come from {data.lambda_rm != null ? 'the fold’s' : ''} inner out-of-fold scores of its training vehicles.</p>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- live 10 Hz replay (client-side timer)
interface Sample { t: number; [ch: string]: number }

export function LiveStream({ eventId, compact = false, autoplay = false }: { eventId: number; compact?: boolean; autoplay?: boolean }) {
  const { data: ev } = useApi<EventDetail>(`events/${eventId}.json`)
  const [alpha, setAlpha] = useState(0.2)
  const [speed, setSpeed] = useState(1)
  const [samples, setSamples] = useState<Sample[]>([])
  const [steps, setSteps] = useState<ScoreStep[]>([])
  const [meta, setMeta] = useState<{ lambda_rm: number; crash: number; note: string } | null>(null)
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const timer = useRef<number | null>(null)
  const halt = () => { if (timer.current != null) { window.clearInterval(timer.current); timer.current = null } }

  useEffect(() => halt, [])
  useEffect(() => { halt(); setState('idle'); setSamples([]); setSteps([]); setMeta(null) }, [eventId])

  /** Replays the recorded signals from -10 s to +4 s at 10 Hz (x speed); decisions every 0.5 s from -2 s. */
  const start = () => {
    halt()
    setSamples([]); setSteps([]); setMeta(null); setMsg('')
    if (!ev) return
    if (!ev.score) { setState('error'); setMsg('This event lacks full signal coverage from −7 s to +2 s, so it cannot be scored.'); return }
    const sc = scoreEvent(ev.score, alpha, 2)
    const byT = new Map(sc.steps.map((s) => [s.t.toFixed(1), s]))
    const onset = ev.time.indexOf(0)
    setMeta({ lambda_rm: sc.lambda_rm, crash: ev.crash, note: sc.note })
    setState('running')
    let n = -100
    timer.current = window.setInterval(() => {
      if (n > 40) { halt(); setState('done'); return }
      const t = Math.round(n) / 10
      const o: Sample = { t }
      ev.channels.forEach((c) => { o[c.name] = c.values[onset + n] })
      setSamples((s) => [...s, o])
      const d = byT.get(t.toFixed(1))
      if (d) setSteps((s) => [...s, d])
      n += 1
    }, 100 / speed)
  }
  const stop = () => { halt(); setState('done') }
  // deep link ?autoplay=1 starts the replay as soon as the event is shown
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoplay && ev) start() }, [eventId, autoplay, ev])

  const last = samples.at(-1)
  const lastStep = steps.at(-1)
  const alarm = steps.find((s) => s.alarm_rm)
  const shown = ['speed', 'long_acc', 'brake', 'fwd_ttc_inv']

  return (
    <div className="live">
      <div className="controls">
        <button className="btn primary" onClick={start} disabled={state === 'running'}>{state === 'running' ? 'Streaming…' : '▶ Start live stream'}</button>
        {state === 'running' && <button className="btn" onClick={stop}>Stop</button>}
        <Seg label="α" value={alpha} onChange={setAlpha} options={[0.1, 0.2, 0.3].map((a) => ({ value: a, label: String(a) }))} />
        <Seg label="Speed" value={speed} onChange={setSpeed} options={[1, 2, 4].map((s) => ({ value: s, label: `${s}×` }))} />
      </div>
      {msg && <div className="status err">{msg}</div>}
      <div className="live-grid">
        <div className={`gauge ${alarm ? 'alarm' : ''}`}>
          <div className="g-time">t = {last ? `${last.t.toFixed(1)} s` : '—'}</div>
          <div className="g-label">calibrated crash probability</div>
          <div className="g-value">{lastStep ? pct(lastStep.p_cal) : '—'}</div>
          <div className="g-bar"><div style={{ width: `${Math.min(100, (lastStep?.running_max ?? 0) * 100)}%` }} />
            {meta && <span className="g-thr" style={{ left: `${meta.lambda_rm * 100}%` }} />}</div>
          <div className="g-sub">alarm statistic (running max) vs threshold λ</div>
          {alarm ? <div className="g-alarm">⚠ ESCALATION WARNING at {alarm.t} s</div> : <div className="g-quiet">{last && last.t < -2 ? 'waiting for first decision (−2 s)…' : (state === 'idle' ? 'press ▶ Start to replay this event at 10 Hz' : 'no warning')}</div>}
          {state === 'done' && meta && <div className="g-outcome">Outcome: <Badge tone={meta.crash ? 'crash' : 'neutral'}>{meta.crash ? 'CRASH' : 'near-crash'}</Badge></div>}
        </div>
        <div className="live-charts">
          {shown.map((c) => (
            <div key={c} className="sm">
              <div className="sm-title">{c}</div>
              <ResponsiveContainer width="100%" height={compact ? 70 : 90}>
                <LineChart data={samples} margin={{ top: 2, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="t" type="number" domain={[-10, 4]} hide />
                  <YAxis domain={['auto', 'auto']} width={40} {...axis} tickFormatter={tick} />
                  <ReferenceLine x={0} stroke={C.red} strokeDasharray="4 3" />
                  {alarm && <ReferenceLine x={alarm.t} stroke={C.amber} strokeWidth={2} />}
                  <Line dataKey={c} stroke={CH_COLOR[c] ?? C.grey} dot={false} strokeWidth={1.6} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
          <div className="axis-note">−10 s … +4 s around onset (red dashed); amber: first warning</div>
        </div>
      </div>
      {meta && <p className="note">{meta.note}</p>}
    </div>
  )
}

// ---------------------------------------------------------------- page
export default function Events() {
  // deep links: /events?event=8313&tab=score  ·  /events?event=8313&autoplay=1
  const [params] = useSearchParams()
  const [sel, setSel] = useState<number | null>(Number(params.get('event')) || 8313)
  const { data: ev, error } = useApi<EventDetail>(sel ? `events/${sel}.json` : null)
  const [tab, setTab] = useState<'live' | 'score' | 'signals'>((params.get('tab') as 'live' | 'score' | 'signals') || 'live')
  const autoplay = params.get('autoplay') === '1'
  return (
    <div className="page">
      <h1>Event demos</h1>
      <Authors />
      <p className="lead">Pick a real 100-Car conflict. Each event is scored by the cross-validation model that <b>never saw its vehicle</b>,
        exactly as in the paper — so what you see here is honest, out-of-sample behaviour.</p>
      <div className="events-layout">
        <EventBrowser selected={sel} onSelect={setSel} />
        <div>
          <Status error={error} />
          {ev && (
            <Card title={<>Event #{ev.event_id} <Badge tone={ev.crash ? 'crash' : 'neutral'}>{ev.crash ? 'crash' : 'near-crash'}</Badge></>}
              subtitle={`${ev.meta.event_nature ?? ''} — ${ev.meta.precipitating_event ?? ''}`}
              right={<Seg value={tab} onChange={setTab} options={[{ value: 'live', label: 'Live stream' }, { value: 'score', label: 'Risk timeline' }, { value: 'signals', label: 'Signals' }]} />}>
              <div className="meta-row">
                {['lighting', 'surface', 'weather', 'traffic_density', 'junction', 'locality'].map((k) => (
                  <span key={k} className="meta"><span>{k.replace('_', ' ')}</span>{String(ev.meta[k] ?? '–')}</span>
                ))}
                <span className="meta"><span>driver</span>{ev.meta.gender ?? '–'}, {ev.meta.age ?? '–'}</span>
              </div>
              {tab === 'live' && <LiveStream eventId={ev.event_id} autoplay={autoplay} />}
              {tab === 'score' && <ScorePanel ev={ev} />}
              {tab === 'signals' && <SignalPanel ev={ev} />}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
