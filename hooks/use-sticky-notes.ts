"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import type { StickyNote, CreateNoteData, UpdateNoteData } from "@/lib/sticky-notes-types"

export function useStickyNotes() {
  const [notes, setNotes] = useState<StickyNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [supabase])

  // Fetch notes - only for current user
  const fetchNotes = useCallback(async () => {
    if (!currentUserId) return

    try {
      setLoading(true)
      setError(null)

      console.log("Fetching notes for user:", currentUserId)

      const { data, error } = await supabase
        .from("sticky_notes")
        .select("*")
        .eq("user_id", currentUserId) // Explicitly filter by current user
        .order("created_at", { ascending: false })

      if (error) {
        setError(error.message)
        console.error("Error fetching notes:", error)
      } else {
        console.log("Fetched notes:", data)
        setNotes(data || [])
      }
    } catch (err) {
      setError("Failed to fetch notes")
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, currentUserId])

  // Create note
  const createNote = useCallback(
    async (noteData: CreateNoteData = {}) => {
      if (!currentUserId) {
        setError("User not authenticated")
        return null
      }

      try {
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
              user_id: currentUserId, // Ensure user_id is set
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

        console.log("Created note:", data)
        return data
      } catch (err) {
        setError("Failed to create note")
        console.error("Unexpected error:", err)
        return null
      }
    },
    [supabase, notes.length, currentUserId],
  )

  // Update note
  const updateNote = useCallback(
    async (id: string, updates: UpdateNoteData) => {
      if (!currentUserId) {
        setError("User not authenticated")
        return null
      }

      try {
        const { data, error } = await supabase
          .from("sticky_notes")
          .update(updates)
          .eq("id", id)
          .eq("user_id", currentUserId) // Ensure user can only update their own notes
          .select()
          .single()

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
    [supabase, currentUserId],
  )

  // Delete note
  const deleteNote = useCallback(
    async (id: string) => {
      if (!currentUserId) {
        setError("User not authenticated")
        return false
      }

      try {
        const { error } = await supabase.from("sticky_notes").delete().eq("id", id).eq("user_id", currentUserId) // Ensure user can only delete their own notes

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
    [supabase, currentUserId],
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
    if (!currentUserId) return

    fetchNotes()

    // Set up real-time subscription - only for current user's notes
    const channel = supabase
      .channel("sticky_notes_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sticky_notes",
          filter: `user_id=eq.${currentUserId}`, // Only listen to current user's notes
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
  }, [supabase, fetchNotes, currentUserId])

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
