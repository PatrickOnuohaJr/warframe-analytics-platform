import { useState } from 'react'
import useArcanes from '../hooks/useArcanes'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import ModalShell from '../components/ui/ModalShell'

const GOLD = '#FBBF24'
const MUTED = '#B8B3AC'

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
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showMissingModal, setShowMissingModal] = useState(false)
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

const getCategoryProgress = (category) => {
  if (!category.total || category.total === 0) {
    return 0
  }

  return Math.round((category.completed / category.total) * 100)
}

const collectionScore =
  summary?.total_arcanes
    ? Math.round((summary.completed_arcanes / summary.total_arcanes) * 100)
    : 0

const missingArcanes = arcanes.filter(
  arcane => !arcane.is_owned && !arcane.is_completed
)    
const closestToComplete = [...arcanes]
  .filter(
    arcane =>
      arcane.is_owned &&
      !arcane.is_completed
  )
  .sort(
    (a, b) =>
      a.copies_remaining - b.copies_remaining
  )
  .slice(0, 15)

  const categoryArcanes = selectedCategory
  ? arcanes.filter(
      arcane => arcane.arcane_type === selectedCategory
    )
  : []


if (loading) {
  return <div>Loading Arcane Collection...</div>
}


  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-bold uppercase tracking-[0.08em]" style={{ color: GOLD }}>
          Arcane Collection
        </h1>
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          Ownership and completion progress across every Arcane category.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Panel className="!p-4">
          <div className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>Total</div>
          <div className="text-3xl font-bold mt-2">{summary?.total_arcanes ?? 0}</div>
        </Panel>

        <Panel className="!p-4">
          <div className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>Owned</div>
          <div className="text-3xl font-bold mt-2">{summary?.owned_arcanes ?? 0}</div>
        </Panel>

        <Panel className="!p-4" accent="#4CAF50">
          <div className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>Completed</div>
          <div className="text-3xl font-bold mt-2" style={{ color: '#4CAF50' }}>{summary?.completed_arcanes ?? 0}</div>
        </Panel>

        <Panel interactive accent="#E63946" className="!p-4" onClick={() => setShowMissingModal(true)}>
          <div className="flex items-center justify-between">
            <div className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>Missing</div>
            <span className="text-[8px] uppercase tracking-wide" style={{ color: '#E63946', opacity: 0.8 }}>View →</span>
          </div>
          <div className="text-3xl font-bold mt-2" style={{ color: '#E63946' }}>{summary?.missing_arcanes ?? 0}</div>
        </Panel>

        <Panel className="!p-4" accent={GOLD}>
          <div className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>Collection Score</div>
          <div className="text-3xl font-bold mt-2" style={{ color: GOLD }}>{collectionScore}%</div>
        </Panel>
      </div>

      <Panel className="mb-8">
        <h2 className="text-xl font-bold mb-4">
          Closest To Completion
        </h2>

        {closestToComplete.length === 0 ? (
          <div className="opacity-70">
            No partially completed arcanes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2">
            {closestToComplete.map(arcane => (
              <div
                key={arcane.arcane_id}
                className="flex justify-between items-center border-b pb-2 gap-4"
                style={{ borderColor: 'rgba(111,106,98,0.4)' }}
              >
                <span>{arcane.name}</span>

                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: 'rgba(251,191,36,0.14)', color: GOLD, border: '1px solid rgba(180,83,9,0.35)' }}
                >
                  Need {arcane.copies_remaining}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="mb-8">
  <h2 className="text-xl font-bold mb-4">
    Arcane Categories
  </h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {categories.map(category => (
      <Panel
        key={category.arcane_type}
        interactive
        accent={GOLD}
        onClick={() => setSelectedCategory(category.arcane_type)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold">{category.arcane_type}</h3>
          <span className="text-[10px] font-bold" style={{ color: GOLD }}>{getCategoryProgress(category)}%</span>
        </div>

        <div className="flex flex-col gap-1 mb-3">
          <div className="flex justify-between text-[11px]">
            <span className="uppercase tracking-wide" style={{ color: MUTED }}>Total</span>
            <span>{category.total}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="uppercase tracking-wide" style={{ color: MUTED }}>Owned</span>
            <span>{category.owned}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="uppercase tracking-wide" style={{ color: MUTED }}>Completed</span>
            <span style={{ color: '#4CAF50' }}>{category.completed}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="uppercase tracking-wide" style={{ color: MUTED }}>Missing</span>
            <span style={{ color: '#E63946' }}>{category.missing}</span>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
          <div
            className="h-full bg-[#FBBF24] transition-all"
            style={{
              width: `${getCategoryProgress(category)}%`,
            }}
          />
        </div>
      </Panel>
    ))}
  </div>
</div>

    {showMissingModal && (
  <ModalShell onClose={() => setShowMissingModal(false)} accent={GOLD} maxWidth="max-w-6xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">
            Missing Arcanes
          </h2>
          <p className="text-sm opacity-70">
            {missingArcanes.length} missing
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setShowMissingModal(false)}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {missingArcanes.map(arcane => (
          <Panel
            key={arcane.arcane_id}
            interactive
            accent={GOLD}
            onClick={() => {
              setSelectedArcane(arcane)
              setOwnedInput(arcane.owned_copies ?? 0)
            }}
          >
            <div className="font-bold">
              {arcane.name}
            </div>

            <div className="text-sm opacity-70 mb-3">
              {arcane.arcane_type}
            </div>

            <div className="flex justify-between text-sm">
              <span>Needed: {arcane.copies_remaining ?? '—'}</span>
              <span className="text-red-400">Missing</span>
            </div>
          </Panel>
        ))}
      </div>
  </ModalShell>
)}

      {selectedCategory && (
  <ModalShell onClose={() => setSelectedCategory(null)} accent={GOLD} maxWidth="max-w-6xl" id="arcane-category-modal">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">
            {selectedCategory} Arcanes
          </h2>
          <p className="text-sm opacity-70">
            {categoryArcanes.length} arcanes
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {categoryArcanes.map(arcane => (
          <Panel
            key={arcane.arcane_id}
            interactive
            accent={GOLD}
            onClick={() => {
              setSelectedArcane(arcane)
              setOwnedInput(arcane.owned_copies ?? 0)
            }}
          >
            <div className="font-bold">
              {arcane.name}
            </div>

            <div className="text-sm opacity-70 mb-3">
              {arcane.arcane_type}
            </div>

            <div className="grid grid-cols-4 gap-3 text-sm">
              <span>Owned: {arcane.owned_copies ?? 0}</span>
              <span>Need: {arcane.copies_remaining ?? '—'}</span>
              <span>R{arcane.derived_rank ?? 0}</span>
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
          </Panel>
        ))}
      </div>
  </ModalShell>
)}

  {selectedArcane && (
  <ModalShell onClose={() => setSelectedArcane(null)} accent={GOLD} maxWidth="max-w-5xl" zIndex={70}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-3xl font-bold">
          {selectedArcane.name}
        </h3>

        <p className="text-sm opacity-70">
          {selectedArcane.arcane_type}
        </p>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setSelectedArcane(null)}>
        Close
      </Button>
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
          {selectedArcane.is_completed
            ? 'Complete'
            : selectedArcane.is_owned
            ? 'Partial'
            : 'Missing'}
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
  <Button
    variant="primary"
    color={GOLD}
    onClick={async () => {
  const modalScroll = document.getElementById('arcane-category-modal')
  const modalScrollTop = modalScroll?.scrollTop ?? 0

  await saveArcaneOwnership(
    selectedArcane.arcane_id,
    Number(ownedInput || 0)
  )

  setSelectedArcane(null)

  setTimeout(() => {
    const refreshedModalScroll = document.getElementById('arcane-category-modal')

    if (refreshedModalScroll) {
      refreshedModalScroll.scrollTop = modalScrollTop
    }
  }, 0)
}}
  >
    Save Ownership
  </Button>

  <Button variant="ghost" onClick={() => setSelectedArcane(null)}>
    Cancel
  </Button>
</div>
  </ModalShell>
)}
</div>
)
}