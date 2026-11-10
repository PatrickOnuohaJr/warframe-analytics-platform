import { Fragment } from 'react'
import { NAV_ITEMS } from '../constants/navItems'

// The masthead's page index (Home · Codex · Search ...). Shared by the app
// shell and the build-detail overlay so the same top row is visible while
// editing a build -- you can jump to Mods or Requiem without leaving first.
const BORDER = '#6F6A62'
const MUTED = '#B8B3AC'
const GOLD = '#FBBF24'


// `activePage` may be null (inside a build the underlying page isn't "the
// current page"), in which case nothing is highlighted.
export default function MainNav({ activePage, onNavigate, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center gap-6 pb-5 border-b flex-wrap ${className}`}
      style={{ borderColor: BORDER }}
    >
      {NAV_ITEMS.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 && <span style={{ color: BORDER, fontSize: '11px' }}>·</span>}
          <button
            onClick={() => onNavigate(item.id)}
            className="text-[11px] font-bold uppercase tracking-[0.2em] pb-2"
            style={{
              color: activePage === item.id ? GOLD : MUTED,
              border: 'none',
              borderBottom: `2px solid ${activePage === item.id ? GOLD : 'transparent'}`,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        </Fragment>
      ))}
    </div>
  )
}
