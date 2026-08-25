// Shared helpers for reading/writing the flat shard_1..shard_5 column layout
// used by archon_shard_slots / archon_shard_slots_target.

export function getInitialShards(slots) {
  return [1, 2, 3, 4, 5].map(i => ({
    color: slots?.[`shard_${i}_color`] ?? null,
    tauforged: slots?.[`shard_${i}_tauforged`] ?? false,
    bonus: slots?.[`shard_${i}_bonus`] ?? '',
  }))
}

export function buildShardPayload(shards) {
  const payload = {}

  shards.forEach((s, i) => {
    payload[`shard_${i + 1}_color`] = s.color
    payload[`shard_${i + 1}_tauforged`] = s.tauforged
    payload[`shard_${i + 1}_tier`] = null
    payload[`shard_${i + 1}_bonus`] = s.bonus || null
  })

  return payload
}

export function cleanValue(value) {
  if (!value) return null
  if (value.trim().toLowerCase() === 'nan') return null
  return value.trim()
}

export function getColorKey(color) {
  return color ? String(color).toLowerCase() : ''
}
