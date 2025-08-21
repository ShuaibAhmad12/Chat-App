"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import type { StickyNote, CreateNoteData, UpdateNoteData } from "@/lib/sticky-notes-types"

export function useStickyNotes() {
  const [notes, setNotes] = useState<StickyNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from("sticky_notes").select("*").order("created_at", { ascending: false })

      if (error) {
        setError(error.message)
        console.error("Error fetching notes:", error)
      } else {
        setNotes(data || [])
      }
    } catch (err) {
      setError("Failed to fetch notes")
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Create note
  const createNote = useCallback(
    async (noteData: CreateNoteData = {}) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setError("User not authenticated")
          return null
        }

        const { data, error } = await supabase
          .from("sticky_notes")
          .insert([
            {
              title: noteData.title || "New Note",
              content: noteData.content || "",
              color: noteData.color || "yellow",
              position_x: noteData.position_x || Math.floor(Math.random() * 300),
              position_y: noteData.position_y || Math.floor(Math.random() * 200),
              width: noteData.width || 250,
              height: noteData.height || 200,
              user_id: user.id,
              z_index: notes.length + 1,
            },
          ])
          .select()
          .single()

        if (error) {
          setError(error.message)
          console.error("Error creating note:", error)
          return null
        }

        return data
      } catch (err) {
        setError("Failed to create note")
        console.error("Unexpected error:", err)
        return null
      }
    },
    [supabase, notes.length],
  )

  // Update note
  const updateNote = useCallback(
    async (id: string, updates: UpdateNoteData) => {
      try {
        const { data, error } = await supabase.from("sticky_notes").update(updates).eq("id", id).select().single()

        if (error) {
          setError(error.message)
          console.error("Error updating note:", error)
          return null
        }

        return data
      } catch (err) {
        setError("Failed to update note")
        console.error("Unexpected error:", err)
        return null
      }
    },
    [supabase],
  )

  // Delete note
  const deleteNote = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from("sticky_notes").delete().eq("id", id)

        if (error) {
          setError(error.message)
          console.error("Error deleting note:", error)
          return false
        }

        return true
      } catch (err) {
        setError("Failed to delete note")
        console.error("Unexpected error:", err)
        return false
      }
    },
    [supabase],
  )

  // Bring note to front
  const bringToFront = useCallback(
    async (id: string) => {
      const maxZIndex = Math.max(...notes.map((note) => note.z_index), 0)
      return updateNote(id, { z_index: maxZIndex + 1 })
    },
    [notes, updateNote],
  )

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchNotes()

    // Set up real-time subscription
    const channel = supabase
      .channel("sticky_notes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sticky_notes",
        },
        (payload) => {
          console.log("Sticky note change:", payload)
          fetchNotes() // Refetch all notes on any change
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchNotes])

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    bringToFront,
    refetch: fetchNotes,
  }
}
