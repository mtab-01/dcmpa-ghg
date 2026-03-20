import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { DEFAULT_MEMBERS } from '../constants'

const STORAGE_KEY = 'bhangra_members'

function loadLocalMembers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length === 12) return parsed
    }
  } catch {}
  return DEFAULT_MEMBERS
}

export function useMembers() {
  const [members, setMembersState] = useState(loadLocalMembers)
  const [loading, setLoading] = useState(true)

  // Load from Supabase on mount, fall back to localStorage
  useEffect(() => {
    async function fetchMembers() {
      const { data, error } = await supabase
        .from('members')
        .select('position, name')
        .order('position')

      if (!error && data && data.length === 12) {
        const names = data.map(row => row.name)
        setMembersState(names)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(names)) } catch {}
      }
      setLoading(false)
    }
    fetchMembers()
  }, [])

  const setMembers = useCallback(async (newMembers) => {
    setMembersState(newMembers)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newMembers)) } catch {}

    const rows = newMembers.map((name, i) => ({ position: i, name }))
    await supabase.from('members').upsert(rows, { onConflict: 'position' })
  }, [])

  return { members, setMembers, loading }
}
