import { useEffect, useState } from 'react'
import { wfBase } from '../lib/supabase'

export default function useArcanes() {
  const [arcanes, setArcanes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArcanes() {
      setLoading(true)

      const { data, error } = await wfBase
        .from('arcanes')
        .select('*')
        .order('name')

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      setArcanes(data || [])
      setLoading(false)
    }

    fetchArcanes()
  }, [])

  return {
    arcanes,
    loading,
  }
}