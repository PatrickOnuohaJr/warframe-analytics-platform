import { useState } from 'react'
import useArcanes from '../hooks/useArcanes'

export default function ArcanesPage() {
  const {
    summary,
    categories,
    arcanes,
    loading,
    saveArcaneOwnership,
  } = useArcanes()

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedArcane, setSelectedArcane] = useState(null)
  const [ownedInput, setOwnedInput] = useState('')
  const rankCopyMilestones =
  selectedArcane?.max_rank === 3
    ? [
        { label: 'R0', copies: 1 },
        { label: 'R1', copies: 3 },
        { label: 'R2', copies: 6 },
        { label: 'R3', copies: 10 },
      ]
    : [
        { label: 'R0', copies: 1 },
        { label: 'R1', copies: 3 },
        { label: 'R2', copies: 6 },
        { label: 'R3', copies: 10 },
        { label: 'R4', copies: 15 },
        { label: 'R5', copies: 21 },
      ]

const arcaneTypes = [
  'All',
  ...categories.map(category => category.arcane_type),
]

const filteredArcanes = arcanes.filter(arcane => {
  const matchesSearch =
    arcane.name.toLowerCase().includes(search.toLowerCase())

  const matchesType =
    selectedType === 'All' || arcane.arcane_type === selectedType

  return matchesSearch && matchesType
})

if (loading) {
  return <div>Loading Arcane Collection...</div>
}


  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Arcane Collection
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Total</div>
          <div className="text-3xl font-bold">{summary?.total_arcanes ?? 0}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Owned</div>
          <div className="text-3xl font-bold">{summary?.owned_arcanes ?? 0}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Completed</div>
          <div className="text-3xl font-bold">{summary?.completed_arcanes ?? 0}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Missing</div>
          <div className="text-3xl font-bold">{summary?.missing_arcanes ?? 0}</div>
        </div>
      </div>

      <div className="mb-8">
  <h2 className="text-xl font-bold mb-4">
    Arcane Categories
  </h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {categories.map(category => (
      <div
        key={category.arcane_type}
        className="rounded-lg border p-4"
      >
        <div className="text-lg font-bold mb-2">
          {category.arcane_type}
        </div>

        <div className="text-sm opacity-70">
          Total
        </div>

        <div className="text-2xl font-bold mb-3">
          {category.total}
        </div>

        <div className="flex justify-between text-sm">
          <span>Owned</span>
          <span>{category.owned}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Completed</span>
          <span>{category.completed}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Missing</span>
          <span>{category.missing}</span>
        </div>
      </div>
    ))}
  </div>
</div>

<div className="rounded-lg border p-4 mt-6">
  <h2 className="text-xl font-bold mb-4">
    Arcane Catalog
  </h2>

<input
  type="text"
  placeholder="Search arcanes..."
  className="w-full rounded-lg border p-3 mb-4 bg-transparent"
  value={search}
  onChange={(e) => {
  setSearch(e.target.value)
  setSelectedArcane(null)
}}
/>

    <div className="flex flex-wrap gap-2 mb-4">
  {arcaneTypes.map(type => (
    <button
      key={type}
      onClick={() => {
        setSelectedType(type)
        setSelectedArcane(null)
      }}
      className="rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-[0.2em]"
      style={{
        borderColor:
          selectedType === type ? '#FBBF24' : '#6F6A62',
        color:
          selectedType === type ? '#FBBF24' : '#E8E4DC',
      }}
    >
      {type}
    </button>
  ))}
