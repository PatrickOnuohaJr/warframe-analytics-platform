// Pure rules for moving mods between loadout slots (drag and drop) and for the
// one-click Umbral set fill. No React, no DB -- the components feed these the
// current slots and apply the returned changes via onSetSlot.

// Slot positions: '1'..'8' numbered, plus 'aura' (Warframe), 'stance'
// (Melee) and 'exilus'. `item` is a catalog mod (is_aura / is_stance /
// is_exilus flags) or a Riven pool item (isRiven: true).
export function canPlace(slotPosition, item) {
  if (!item) return true; // emptying a slot is always fine
  if (slotPosition === 'aura') return !!item.is_aura;
  if (slotPosition === 'stance') return !!item.is_stance;
  // Aura and Stance mods never fit a regular or Exilus slot.
  if (item.is_aura || item.is_stance) return false;
  // Exilus only takes real Exilus-capable mods (never Rivens).
  if (slotPosition === 'exilus') return !item.isRiven && !!item.is_exilus;
  return true; // numbered slots take anything left
}

const emptyOf = slot => !slot || (slot.mod_id == null && slot.riven_id == null);

// Drag from one slot to another. `resolveItem(slot)` turns a slot row into
// its catalog/riven item. The slot's POLARITY stays with the slot (it's the
// physical socket); only the mod moves.
// Returns { changes: [{ position, mod_id, riven_id }] } or { error }.
//  - target empty  -> move (source is cleared)
//  - target filled -> swap, but only if the source slot can legally hold the
//    target's mod; otherwise refuse rather than silently destroy a mod.
export function planSlotMove({ from, to, slotsByPosition, resolveItem }) {
  if (from === to) return { changes: [] };
  const fromSlot = slotsByPosition.get(from);
  const toSlot = slotsByPosition.get(to);
  const moving = emptyOf(fromSlot) ? null : resolveItem(fromSlot);
  if (!moving) return { error: 'Nothing to move.' };
  if (!canPlace(to, moving)) return { error: `${moving.name} can't go in that slot.` };

  if (emptyOf(toSlot)) {
    return {
      changes: [
        { position: to, mod_id: fromSlot.mod_id ?? null, riven_id: fromSlot.riven_id ?? null },
        { position: from, mod_id: null, riven_id: null },
      ],
    };
  }

  const displaced = resolveItem(toSlot);
  if (!canPlace(from, displaced)) {
    return { error: `${displaced?.name ?? 'That mod'} can't swap into the other slot.` };
  }
  return {
    changes: [
      { position: to, mod_id: fromSlot.mod_id ?? null, riven_id: fromSlot.riven_id ?? null },
      { position: from, mod_id: toSlot.mod_id ?? null, riven_id: toSlot.riven_id ?? null },
    ],
  };
}

// Drag from the picker list into a slot. The dropped item replaces whatever
// was there (same as choosing it in the picker would).
export function planPickerDrop({ to, item }) {
  if (!item) return { error: 'Unknown mod.' };
  if (!canPlace(to, item)) return { error: `${item.name} can't go in that slot.` };
  return {
    changes: [{ position: to, mod_id: item.isRiven ? null : item.mod_id, riven_id: item.isRiven ? item.riven_id : null }],
  };
}

export const UMBRAL_SET = ['Umbral Intensify', 'Umbral Fiber', 'Umbral Vitality'];

const NUMBERED = ['1', '2', '3', '4', '5', '6', '7', '8'];

// One-click Umbral set. Equips each owned Umbral mod into a FREE numbered
// slot (never overwrites a filled one). Ranks need no handling: a mod's rank
// is its owned rank, global to the mod.
//   catalog        -- Warframe-category catalog mods (any ownership)
//   ownedByModId   -- Map<mod_id, {owned_rank}>
//   slotsByPosition-- current slots
// Prefers a free slot whose polarity matches the mod's, else the first free
// slot. Returns { placements:[{position, mod_id, name}], notOwned,
// alreadyEquipped, noSlot } (name lists).
export function planUmbralFill({ catalog, ownedByModId, slotsByPosition }) {
  const out = { placements: [], notOwned: [], alreadyEquipped: [], noSlot: [] };
  const equippedIds = new Set(
    [...slotsByPosition.values()].map(s => s?.mod_id).filter(id => id != null)
  );
  const free = NUMBERED.filter(pos => emptyOf(slotsByPosition.get(pos)));

  // Resolve which pieces actually need a slot.
  const pending = [];
  for (const name of UMBRAL_SET) {
    const mod = catalog.find(m => m.name === name && !m.is_aura && !m.is_stance);
    if (!mod || !ownedByModId.has(mod.mod_id)) { out.notOwned.push(name); continue; }
    if (equippedIds.has(mod.mod_id)) { out.alreadyEquipped.push(name); continue; }
    pending.push({ name, mod });
  }

  const take = (entry, position) => {
    free.splice(free.indexOf(position), 1);
    out.placements.push({ position, mod_id: entry.mod.mod_id, name: entry.name });
  };

  // Pass 1: give every piece a free slot of its own polarity if one exists.
  // Doing this for ALL pieces first stops an early piece grabbing the slot a
  // later piece matches.
  const rest = [];
  for (const entry of pending) {
    const match = free.find(pos => slotsByPosition.get(pos)?.polarity === entry.mod.polarity);
    if (match) take(entry, match); else rest.push(entry);
  }
  // Pass 2: everything else takes the first free slot, or reports no room.
  for (const entry of rest) {
    if (free.length) take(entry, free[0]); else out.noSlot.push(entry.name);
  }
  return out;
}

// Human sentence for the result, so the UI can say what happened and what
// was skipped.
export function describeUmbralFill(plan) {
  const parts = [];
  if (plan.placements.length) parts.push(`Added ${plan.placements.map(p => p.name).join(', ')}.`);
  if (plan.alreadyEquipped.length) parts.push(`Already equipped: ${plan.alreadyEquipped.join(', ')}.`);
  if (plan.notOwned.length) parts.push(`Not owned, skipped: ${plan.notOwned.join(', ')}.`);
  if (plan.noSlot.length) parts.push(`No free slot for: ${plan.noSlot.join(', ')}. Clear a slot and try again.`);
  return parts.join(' ');
}

// dataTransfer type used by every draggable mod (slot cards and picker rows).
// Payload JSON: { kind: 'slot', from } or { kind: 'picker', mod_id, riven_id }.
export const DRAG_MIME = 'application/x-gu-mod';
