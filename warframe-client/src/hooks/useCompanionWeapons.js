import { useEffect, useState } from 'react'
import { wfBase } from '../lib/supabase'

export default function useCompanionWeapons() {
  const [companionWeapons, setCompanionWeapons] = useState([])
  const [loadingCompanionWeapons, setLoadingCompanionWeapons] = useState(true)

  async function fetchCompanionWeapons() {
    setLoadingCompanionWeapons(true)

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
    fetchCompanionWeapons()
  }, [])

  return {
    companionWeapons,
    loadingCompanionWeapons,
    refetchCompanionWeapons: fetchCompanionWeapons,
  }
}
