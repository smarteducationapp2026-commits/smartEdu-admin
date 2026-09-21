import { useMemo, useState } from 'react'
import type { TrendPoint } from '../../services/analytics'

const WIDTH = 600
const HEIGHT = 180
const PAD_LEFT = 34
const PAD_RIGHT = 10
const PAD_TOP = 14
const PAD_BOTTOM = 26

function formatDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return dateKey
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function niceMax(value: number): number {
  if (value <= 4) return 4
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = magnitude / 2
  return Math.ceil(value / step) * step
}

export function LineChart({
  title,
  data,
  color = '#1767b1',
}: {
  title: string
  data: TrendPoint[]
  color?: string
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const { linePath, areaPath, points, maxValue } = useMemo(() => {
    const max = niceMax(Math.max(1, ...data.map((point) => point.count)))
    const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT
    const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
    const step = data.length > 1 ? innerWidth / (data.length - 1) : 0
    const pts = data.map((point, index) => ({
      x: PAD_LEFT + step * index,
      y: PAD_TOP + innerHeight - (point.count / max) * innerHeight,
      point,
    }))
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const baseline = PAD_TOP + innerHeight
    const area =
      pts.length > 0
        ? `M${pts[0].x.toFixed(1)},${baseline} ${pts
            .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(' ')} L${pts[pts.length - 1].x.toFixed(1)},${baseline} Z`
        : ''
    return { linePath: line, areaPath: area, points: pts, maxValue: max }
  }, [data])

  const active = activeIndex != null ? points[activeIndex] : null
  const baselineY = HEIGHT - PAD_BOTTOM

  return (
    <div className="line-chart">
      <h4>{title}</h4>
      <div className="line-chart-canvas">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={title}>
          <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={baselineY} className="axis-line" />
          <line x1={PAD_LEFT} y1={baselineY} x2={WIDTH - PAD_RIGHT} y2={baselineY} className="axis-line" />
          <text x={PAD_LEFT - 8} y={PAD_TOP + 4} className="axis-label" textAnchor="end">
            {maxValue}
          </text>
          <text x={PAD_LEFT - 8} y={baselineY + 4} className="axis-label" textAnchor="end">
            0
          </text>
          {areaPath && <path d={areaPath} fill={color} opacity={0.1} stroke="none" />}
          {linePath && (
            <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {active && (
            <line x1={active.x} y1={PAD_TOP} x2={active.x} y2={baselineY} className="crosshair" />
          )}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={4}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
            />
          )}
          {active && <circle cx={active.x} cy={active.y} r={4} fill={color} stroke="#fff" strokeWidth={2} />}
        </svg>
        <div className="line-chart-hit-row">
          {points.map((p, index) => (
            <button
              key={p.point.date}
              className="line-chart-hit"
              aria-label={`${formatDate(p.point.date)}: ${p.point.count}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onBlur={() => setActiveIndex(null)}
            />
          ))}
        </div>
        {active && (
          <div
            className="line-chart-tooltip"
            style={{ left: `${(active.x / WIDTH) * 100}%` }}
          >
            <strong>{active.point.count}</strong>
            <span>{formatDate(active.point.date)}</span>
          </div>
        )}
      </div>
      <div className="line-chart-range">
        <span>{data.length > 0 ? formatDate(data[0].date) : ''}</span>
        <span>{data.length > 0 ? formatDate(data[data.length - 1].date) : ''}</span>
      </div>
    </div>
  )
}
