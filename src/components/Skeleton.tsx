import type { ReactNode } from 'react'
import { cx } from '../lib/format'

interface SkeletonProps {
  /** Defaults to the full width of the line. */
  w?: number | string
  /** Without a height the skeleton is a text line sized to the surrounding font. */
  h?: number | string
  /** Pill / circle corners. */
  round?: boolean
  className?: string
}

export function Skeleton({ w, h, round, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx('skeleton', h != null && 'skeleton-block', round && 'skeleton-round', className)}
      style={{ width: w, height: h }}
    />
  )
}

/** Wraps a placeholder region and tells assistive tech that content is loading. */
export function Loading({ className, label = 'Loading…', children }: { className?: string; label?: string; children: ReactNode }) {
  return (
    <div className={className} aria-busy="true">
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  )
}

const HEADING_WIDTHS = [84, 64, 76]
const ITEM_WIDTHS = ['72%', '58%', '80%', '46%', '66%', '52%']

/** Stand-up shaped placeholder: a few headings, each with a couple of bullet lines. */
export function MarkdownSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="markdown-skeleton">
      {Array.from({ length: sections }, (_, s) => (
        <div key={s}>
          <div className="markdown-skeleton-heading">
            <Skeleton w={HEADING_WIDTHS[s % HEADING_WIDTHS.length]} />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="markdown-skeleton-item">
              <Skeleton w={ITEM_WIDTHS[(s * 2 + i) % ITEM_WIDTHS.length]} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Mirrors `<Stat>` cards; known labels are shown as real text. */
export function StatsSkeleton({ labels }: { labels: string[] }) {
  return (
    <div className="stats">
      {labels.map((label) => (
        <div key={label} className="card stat">
          <div className="stat-label">{label}</div>
          <div className="stat-value">
            <Skeleton w="45%" />
          </div>
          <div className="stat-hint">
            <Skeleton w="60%" />
          </div>
        </div>
      ))}
    </div>
  )
}
