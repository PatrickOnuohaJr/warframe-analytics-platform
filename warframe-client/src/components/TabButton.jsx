export default function TabButton({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="py-2 rounded-lg text-sm font-semibold transition-colors"
      style={{
        background: active ? `${color}18` : '#3A342C',
        border: active
          ? `1px solid ${color}55`
          : '1px solid #6F6A62',
        color: active ? color : 'rgba(255,255,255,0.4)',
      }}
    >
      {children}
    </button>
  )
}
