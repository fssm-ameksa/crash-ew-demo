// Study workflow diagram (8 stages in 6 columns), drawn as one SVG so it scales cleanly on screen and projector.
// Each stage is clickable/focusable; the parent page shows its details.
import type { KeyboardEvent, ReactNode } from 'react'

export type StageId = 'data' | 'prep' | 'tasks' | 'models' | 'eval' | 'decision' | 'stats' | 'protocol'

const INK = '#1d2430', MUTED = '#5b6472', GRID = '#8b97a6', RED = '#d1495b', BLUE = '#2a6fb0'
const F = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

function T({ x, y, s = 26, w = 400, c = INK, a = 'middle', children }: { x: number; y: number; s?: number; w?: number; c?: string; a?: 'start' | 'middle' | 'end'; children: ReactNode }) {
  return <text x={x} y={y} fontSize={s} fontWeight={w} fill={c} textAnchor={a} fontFamily={F}>{children}</text>
}

function Arrow({ x1, y1, x2, y2, dark = false }: { x1: number; y1: number; x2: number; y2: number; dark?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={dark ? INK : GRID} strokeWidth={dark ? 7 : 4} markerEnd={`url(#${dark ? 'ahDark' : 'ah'})`} />
}

function Stage({ id, active, onSelect, label, children }: { id: StageId; active: StageId; onSelect: (s: StageId) => void; label: string; children: ReactNode }) {
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id) } }
  return (
    <g role="button" tabIndex={0} aria-label={label} aria-pressed={active === id} className={`wf-stage ${active === id ? 'on' : ''}`}
      onClick={() => onSelect(id)} onKeyDown={key} style={{ cursor: 'pointer' }}>
      {children}
    </g>
  )
}

function Header({ x, stage, title, sub }: { x: number; stage: string; title: string; sub?: string }) {
  return (
    <g>
      <T x={x} y={70} s={25} w={500} c={MUTED}>{stage}</T>
      <T x={x} y={116} s={37} w={800}>{title}</T>
      {sub && <T x={x} y={156} s={24} c={MUTED}>{sub}</T>}
    </g>
  )
}

const TASKS = [
  { y: 198, title: 'T1 Onset anticipation', l1: 'case-crossover pairs', l2: 'placebo + no-gas ablation' },
  { y: 486, title: 'T2 Escalation', l1: 'crash vs near-crash', l2: 'windows around t0' },
  { y: 773, title: 'Split-protocol audit', l1: 'row-level instances', l2: 'random vs grouped splits' },
]
const MODELS = [
  { y: 198, title: 'Learned models', l1: 'Logistic, RF, XGBoost', l2: 'RF + SMOTE', fill: '#d8e9f7', stroke: '#5aa2d8' },
  { y: 486, title: 'Time-series probes', l1: 'MiniRocket', l2: 'Chronos (frozen)', fill: '#b9d4ef', stroke: '#3d7fc4' },
  { y: 773, title: 'Kinematic baselines', l1: 'training-free', l2: 'kinematic scores', fill: '#9fbbda', stroke: '#2a5b8f' },
]
const INPUTS = [
  { y: 262, name: 'Telemetry', sub: 'speed, pedals, yaw rate' },
  { y: 477, name: 'Radar', sub: 'range, closing speed, TTC' },
  { y: 692, name: 'Context', sub: 'weather, lighting, road' },
  { y: 907, name: 'Event table', sub: 'onset t0, outcome' },
]

