# React-only demo: calibrated early warning of crash escalation (100-Car)

Pure React + Vite single-page app. **No server-side code at runtime**: every result, out-of-fold score,
threshold and event signal ships as static JSON in `public/data/`, and the conformal computations and
the 10 Hz event replay run in the browser.

Authors: Mohammed AMEKSA, Hajar MOUSANNIF, Mohamed-Amine CHADI, Zouhair EL AMRANI ABOU EL ASSAD —
Cadi Ayyad University (UCA), Faculty of Sciences Semlalia, LISI, Marrakech, Morocco.

## Run

```
npm install
npm run dev          # http://localhost:5173  (development)
npm run build        # static site in dist/  (about 38 MB including data)
npm run preview      # serve dist/ at http://localhost:4173
```
Or double-click `start_demo.bat`. The `dist/` folder can be hosted on any static web server or GitHub Pages
(hash routing and relative paths, so it works from any sub-folder).

Deep links: `#/present?slide=9`, `#/events?event=8313&autoplay=1`, `#/events?event=8313&tab=score`, `#/results/audit`.

## Data (built once, already included)

`public/data/` is generated from the study's results by a one-off Python step; rerun it only when the results change:

```
# from crash_ew/, with PYTHONHOME cleared
.venv\Scripts\python webapp\backend\export_demo.py         # fold models + thresholds (if not done)
.venv\Scripts\python webapp_react\scripts\export_static.py # writes webapp_react/public/data
```

| File | Content |
| --- | --- |
| `results/*.json` | Explorer data: onset, escalation, audit, SMOTE, calibration, importance, foundation models, streaming |
| `conformal/tau{0,1,2}_{RF,XGBoost}.json` | Out-of-fold scores, Platt-calibrated probabilities, folds, strata, and each fold's training-vehicle calibration scores |
| `events.json`, `events/<id>.json` | Event list; per-event signals (−30 … +15 s) and, for scorable events, the per-decision-time scores of the fold model that never saw the vehicle, with its CRC thresholds |

## What runs in the browser

- `src/conformal.ts` — conformal risk control (`crcThreshold`, per-fold cross-conformal flags, Mondrian
  strata, operating curve, screening tiers). Cross-checked against the Python implementation:
  `node scripts/check.mjs` gives the same miss and alarm rates (RF, τ = +2 s, α = 0.2: 0.1538 / 0.6061).
- `src/api.ts` — cached JSON loading and `scoreEvent` (naive per-time and running-max alarm policies).
- `src/pages/Events.tsx` — 10 Hz replay driven by a timer over the recorded signals.

Scores are exactly those of the paper's protocol (vehicle-grouped CV, seed 0); the browser only applies thresholds.
