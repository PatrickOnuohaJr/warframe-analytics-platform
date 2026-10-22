import { useState } from 'react';
import { wfUser } from '../lib/supabase';
import { COLOR } from '../constants/theme';
import { SURVIVABILITY_CLAIMS } from '../utils/survivabilityStatus';

// Modal-header control for Patrick's own "this looks like a Tier 0 / Tier 1
// contender" call. Writes my_frames.survivability_claim only -- it can never
// make a build "tested"; that only comes from a logged Jade Light result.
// Clicking the active claim again (or Clear) returns the build to untested.
export default function CandidateButtons({ frame, onSaved }) {
  const [saving, setSaving] = useState(false);
  const current = frame.survivability_claim ?? null;

  async function setClaim(next) {
    setSaving(true);
    const { error } = await wfUser
      .from('my_frames')
      .update({ survivability_claim: next })
      .eq('my_frame_id', frame.my_frame_id);
    setSaving(false);
    if (error) {
      console.error('Failed to save survivability claim:', error);
      return;
    }
    if (onSaved) onSaved();
  }

  return (
    <div className="flex items-center gap-2">
      {SURVIVABILITY_CLAIMS.map(tier => {
        const active = current === tier;
        return (
          <button
            key={tier}
            disabled={saving}
            onClick={() => setClaim(active ? null : tier)}
            className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg disabled:opacity-40"
            style={{
              background: active ? `${COLOR.gold}22` : 'transparent',
              border: `1px solid ${active ? COLOR.gold : COLOR.border}`,
              color: active ? COLOR.gold : COLOR.mutedInk,
            }}
            title={active ? `Clear ${tier} candidate` : `Mark as a ${tier} candidate`}
          >
            {tier} candidate
          </button>
        );
      })}
    </div>
  );
}
