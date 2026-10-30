import { wfBase, wfUser } from './supabase';

// Every build with the fields the Companion copy modals need. warframe_name
// is not a column on my_frames (useFrames derives it from wf_base.warframes),
// so it is resolved here the same way instead of being selected.
// Returns { data, error } like a Supabase call.
export async function fetchBuilds() {
  const [framesRes, warframesRes] = await Promise.all([
    wfUser.from('my_frames').select('my_frame_id, warframe_id, display_name, build_title, companion, companion_weapon'),
    wfBase.from('warframes').select('warframe_id, name'),
  ]);

  const error = framesRes.error || warframesRes.error;
  if (error) return { data: null, error };

  const names = new Map((warframesRes.data || []).map(w => [w.warframe_id, w.name]));
  return {
    data: (framesRes.data || []).map(f => ({
      ...f,
      warframe_name: names.get(f.warframe_id) ?? `Frame ${f.warframe_id}`,
    })),
    error: null,
  };
}
