import { useEffect, useState } from 'react'
import { wfBase } from '../lib/supabase'

export default function useCompanions() {
  const [companions, setCompanions] = useState([])
  const [loadingCompanions, setLoadingCompanions] = useState(true)

  async function fetchCompanions() {

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
    // Database synchronization: state updates occur after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCompanions()
  }, [])

  return {
    companions,
    loadingCompanions,
    refetchCompanions: () => { setLoadingCompanions(true); return fetchCompanions() },
  }
}
