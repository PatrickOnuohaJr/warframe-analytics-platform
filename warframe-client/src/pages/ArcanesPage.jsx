import { useState } from 'react'
import useArcanes from '../hooks/useArcanes'

export default function ArcanesPage() {
  const {
    summary,
    categories,
    arcanes,
    loading,
  } = useArcanes()

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('All')

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
  onChange={(e) => setSearch(e.target.value)}
/>

    <div className="flex flex-wrap gap-2 mb-4">
  {arcaneTypes.map(type => (
    <button
      key={type}
      onClick={() => setSelectedType(type)}
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

  <div className="space-y-2">
    {filteredArcanes.map(arcane => (
      <div
        key={arcane.arcane_id}
        className="flex items-center justify-between border-b pb-2"
      >
        <div>
          <div className="font-semibold">
            {arcane.name}
          </div>

          <div className="text-sm opacity-70">
            {arcane.arcane_type}
          </div>
        </div>

        <div className="flex gap-6 text-sm">
          <span>
            Owned: {arcane.owned_rank}
          </span>

          <span>
            Needed: {arcane.needed_rank}
          </span>
        </div>
      </div>
    ))}
  </div>
</div>

</div>
)
}