import { useEffect, useState } from 'react'
import { wfBase } from '../lib/supabase'

export default function useWeapons() {
  const [weapons, setWeapons] = useState([])
  const [loadingWeapons, setLoadingWeapons] = useState(true)

  async function fetchWeapons() {
    setLoadingWeapons(true)

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
    fetchWeapons()
  }, [])

  return {
    weapons,
    loadingWeapons,
    refetchWeapons: fetchWeapons,
  }
}