// Same colours as the article's figures, so slides and paper match.
export const C = {
  blue: '#2a6fb0', red: '#d1495b', amber: '#e09f1f', grey: '#8c8c8c', lblue: '#7fb3e0', teal: '#00798c',
  pink: '#f0a3ad', ink: '#1d2430', muted: '#5b6472', grid: '#e6e8ec', good: '#2e7d4f',
}

export const SERIES: Record<string, string> = {
  RF: C.blue, XGBoost: C.red, Logistic: C.grey, 'RF+SMOTE': C.lblue, MiniRocket: C.teal,
  'RF, no gas': C.blue, 'XGBoost, no gas': C.red, 'Logistic, no gas': C.grey,
  'max decel (no training)': C.amber, 'max 1/TTC (no training)': '#6b6b6b',
  'Chronos-small': '#7fbfc8', 'Chronos-base': '#2f9aa8', 'Chronos-large': C.teal,
  'max decel': C.amber, 'max 1/TTC': '#6b6b6b',
}
export const color = (s: string) => SERIES[s] ?? C.grey

export const pct = (v: number | null | undefined, d = 1) => (v == null ? '–' : `${(v * 100).toFixed(d)}%`)
export const f3 = (v: number | null | undefined) => (v == null ? '–' : v.toFixed(3))
