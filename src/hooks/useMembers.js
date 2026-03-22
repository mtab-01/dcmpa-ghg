import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
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

  // Load from Firestore on mount, fall back to localStorage
  useEffect(() => {
    async function fetchMembers() {
      try {
        const snap = await getDocs(collection(db, 'members'))
        if (snap.size === 12) {
          const names = snap.docs
            .map(d => d.data())
            .sort((a, b) => a.position - b.position)
            .map(r => r.name)
          setMembersState(names)
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(names)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    fetchMembers()
  }, [])

  const setMembers = useCallback(async (newMembers) => {
    setMembersState(newMembers)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newMembers)) } catch {}
    await Promise.all(
      newMembers.map((name, i) => setDoc(doc(db, 'members', String(i)), { position: i, name }))
    )
  }, [])

  return { members, setMembers, loading }
}
