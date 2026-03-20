import { useState, useCallback } from 'react'
import { DEFAULT_MEMBERS } from '../constants'

const STORAGE_KEY = 'bhangra_members'

function loadMembers() {
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
  const [members, setMembersState] = useState(loadMembers)

  const setMembers = useCallback((newMembers) => {
    setMembersState(newMembers)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMembers))
    } catch {}
  }, [])

  return { members, setMembers }
}
