"""Build-time data export for the React-only demo (no server at runtime).

Writes everything the app needs as static JSON into webapp_react/public/data/:
  results/*.json        explorer data (same shapes as the former API)
  conformal/*.json      out-of-fold scores + per-fold training-vehicle calibration scores, so the
                        browser can compute conformal thresholds for any alpha (and Mondrian strata)
  events.json           event list;  events/<id>.json  signals (-30..+15 s) and, for scorable events,
                        the fold model's per-decision-time scores and CRC thresholds

Requires the artifacts of webapp/backend/export_demo.py (fold models + thresholds; never trained on the
scored event's vehicle). Run from crash_ew/:  python webapp_react/scripts/export_static.py
"""
import sys, json, pathlib
import numpy as np, joblib

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
import webapp.backend.app as api  # noqa: E402  (reuses the exact result builders and scoring code)

OUT = ROOT / 'webapp_react' / 'public' / 'data'
for d in ['results', 'conformal', 'events']:
    (OUT / d).mkdir(parents=True, exist_ok=True)


def dump(obj, path):
    path.write_text(json.dumps(api.clean(obj), separators=(',', ':')), encoding='utf-8')


# ---------------------------------------------------------------- explorer results
dump(api.overview(), OUT / 'results' / 'overview.json')
for name in ['onset', 'escalation', 'audit', 'smote', 'calibration', 'importance', 'foundation', 'streaming']:
    dump(getattr(api, f'res_{name}')(), OUT / 'results' / f'{name}.json')
print('results written')

# ---------------------------------------------------------------- conformal inputs
for tau in [0, 1, 2]:
    for model in ['RF', 'XGBoost']:
        s = api.single(tau, model)
        pc = api.calibrated_single(tau, model)
        # full float precision (no clean() rounding): rounded scores create ties at the CRC threshold
        folds = []
        for k, fc in sorted(s['fold_cal'].items()):
            folds.append({'k': int(k), 'q': fc['q'].tolist(), 'y': fc['y'].astype(int).tolist(),
                          'strata': {n: fc[f'strata_{n}'].tolist() for n in s['strata']}})
        doc = {'tau': tau, 'model': model, 'y': s['y'].astype(int).tolist(), 'p': s['p'].tolist(), 'p_cal': pc.tolist(),
               'fold': s['fold'].astype(int).tolist(), 'strata': {n: v.tolist() for n, v in s['strata'].items()}, 'folds': folds}
        (OUT / 'conformal' / f'tau{tau}_{model}.json').write_text(json.dumps(doc, separators=(',', ':')), encoding='utf-8')
print('conformal inputs written')

# ---------------------------------------------------------------- events
dump(api.events(limit=10000), OUT / 'events.json')
idx = api.stream_index()
n_scored = 0
for eid in api.IDS:
    eid = int(eid)
    d = api.event(eid)
    if str(eid) in idx['event_fold']:
        k = idx['event_fold'][str(eid)]; art = api.fold_art(k)
        base = api.score_event(eid, 0.2, 2.0)   # per-time scores do not depend on alpha / deadline
        d['score'] = {
            'fold': k, 'n_cal_crashes': art['n_cal_crashes'], 'times': art['times'],
            'steps': [{key: st[key] for key in ['t', 'p', 'p_cal', 'z', 'running_max']} for st in base['steps']],
            'thr_naive': art['thr_naive'], 'lambda_rm': art['thr_rm'],
            'note': f'Scored by the fold-{k} model, trained without this vehicle.'}
        n_scored += 1
    dump(d, OUT / 'events' / f'{eid}.json')
json.dump({'alphas': idx['alphas'], 'deadlines': idx['deadlines'], 'times': idx['times']}, open(OUT / 'meta.json', 'w'))
print(f'events written: {len(api.IDS)} ({n_scored} scorable)')
