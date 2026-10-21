import { useEffect, useState } from 'react'
import { wfBase } from '../lib/supabase'

export default function useCompanionWeapons() {
  const [companionWeapons, setCompanionWeapons] = useState([])
  const [loadingCompanionWeapons, setLoadingCompanionWeapons] = useState(true)

  async function fetchCompanionWeapons() {

    const { data, error } = await wfBase
      .from('companion_weapons')
      .select('companion_weapon_id, name, weapon_class, raw_json')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching companion weapons:', error)
      setCompanionWeapons([])
    } else {
      setCompanionWeapons(data ?? [])
    }

    setLoadingCompanionWeapons(false)
  }

  useEffect(() => {
    // Database synchronization: state updates occur after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCompanionWeapons()
  }, [])

  return {
    companionWeapons,
    loadingCompanionWeapons,
    refetchCompanionWeapons: () => { setLoadingCompanionWeapons(true); return fetchCompanionWeapons() },
  }
}
