export default function IncarnonToggle({ checked, onChange, color }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full mt-2 px-3 py-2 rounded-lg text-left transition-all"
      style={{
        background: checked
          ? `linear-gradient(135deg, ${color}22, #2f2a23)`
          : '#2A2722',
        border: checked
          ? `1px solid ${color}88`
          : '1px solid rgba(255,255,255,0.08)',
        boxShadow: checked ? `0 0 18px ${color}22` : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: checked ? color : 'rgba(255,255,255,0.35)' }}
          >
            Incarnon Adapter
          </p>

          <p className="text-xs text-[#E8E4DC]/55 mt-0.5">
            {checked ? 'Installed' : 'Not installed'}
          </p>
        </div>

        <div
          className="px-2 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold"
          style={{
            background: checked ? `${color}24` : 'rgba(255,255,255,0.05)',
            border: checked
              ? `1px solid ${color}66`
              : '1px solid rgba(255,255,255,0.08)',
            color: checked ? color : 'rgba(255,255,255,0.28)',
          }}
        >
          {checked ? 'Active' : 'Off'}
        </div>
      </div>
    </button>
  )
}