</div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {filteredArcanes.map(arcane => {
    const owned = arcane.owned_copies ?? 0
    const needed = arcane.copies_remaining ?? 0
    const totalRequired = owned + needed
    const progress =
      totalRequired > 0
        ? Math.min(100, Math.round((owned / totalRequired) * 100))
        : arcane.is_completed
        ? 100
        : 0

    return (
      <div
        key={arcane.arcane_id}
        onClick={() => {
          setSelectedArcane(arcane)
          setOwnedInput(arcane.owned_copies ?? 0)
        }}
        className={`rounded-lg border p-4 cursor-pointer transition-all ${
          selectedArcane?.arcane_id === arcane.arcane_id
            ? 'border-[#FBBF24] bg-[#443D34]'
            : 'border-[#6F6A62]'
        } hover:border-[#C9A66B] hover:bg-[#443D34]`}
      >
        <div>
          <div className="font-semibold">
            {arcane.name}
          </div>

          <div className="text-sm opacity-70">
            {arcane.arcane_type}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-sm mt-2">
          <span>
            Owned: {arcane.owned_copies ?? 0}
          </span>

          <span>
            Needed: {arcane.copies_remaining ?? '—'}
          </span>

          <span>
            Rank: R{arcane.derived_rank ?? 0}
          </span>

          <div className="mt-3">
            <div className="h-3 rounded-full bg-black/20 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  arcane.is_completed
                    ? 'bg-green-400'
                    : arcane.is_owned
                    ? 'bg-[#FBBF24]'
                    : 'bg-red-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-xs opacity-70 mt-1">
              {owned} / {totalRequired} ({progress}%)
            </div>
          </div>

          <span
            className={
              arcane.is_completed
                ? 'text-green-400'
                : arcane.is_owned
                ? 'text-yellow-400'
                : 'text-red-400'
            }
          >
            {arcane.is_completed
              ? 'Complete'
              : arcane.is_owned
              ? 'Partial'
              : 'Missing'}
          </span>
        </div>
      </div>
        )
      })}
  </div>
  {selectedArcane && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    onClick={() => setSelectedArcane(null)}
  >
    <div
    onClick={(e) => e.stopPropagation()}
      className="w-full max-w-5xl rounded-2xl border p-6 shadow-2xl shadow-yellow-900/30"
      style={{
        borderColor: '#FBBF24',
        background:
          'radial-gradient(circle at top left, #443D34 0%, #2F2A23 45%, #1F1C18 100%)',
      }}
    >
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-3xl font-bold">
          {selectedArcane.name}
        </h3>

        <p className="text-sm opacity-70">
          {selectedArcane.arcane_type}
        </p>
      </div>

      <button
        onClick={() => setSelectedArcane(null)}
        className="rounded-lg border px-3 py-1 text-sm"
      >
        Close
      </button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div className="rounded-lg border p-3">
        <div className="text-sm opacity-70">
          Owned Copies
        </div>

        <input
          type="number"
          min="0"
          max="999"
          value={ownedInput}
          onChange={(e) => setOwnedInput(e.target.value)}
          className="w-full bg-transparent text-2xl font-bold outline-none"
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {rankCopyMilestones.map(milestone => (
            <button
              key={milestone.label}
              type="button"
              onClick={() => setOwnedInput(String(milestone.copies))}
              className="rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-all hover:border-[#C9A66B] hover:bg-[#443D34]"
              style={{
                borderColor:
                  Number(ownedInput || 0) === milestone.copies
                    ? '#FBBF24'
                    : '#6F6A62',
                color:
                  Number(ownedInput || 0) === milestone.copies
                    ? '#FBBF24'
                    : '#E8E4DC',
              }}
            >
              {milestone.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="text-sm opacity-70">Needed</div>
        <div className="text-2xl font-bold">
          {selectedArcane.copies_remaining ?? '—'}
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="text-sm opacity-70">Rank</div>
        <div className="text-2xl font-bold">
          R{selectedArcane.derived_rank ?? 0}
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="text-sm opacity-70">Status</div>
        <div
          className={`text-2xl font-bold ${
            selectedArcane.is_completed
              ? 'text-green-400'
              : selectedArcane.is_owned
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}
        >
        </div>
      </div>
    </div>
    
    <div className="mb-4">
  <div className="flex justify-between text-sm opacity-80 mb-1">
    <span>Collection Progress</span>
    <span>
      {Number(ownedInput || 0)} / {selectedArcane.max_rank === 3 ? 10 : 21}
    </span>
  </div>

  <div className="h-3 rounded-full bg-black/30 overflow-hidden">
    <div
      className={`h-full transition-all ${
        selectedArcane.is_completed
          ? 'bg-green-400'
          : selectedArcane.is_owned
          ? 'bg-[#FBBF24]'
          : 'bg-red-400'
      }`}
      style={{
        width: `${Math.min(
          100,
          Math.round(
            (Number(ownedInput || 0) /
              (selectedArcane.max_rank === 3 ? 10 : 21)) *
              100
          )
        )}%`,
      }}
    />
  </div>
</div>

    {selectedArcane.effect_r5 ? (
      <div className="rounded-lg border p-3">
        <div className="text-sm opacity-70 mb-1">
          Rank 5 Effect
        </div>
        <p>{selectedArcane.effect_r5}</p>
      </div>
    ) : null}

    <div className="flex gap-3 mt-4">
  <button
    onClick={async () => {
      await saveArcaneOwnership(
        selectedArcane.arcane_id,
        Number(ownedInput || 0)
      )
      setSelectedArcane(null)
    }}
    className="rounded-lg border px-4 py-2 text-sm font-bold uppercase tracking-[0.2em]"
  >
    Save Ownership
  </button>

  <button
    onClick={() => setSelectedArcane(null)}
    className="rounded-lg border px-4 py-2 text-sm"
  >
    Cancel
  </button>
</div>
  </div>
  </div>
)}
</div>
</div>
)
}