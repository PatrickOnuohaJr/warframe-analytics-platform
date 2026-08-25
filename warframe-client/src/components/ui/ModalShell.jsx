import { COLOR } from '../../constants/theme'

// Shared modal primitive: dimmed backdrop + centered scrollable box.
// Click-outside closes; content clicks are stopped from bubbling to
// parent modals (needed when one modal opens another, e.g. Copy Weapon
// from inside the Arsenal editor).
export default function ModalShell({
  children,
  onClose,
  maxWidth = 'max-w-md',
  accent,
  zIndex = 60,
  id,
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.8)', zIndex }}
      onClick={onClose}
    >
      <div
        id={id}
        className={`border rounded-2xl p-6 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        style={{
          background: accent
            ? `linear-gradient(135deg, ${accent}10, ${COLOR.surface2} 22%, #161616 100%)`
            : COLOR.surface1,
          borderColor: accent ? `${accent}44` : COLOR.border,
          boxShadow: accent ? `0 0 40px ${accent}16` : 'var(--shadow-lifted)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
