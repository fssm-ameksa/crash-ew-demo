import type { ReactNode } from 'react'

export function Card({ title, subtitle, children, right }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card">
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="sub">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, value, note, accent }: { label: string; value: ReactNode; note?: ReactNode; accent?: string }) {
  return (
    <div className="kpi" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  )
}

export function Seg<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string
}) {
  return (
    <div className="seg-wrap">
      {label && <span className="ctl-label">{label}</span>}
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} role="radio" aria-checked={o.value === value}
            className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

export function Chips({ all, selected, onToggle, colorOf }: {
  all: string[]; selected: string[]; onToggle: (s: string) => void; colorOf: (s: string) => string
}) {
  return (
    <div className="chips">
      {all.map((s) => {
        const on = selected.includes(s)
        return (
          <button key={s} className={`chip ${on ? 'on' : ''}`} onClick={() => onToggle(s)} aria-pressed={on}>
            <span className="dot" style={{ background: on ? colorOf(s) : 'transparent', borderColor: colorOf(s) }} />
            {s}
          </button>
        )
      })}
    </div>
  )
}

export function Status({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (error) return <div className="status err">Could not load data: {error}. Run scripts/export_static.py to build public/data.</div>
  if (loading) return <div className="status">Loading…</div>
  return null
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'alarm' | 'ok' | 'crash' }) {
  return <span className={`badge ${tone}`}>{children}</span>
}