export function WorkflowDiagram({ active, onSelect }: { active: StageId; onSelect: (s: StageId) => void }) {
  return (
    <svg viewBox="0 0 2580 1060" role="group" aria-label="Study workflow: data, preprocessing, tasks, models, benchmarking, outcome" className="wf-diagram">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={GRID} /></marker>
        <marker id="ahDark" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill={INK} /></marker>
      </defs>

      {/* ---------------- headers */}
      <Header x={212} stage="STAGE 1" title="DATA" sub="100-Car NDS (public)" />
      <Header x={600} stage="STAGE 2" title="PREPROCESSING" />
      <Header x={1023} stage="STAGE 3" title="TASKS" />
      <Header x={1482} stage="STAGE 4" title="MODELS" sub="window summaries + context" />
      <Header x={1978} stage="STAGES 5–7" title="BENCHMARKING" />
      <Header x={2407} stage="STAGE 8" title="OUTCOME" />

      {/* ---------------- stage 1: data inputs */}
      <Stage id="data" active={active} onSelect={onSelect} label="Stage 1, data">
        <rect x={40} y={180} width={345} height={860} fill="transparent" className="wf-hit" rx={20} />
        {/* gauge */}
        <path d="M170 268 A45 45 0 1 1 254 268" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        <line x1={212} y1={262} x2={234} y2={230} stroke={RED} strokeWidth={6} strokeLinecap="round" />
        <circle cx={212} cy={262} r={8} fill={INK} />
        {/* radar */}
        <circle cx={190} cy={473} r={9} fill={INK} />
        {[20, 33, 46].map((r) => <path key={r} d={`M${190 + r * 0.6} ${473 - r * 0.8} A${r} ${r} 0 0 1 ${190 + r * 0.6} ${473 + r * 0.8}`} fill="none" stroke={BLUE} strokeWidth={6} strokeLinecap="round" />)}
        {/* cloud */}
        <circle cx={196} cy={668} r={17} fill="#f0b43c" />
        <path d="M184 712 h66 a21 21 0 0 0 2-42 a30 30 0 0 0-57-8 a22 22 0 0 0-11 50 z" fill="#e8edf5" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        {/* table */}
        <rect x={169} y={866} width={86} height={66} rx={7} fill="white" stroke={INK} strokeWidth={5} />
        <rect x={171.5} y={868.5} width={81} height={16} fill="#5aa2d8" />
        <line x1={169} y1={906} x2={255} y2={906} stroke={INK} strokeWidth={2.5} />
        <line x1={200} y1={884} x2={200} y2={932} stroke={INK} strokeWidth={2.5} />
        <line x1={228} y1={884} x2={228} y2={932} stroke={INK} strokeWidth={2.5} />
        {INPUTS.map((it, i) => (
          <g key={it.name}>
            <T x={212} y={[333, 548, 763, 978][i]} s={29} w={700}>{it.name}</T>
            <T x={212} y={[367, 582, 797, 1012][i]} s={23} c={MUTED}>{it.sub}</T>
          </g>
        ))}
      </Stage>
      {/* bracket into preprocessing */}
      {[250, 465, 680, 895].map((y) => <line key={y} x1={335} y1={y} x2={400} y2={y} stroke={GRID} strokeWidth={4} />)}
      <line x1={400} y1={250} x2={400} y2={895} stroke={GRID} strokeWidth={4} />
      <Arrow x1={400} y1={605} x2={436} y2={605} />

      {/* ---------------- stage 2: preprocessing */}
      <Stage id="prep" active={active} onSelect={onSelect} label="Stage 2, preprocessing">
        <rect x={441} y={198} width={318} height={818} rx={22} fill="#eef3f8" stroke="#8aa6c4" strokeWidth={4} className="wf-box" />
        {[['#7fb3e0', 300], ['#3d7fc4', 336], ['#25456b', 372]].map(([c, y]) => (
          <path key={String(y)} d={`M520 ${y} q20 -18 40 0 t40 0 t40 0 t40 0`} fill="none" stroke={String(c)} strokeWidth={6} strokeLinecap="round" />
        ))}
        <line x1={606} y1={268} x2={606} y2={398} stroke={RED} strokeWidth={4} strokeDasharray="8 7" />
        <T x={606} y={430} s={25} w={600} c={RED}>t0</T>
        {['Align on onset t0', 'Resample to 10 Hz', 'Causal filling', '16 channels', 'Full-coverage', 'windows only'].map((l, i) => (
          <T key={l} x={600} y={[530, 586, 642, 698, 754, 789][i]} s={27} w={650}>{l}</T>
        ))}
      </Stage>
      {TASKS.map((t) => <Arrow key={t.y} x1={760} y1={t.y + 120} x2={824} y2={t.y + 120} />)}

      {/* ---------------- stage 3: tasks */}
      <Stage id="tasks" active={active} onSelect={onSelect} label="Stage 3, tasks">
        {TASKS.map((t) => (
          <g key={t.title}>
            <rect x={829} y={t.y} width={388} height={243} rx={22} fill="#f3f4f6" stroke="#4a4f57" strokeWidth={4} className="wf-box" />
            <T x={1023} y={t.y + 70} s={30} w={700}>{t.title}</T>
            <T x={1023} y={t.y + 132} s={25} c={MUTED}>{t.l1}</T>
            <T x={1023} y={t.y + 171} s={25} c={MUTED}>{t.l2}</T>
          </g>
        ))}
      </Stage>
      {/* bus from tasks to models */}
      {TASKS.map((t) => <line key={t.y} x1={1217} y1={t.y + 120} x2={1253} y2={t.y + 120} stroke={GRID} strokeWidth={4} />)}
      <line x1={1253} y1={318} x2={1253} y2={893} stroke={GRID} strokeWidth={4} />
      {MODELS.map((m) => <Arrow key={m.y} x1={1253} y1={m.y + 120} x2={1283} y2={m.y + 120} />)}

      {/* ---------------- stage 4: models */}
      <Stage id="models" active={active} onSelect={onSelect} label="Stage 4, models">
        {MODELS.map((m) => (
          <g key={m.title}>
            <rect x={1287} y={m.y} width={388} height={243} rx={22} fill={m.fill} stroke={m.stroke} strokeWidth={5} className="wf-box" />
            <T x={1482} y={m.y + 70} s={30} w={700}>{m.title}</T>
            <T x={1482} y={m.y + 132} s={25}>{m.l1}</T>
            <T x={1482} y={m.y + 171} s={25}>{m.l2}</T>
          </g>
        ))}
      </Stage>
      {MODELS.map((m) => <Arrow key={m.y} x1={1676} y1={m.y + 120} x2={1741} y2={m.y + 120} />)}

      {/* ---------------- stages 5-7: benchmarking */}
      <rect x={1747} y={198} width={462} height={818} rx={30} fill="#e9e9e9" stroke="#9a9a9a" strokeWidth={5} />
      <rect x={1772} y={226} width={412} height={762} rx={20} fill="white" stroke="#cfcfcf" strokeWidth={3} />
      <Stage id="eval" active={active} onSelect={onSelect} label="Stage 5, evaluation">
        <rect x={1780} y={282} width={396} height={180} fill="transparent" className="wf-hit" rx={14} />
        <circle cx={1849} cy={367} r={59} fill="#7cc47f" stroke="#2e7d32" strokeWidth={5} />
        <rect x={1821} y={366} width={13} height={22} fill="white" stroke={INK} strokeWidth={3} />
        <rect x={1839} y={350} width={13} height={38} fill="white" stroke={INK} strokeWidth={3} />
        <rect x={1857} y={334} width={13} height={54} fill="white" stroke={INK} strokeWidth={3} />
        <path d="M1862 383 l10 12 l18 -24" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <T x={1930} y={336} s={30} w={700} a="start">5 Evaluation</T>
        <T x={1930} y={376} s={24} c={MUTED} a="start">vehicle-grouped CV</T>
        <T x={1930} y={410} s={24} c={MUTED} a="start">bootstrap CIs</T>
        <T x={1930} y={444} s={24} c={MUTED} a="start">perm. importance</T>
      </Stage>
      <Stage id="decision" active={active} onSelect={onSelect} label="Stage 6, decision layer">
        <rect x={1780} y={522} width={396} height={180} fill="transparent" className="wf-hit" rx={14} />
        <circle cx={1849} cy={606} r={59} fill="#f2b06f" stroke="#d9822b" strokeWidth={5} />
        <path d="M1814 634 C1832 634 1834 572 1850 572 C1866 572 1868 634 1886 634" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <line x1={1812} y1={636} x2={1888} y2={636} stroke={INK} strokeWidth={4} />
        <line x1={1862} y1={566} x2={1862} y2={644} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <T x={1930} y={576} s={30} w={700} a="start">6 Decision layer</T>
        <T x={1930} y={616} s={24} c={MUTED} a="start">recalibration</T>
        <T x={1930} y={650} s={24} c={MUTED} a="start">CRC: marginal,</T>
        <T x={1930} y={684} s={24} c={MUTED} a="start">Mondrian, streaming</T>
      </Stage>
      <Stage id="stats" active={active} onSelect={onSelect} label="Stage 7, statistics">
        <rect x={1780} y={762} width={396} height={180} fill="transparent" className="wf-hit" rx={14} />
        <circle cx={1849} cy={846} r={59} fill="#9fcdee" stroke={BLUE} strokeWidth={5} />
        <line x1={1849} y1={812} x2={1849} y2={876} stroke={INK} strokeWidth={5} />
        <line x1={1818} y1={824} x2={1880} y2={824} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <line x1={1828} y1={876} x2={1870} y2={876} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M1818 826 l-12 22 h24 z M1880 826 l-12 22 h24 z" fill="white" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <T x={1930} y={816} s={30} w={700} a="start">7 Statistics</T>
        <T x={1930} y={856} s={24} c={MUTED} a="start">paired tests</T>
        <T x={1930} y={890} s={24} c={MUTED} a="start">synthetic CRC check</T>
        <T x={1930} y={924} s={24} c={MUTED} a="start">miss and alarm rates</T>
      </Stage>
      <Arrow x1={2210} y1={606} x2={2268} y2={606} dark />

      {/* ---------------- stage 8: outcome */}
      <Stage id="protocol" active={active} onSelect={onSelect} label="Stage 8, event-screening protocol">
        <rect x={2277} y={374} width={260} height={465} rx={24} fill="#e6f4e7" stroke="#3fa34d" strokeWidth={5} className="wf-box" />
        <rect x={2368} y={418} width={78} height={94} rx={8} fill="white" stroke={INK} strokeWidth={5} />
        <rect x={2390} y={408} width={34} height={18} rx={5} fill="#2e7d32" stroke={INK} strokeWidth={3} />
        {[448, 470, 492].map((y) => (
          <g key={y}>
            <path d={`M2378 ${y} l5 6 l10 -11`} fill="none" stroke="#2e7d32" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <line x1={2400} y1={y + 1} x2={2433} y2={y + 1} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          </g>
        ))}
        <T x={2407} y={584} s={29} w={700}>Event-screening</T>
        <T x={2407} y={621} s={29} w={700}>protocol</T>
        {['eligibility rules', 'outputs, audit', 'recalibration', 'triggers'].map((l, i) => (
          <T key={l} x={2407} y={684 + i * 34} s={24} c={MUTED}>{l}</T>
        ))}
      </Stage>
    </svg>
  )
}
