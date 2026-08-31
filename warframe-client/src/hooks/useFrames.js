import { useEffect, useState } from 'react'
import { wfUser, wfBase } from '../lib/supabase'

export default function useFrames() {
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)
  const [abilityCanonicalByName, setAbilityCanonicalByName] = useState({})

  // `silent` skips the loading flag -- used by refetchFrames after an
  // edit (e.g. auto-saving an Arcane) so the fresh data swaps in in the
  // background. Without this, every refetch flipped `loading` true/false,
  // which unmounts the whole app down to the loading spinner in App.jsx
  // and remounts it fresh on completion -- wiping every bit of local UI
  // state (which frame/tab was open, which Loadout sub-tab, etc). That
  // was tolerable when saves only happened on an explicit Save-button
  // click (which closed the modal anyway), but auto-save-on-every-change
  // fields (Arcanes, weapon name) call this on every debounced write,
  // so it made editing an Arcane look like the whole app "reset".
  async function fetchFrames({ silent = false } = {}) {
    if (!silent) setLoading(true)

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

    const { data: abilityData } = await wfBase
      .from('warframe_abilities')
      .select('*')
      .order('ability_slot')  

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

    const abilityMap = {}

    abilityData?.forEach(a => {
      if (!abilityMap[a.warframe_id]) {
        abilityMap[a.warframe_id] = []
      }

      abilityMap[a.warframe_id].push(a)
    })

    const shardMap = {}
    shardData?.forEach(s => {
      shardMap[s.my_frame_id] = s
    })

    const targetShardMap = {}
    targetShardData?.forEach(s => {
      targetShardMap[s.my_frame_id] = s
    })

    // Canonical ability data (Duration/Range/Strength/Energy) -- global
    // reference catalog, not per-frame, so it's kept as a sibling return
    // value rather than attached onto every frame object. See
    // DB/Migrations/20260831_add_ability_parameters.sql and
    // utils/abilityStats.js.
    const { data: abilityCatalogData } = await wfBase
      .from('ability_catalog')
      .select('*')

    const { data: abilityParametersData } = await wfBase
      .from('ability_parameters')
      .select('*')
      .order('sort_order')

    const catalogById = {}
    abilityCatalogData?.forEach(c => {
      catalogById[c.ability_catalog_id] = c
    })

    const canonicalByName = {}
    abilityCatalogData?.forEach(c => {
      canonicalByName[c.ability_name] = { catalog: c, parameters: [] }
    })
    abilityParametersData?.forEach(p => {
      const catalog = catalogById[p.ability_catalog_id]
      if (!catalog) return
      canonicalByName[catalog.ability_name]?.parameters.push(p)
    })

    const { data: abilityConfigData } = await wfUser
    .from('ability_configs')
    .select('*')


    const abilityConfigMap = {}

    abilityConfigData?.forEach(config => {
      if (!abilityConfigMap[config.my_frame_id]) {
        abilityConfigMap[config.my_frame_id] = []
      }

      abilityConfigMap[config.my_frame_id].push(config)
    })

    const enriched = data.map(f => ({
      ...f,
      warframe_name: wfMap[f.warframe_id] ?? `Frame ${f.warframe_id}`,
      abilities: abilityMap[f.warframe_id] ?? [],
      melee_weapon: f.melee_weapon === 'nan' ? null : f.melee_weapon,
      primary_weapon: f.primary_weapon === 'nan' ? null : f.primary_weapon,
      secondary_weapon: f.secondary_weapon === 'nan' ? null : f.secondary_weapon,
      shard_slots: shardMap[f.my_frame_id] ?? null,
      target_shards: targetShardMap[f.my_frame_id] ?? null,
      ability_configs: abilityConfigMap[f.my_frame_id] ?? [],
    }))

    setFrames(enriched)
    setAbilityCanonicalByName(canonicalByName)
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchFrames()
  }, [])

  return {
    frames,
    loading,
    refetchFrames: () => fetchFrames({ silent: true }),
    abilityCanonicalByName,
  }
}