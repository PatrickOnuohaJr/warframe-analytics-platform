import { useEffect, useState } from 'react'
import { wfBase } from '../lib/supabase'

export default function useWeapons() {
  const [weapons, setWeapons] = useState([])
  const [loadingWeapons, setLoadingWeapons] = useState(true)

  async function fetchWeapons() {

    const { data, error } = await wfBase
      .from('weapons')
      .select('weapon_id, name, category, weapon_type, mastery_rank, slot, raw_json')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching weapons:', error)
      setWeapons([])
    } else {
      setWeapons(data ?? [])
    }

    setLoadingWeapons(false)
  }

  useEffect(() => {
    // Database synchronization: state updates occur after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWeapons()
  }, [])

  return {
    weapons,
    loadingWeapons,
    refetchWeapons: () => { setLoadingWeapons(true); return fetchWeapons() },
  }
}