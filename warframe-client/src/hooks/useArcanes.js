import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function useArcanes() {
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [arcanes, setArcanes] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchArcanes() {
    setLoading(true)

    const [summaryResult, categoryResult, detailResult] =
      await Promise.all([
        supabase
          .schema('wf_user')
          .from('arcane_collection_summary')
          .select('*')
          .single(),

        supabase
          .schema('wf_user')
          .from('arcane_collection_by_type')
          .select('*'),

        supabase
          .schema('wf_user')
          .from('arcane_collection_detail')
          .select('*')
          .order('arcane_type')
          .order('name'),
      ])

    if (summaryResult.error) {
      console.error('Arcane summary error:', summaryResult.error)
    }

    if (categoryResult.error) {
      console.error('Arcane category error:', categoryResult.error)
    }

    if (detailResult.error) {
      console.error('Arcane detail error:', detailResult.error)
    }

    setSummary(summaryResult.data ?? null)
    setCategories(categoryResult.data ?? [])
    setArcanes(detailResult.data ?? [])
    setLoading(false)
  }

  async function saveArcaneOwnership(arcaneId, ownedCopies) {
    const { error } = await supabase
      .schema('wf_user')
      .from('my_arcanes')
      .upsert(
        {
          arcane_id: arcaneId,
          owned_copies: ownedCopies,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'arcane_id',
        }
      )

    if (error) {
      console.error('Save arcane ownership error:', error)
      return { error }
    }

    await fetchArcanes()
    return { error: null }
  }

  useEffect(() => {
    fetchArcanes()
  }, [])

  return {
    summary,
    categories,
    arcanes,
    loading,
    refetchArcanes: fetchArcanes,
    saveArcaneOwnership,
  }
}