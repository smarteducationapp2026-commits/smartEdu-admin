// Cover design used in place of a thumbnail image (uploads need Firebase
// Storage, which needs the Blaze plan) — a gradient + initial derived from
// the title, so every series still gets a distinct-looking card. Mirrored
// in the mobile app's Tests tab; keep the two palettes in sync if changed.
const COVER_GRADIENTS = [
  ['#55B9EE', '#1767B1'],
  ['#667EEA', '#764BA2'],
  ['#11998E', '#1F4037'],
  ['#FF8C42', '#C1440E'],
]

function coverGradient(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length]
}

export function SeriesCover({ title, className }: { title: string; className: string }) {
  const [from, to] = coverGradient(title || '?')
  return (
    <div className={className} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span className="series-cover-title">{title.trim() || 'Untitled'}</span>
    </div>
  )
}
