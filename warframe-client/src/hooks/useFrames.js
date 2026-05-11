import { useEffect, useState } from 'react'
import { wfUser, wfBase } from '../lib/supabase'

export default function useFrames() {
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchFrames() {
    setLoading(true)

    const { data, error } = await wfUser
      .from('my_frames')
      .select('*, build_status(*), cultivation_color')
      .order('my_frame_id')

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const { data: wfData } = await wfBase
      .from('warframes')
      .select('warframe_id, name')

    const { data: shardData } = await wfUser
      .from('archon_shard_slots')
      .select('*')

    const { data: targetShardData } = await wfUser
      .from('archon_shard_slots_target')
      .select('*')

    const wfMap = {}
    wfData?.forEach(w => {
      wfMap[w.warframe_id] = w.name
    })

    const shardMap = {}
    shardData?.forEach(s => {
      shardMap[s.my_frame_id] = s
    })

    const targetShardMap = {}
    targetShardData?.forEach(s => {
      targetShardMap[s.my_frame_id] = s
    })

    const enriched = data.map(f => ({
      ...f,
      warframe_name: wfMap[f.warframe_id] ?? `Frame ${f.warframe_id}`,
      melee_weapon: f.melee_weapon === 'nan' ? null : f.melee_weapon,
      primary_weapon: f.primary_weapon === 'nan' ? null : f.primary_weapon,
      secondary_weapon: f.secondary_weapon === 'nan' ? null : f.secondary_weapon,
      shard_slots: shardMap[f.my_frame_id] ?? null,
      target_shards: targetShardMap[f.my_frame_id] ?? null,
    }))

    setFrames(enriched)
    setLoading(false)
  }

  useEffect(() => {
    fetchFrames()
  }, [])

  return {
    frames,
    loading,
    refetchFrames: fetchFrames,
  }
}