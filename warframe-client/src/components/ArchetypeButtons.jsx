import { useState } from 'react';
import { wfUser } from '../lib/supabase';
import { COLOR } from '../constants/theme';
import { ARCHETYPES } from '../utils/survivabilityArchetype';

// Modal-header control for tagging a build Health Tank / Shield Tank / Hybrid.
// This is Patrick's own declaration (my_frames.survivability_archetype); it
// feeds the Codex filter buttons. Clicking the active one clears it.
export default function ArchetypeButtons({ frame, onSaved }) {
  const [saving, setSaving] = useState(false);
  const current = frame.survivability_archetype ?? null;

  async function setArchetype(next) {
    setSaving(true);
    const { error } = await wfUser
      .from('my_frames')
      .update({ survivability_archetype: next })
      .eq('my_frame_id', frame.my_frame_id);
    setSaving(false);
    if (error) {
      console.error('Failed to save survivability archetype:', error);
      return;
    }
    if (onSaved) onSaved();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ARCHETYPES.map(type => {
        const active = current === type;
        return (
          <button
            key={type}
            disabled={saving}
            onClick={() => setArchetype(active ? null : type)}
            className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg disabled:opacity-40"
            style={{
              background: active ? `${COLOR.info}22` : 'transparent',
              border: `1px solid ${active ? COLOR.info : COLOR.border}`,
              color: active ? COLOR.info : COLOR.mutedInk,
            }}
            title={active ? `Clear ${type} tag` : `Tag as ${type}`}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}
