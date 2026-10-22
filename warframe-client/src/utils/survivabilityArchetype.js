// Patrick's manual survivability archetype tag (my_frames.survivability_archetype)
// and the Codex filter built on it. Order here is the button order.
export const ARCHETYPES = ['Health Tank', 'Shield Tank', 'Hybrid'];

// Plural button labels for the Codex filter row.
export const ARCHETYPE_FILTER_LABELS = {
  'Health Tank': 'Health Tanks',
  'Shield Tank': 'Shield Tanks',
  'Hybrid': 'Hybrids',
};

// filter: 'all' or an ARCHETYPES value. Builds with no tag never match a
// specific archetype, so an active filter only shows builds Patrick tagged.
export function filterByArchetype(frames, filter) {
  if (filter === 'all') return frames;
  return frames.filter(f => f.survivability_archetype === filter);
}
