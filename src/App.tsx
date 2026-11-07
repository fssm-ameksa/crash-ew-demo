import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Decision from './pages/Decision'
import Events from './pages/Events'
import Overview from './pages/Overview'
import Present from './pages/Present'
import Results from './pages/Results'
import Workflow from './pages/Workflow'
import { AUTHORS } from './authors'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/workflow', label: 'Workflow' },
  { to: '/results/onset', label: 'Results', match: '/results' },
  { to: '/decision', label: 'Decision tools' },
  { to: '/events', label: 'Event demos' },
]

export default function App() {
  const loc = useLocation()
  const presenting = loc.pathname === '/present'
  return (
    <div className={presenting ? 'app presenting' : 'app'}>
      {!presenting && (
        <header className="topbar">
          <div className="brand"><span className="logo">▲</span> Crash early warning <span className="brand-sub">100-Car demo</span></div>
          <nav>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => (isActive || (n.match && loc.pathname.startsWith(n.match)) ? 'on' : '')}>{n.label}</NavLink>
            ))}
            <NavLink to="/present" className="present-link">▶ Present</NavLink>
          </nav>
        </header>
      )}
      <main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/workflow" element={<Workflow />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:tab" element={<Results />} />
          <Route path="/decision" element={<Decision />} />
          <Route path="/events" element={<Events />} />
          <Route path="/present" element={<Present />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </main>
      {!presenting && <footer className="foot">{AUTHORS.map((a) => a.name).join(', ')} · Cadi Ayyad University (UCA), LISI, Marrakech · Data: 100-Car NDS (VTTI, CC0, doi:10.15787/VTT1/CEU6RB). All scores are out-of-fold under vehicle-grouped cross-validation.</footer>}
    </div>
  )
}
