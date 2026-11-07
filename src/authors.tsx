// Authors and affiliation, as listed on the paper's title page.
export const AUTHORS = [
  { name: 'Mohammed AMEKSA', aff: 'a' },
  { name: 'Hajar MOUSANNIF', aff: 'a' },
  { name: 'Mohamed-Amine CHADI', aff: 'a' },
  { name: 'Zouhair EL AMRANI ABOU EL ASSAD', aff: 'a' },
]
export const AFFILIATIONS: Record<string, string> = {
  a: 'Cadi Ayyad University (UCA), Faculty of Sciences Semlalia, Laboratory of Computer Science and Smart Systems (LISI), Marrakech, Morocco',
}

/** One-line byline (names + short affiliation) shown on every page and slide. */
export function AuthorLine() {
  return (
    <div className="author-line" title={AFFILIATIONS.a}>
      {AUTHORS.map((a, i) => (
        <span key={a.name}>{a.name}<sup>{a.aff}</sup>{i < AUTHORS.length - 1 ? ', ' : ''}</span>
      ))}
      <span className="author-line-aff"> · <sup>a</sup>Cadi Ayyad University (UCA), FSSM, LISI, Marrakech, Morocco</span>
    </div>
  )
}

export function Authors({ large = false }: { large?: boolean }) {
  return (
    <div className={`authors ${large ? 'large' : ''}`}>
      <div className="author-names">
        {AUTHORS.map((a, i) => (
          <span key={a.name}>{a.name}<sup>{a.aff}</sup>{i < AUTHORS.length - 1 ? ', ' : ''}</span>
        ))}
      </div>
      {Object.entries(AFFILIATIONS).map(([k, v]) => (
        <div key={k} className="affiliation"><sup>{k}</sup>{v}</div>
      ))}
    </div>
  )
}
