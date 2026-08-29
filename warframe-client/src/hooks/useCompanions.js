import { useEffect, useState } from 'react'
import { wfBase } from '../lib/supabase'

export default function useCompanions() {
  const [companions, setCompanions] = useState([])
  const [loadingCompanions, setLoadingCompanions] = useState(true)

  async function fetchCompanions() {
    setLoadingCompanions(true)

    const { data, error } = await wfBase
      .from('companions')
      .select('companion_id, name, companion_class, raw_json')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching companions:', error)
      setCompanions([])
    } else {
      setCompanions(data ?? [])
    }

    setLoadingCompanions(false)
  }

  useEffect(() => {
    fetchCompanions()
  }, [])

  return {
    companions,
    loadingCompanions,
    refetchCompanions: fetchCompanions,
  }
}
