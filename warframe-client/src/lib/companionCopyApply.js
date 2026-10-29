import { wfUser } from './supabase';

// Writes one planned copy (see utils/companionCopy.planCopy) onto one build's
// config: slots, polarities, forma count, catalyst and the config name.
// Slots are upserted first, then any slot the source didn't have is cleared,
// so a failure partway never leaves the target emptier than it started.
// Returns the first error, or null.
export async function applyCopy({ frameId, equipmentType, config, copy, meta }) {
  const rows = copy.map(r => ({
    my_frame_id: frameId,
    equipment_type: equipmentType,
    config_slot: config,
    slot_position: r.slot_position,
    mod_id: r.mod_id,
    riven_id: null,
    polarity: r.polarity,
  }));

  if (rows.length > 0) {
    const { error } = await wfUser
      .from('loadout_slots')
      .upsert(rows, { onConflict: 'my_frame_id,equipment_type,slot_position,config_slot' });
    if (error) return error;
  }

  let del = wfUser
    .from('loadout_slots')
    .delete()
    .eq('my_frame_id', frameId)
    .eq('equipment_type', equipmentType)
    .eq('config_slot', config);
  if (rows.length > 0) del = del.not('slot_position', 'in', `(${rows.map(r => r.slot_position).join(',')})`);
  const { error: delError } = await del;
  if (delError) return delError;

  const { error: metaError } = await wfUser
    .from('loadout_meta')
    .upsert(
      {
        my_frame_id: frameId,
        equipment_type: equipmentType,
        config_slot: config,
        forma_count: meta.forma_count ?? 0,
        has_catalyst: Boolean(meta.has_catalyst),
        config_name: meta.config_name ?? null,
      },
      { onConflict: 'my_frame_id,equipment_type,config_slot' }
    );
  return metaError ?? null;
}
