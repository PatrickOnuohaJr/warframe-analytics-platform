import { useMemo, useState } from 'react'

// Reusable autocomplete input for weapons AND arcanes — arcane vs weapon
// mode is auto-detected from the shape of the `weapons` list (arcanes carry
// an `arcane_type` field that weapons don't).
export default function WeaponInput({ label, value, onChange, weapons = [], slot, placeholder }) {
  const [focused, setFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [showAllArcanes, setShowAllArcanes] = useState(false)

  const isArcanePicker = useMemo(() => {
    return weapons.some(item => item.arcane_type !== undefined)
  }, [weapons])

  const filteredWeapons = useMemo(() => {
    const query = value.trim().toLowerCase()

    return weapons
      .filter(item => {
        const itemSlot = item.slot ?? item.arcane_type ?? item.category
        return String(itemSlot).toLowerCase() === String(slot).toLowerCase()
      })
      .filter(item => {
        if (!isArcanePicker) return true
        if (showAllArcanes) return true

        return item.is_owned === true || (item.owned_copies ?? 0) > 0
      })
      .filter(weapon => weapon.weapon_type !== 'Incarnon Genesis')
      .filter(weapon => {
        if (!query) return true
        return weapon.name.toLowerCase().includes(query)
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()

        if (query) {
          const aStarts = aName.startsWith(query)
          const bStarts = bName.startsWith(query)

          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
        }

        return a.name.localeCompare(b.name)
      })
      .slice(0, 8)
  }, [weapons, slot, value, isArcanePicker, showAllArcanes])

  function selectWeapon(weapon) {
    onChange(weapon.name)
    setFocused(false)
    setHighlightedIndex(0)
  }

  function handleKeyDown(e) {
    if (!focused || filteredWeapons.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev =>
        prev >= filteredWeapons.length - 1 ? 0 : prev + 1
      )
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev =>
        prev <= 0 ? filteredWeapons.length - 1 : prev - 1
      )
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      selectWeapon(filteredWeapons[highlightedIndex])
    }

    if (e.key === 'Escape') {
      setFocused(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-[#B8B3AC] uppercase tracking-widest">
          {label}
        </p>

        {isArcanePicker && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setShowAllArcanes(prev => !prev)
              setHighlightedIndex(0)
            }}
            className="text-[10px] uppercase tracking-widest text-[#B8B3AC] hover:text-[#E8E4DC] transition-colors"
          >
            {showAllArcanes ? 'All' : 'Owned'}
          </button>
        )}
      </div>

      <input
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setHighlightedIndex(0)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 120)
        }}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#4A443B] text-[#E8E4DC] text-sm rounded-lg px-3 py-2 border border-white/10"
        placeholder={placeholder}
      />

      {focused && filteredWeapons.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d0d0d] border border-white/10 rounded-lg overflow-hidden z-[80] max-h-56 overflow-y-auto shadow-xl">
          {filteredWeapons.map((weapon, index) => {
            const highlighted = index === highlightedIndex
            const ownedCopies = weapon.owned_copies ?? 0
            const derivedRank = weapon.derived_rank ?? 0

            return (
              <button
                key={weapon.weapon_id ?? weapon.arcane_id}
                type="button"
                onMouseDown={() => selectWeapon(weapon)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className="w-full text-left px-3 py-2 transition-colors"
                style={{
                  background: highlighted ? '#6F6A62' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#E8E4DC]">{weapon.name}</p>

                  {isArcanePicker && ownedCopies > 0 && (
                    <span className="text-[10px] text-[#B8B3AC] uppercase tracking-widest">
                      R{derivedRank}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-[#9C9890] uppercase tracking-widest">
                  {weapon.weapon_type ??
                    weapon.arcane_type ??
                    weapon.category ??
                    slot}

                  {!isArcanePicker &&
                  weapon.mastery_rank !== null &&
                  weapon.mastery_rank !== undefined
                    ? ` • MR ${weapon.mastery_rank}`
                    : ''}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
