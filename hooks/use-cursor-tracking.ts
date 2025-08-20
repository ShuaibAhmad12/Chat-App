"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import type { Profile } from "@/lib/types"

interface UserCursor {
  id: string
  user_id: string
  conversation_id: string
  cursor_x: number
  cursor_y: number
  updated_at: string
  profile?: Profile
}

interface UseCursorTrackingOptions {
  conversationId?: string
  enabled?: boolean
}

export function useCursorTracking({ conversationId, enabled = true }: UseCursorTrackingOptions = {}) {
  const [cursors, setCursors] = useState<UserCursor[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  const lastUpdateRef = useRef<number>(0)
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      console.log("Cursor tracking - Current user:", user?.id)
    }
    getCurrentUser()
  }, [supabase])

  // Update cursor position with fallback to direct database operations
  const updateCursorPosition = useCallback(
    async (x: number, y: number) => {
      if (!currentUserId || !conversationId || !enabled) return

      // Throttle updates to avoid too many database calls
      const now = Date.now()
      if (now - lastUpdateRef.current < 100) return // Max 10 updates per second
      lastUpdateRef.current = now

      try {
        // First try using RPC function
        const { error: rpcError } = await supabase.rpc("update_cursor_position", {
          p_user_id: currentUserId,
          p_conversation_id: conversationId,
          p_cursor_x: x,
          p_cursor_y: y,
        })

        if (rpcError) {
          console.log("RPC failed, falling back to direct upsert:", rpcError.message)

          // Fallback to direct database operation
          const { error: upsertError } = await supabase.from("user_cursors").upsert(
            {
              user_id: currentUserId,
              conversation_id: conversationId,
              cursor_x: x,
              cursor_y: y,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,conversation_id",
            },
          )

          if (upsertError) {
            console.error("Direct upsert also failed:", upsertError)
          } else {
            console.log("Cursor position updated via direct upsert")
          }
        } else {
          console.log("Cursor position updated via RPC")
        }
      } catch (error) {
        console.error("Error updating cursor position:", error)
      }
    },
    [currentUserId, conversationId, enabled, supabase],
  )

  // Fetch cursors for current conversation
  const fetchCursors = useCallback(async () => {
    if (!conversationId || !enabled) {
      setCursors([])
      return
    }

    try {
      console.log("Fetching cursors for conversation:", conversationId)

      const { data: cursorsData, error } = await supabase
        .from("user_cursors")
        .select("*")
        .eq("conversation_id", conversationId)
        .neq("user_id", currentUserId || "")
        .gte("updated_at", new Date(Date.now() - 60000).toISOString()) // Only cursors from last minute

      if (error) {
        console.error("Error fetching cursors:", error)
        return
      }

      console.log("Raw cursors data:", cursorsData)

      // Fetch profiles for each cursor
      if (cursorsData && cursorsData.length > 0) {
        const userIds = cursorsData.map((cursor) => cursor.user_id)
        const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*").in("id", userIds)

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError)
        }

        const cursorsWithProfiles = cursorsData.map((cursor) => ({
          ...cursor,
          profile: profiles?.find((p) => p.id === cursor.user_id),
        }))

        console.log("Cursors with profiles:", cursorsWithProfiles)
        setCursors(cursorsWithProfiles)
      } else {
        setCursors([])
      }
    } catch (error) {
      console.error("Error fetching cursors:", error)
      setCursors([])
    }
  }, [conversationId, currentUserId, enabled, supabase])

  // Set up mouse tracking
  useEffect(() => {
    if (!currentUserId || !conversationId || !enabled) return

    console.log("Setting up mouse tracking for conversation:", conversationId)

    const handleMouseMove = (e: MouseEvent) => {
      updateCursorPosition(e.clientX, e.clientY)
    }

    const handleMouseLeave = async () => {
      // Remove cursor when mouse leaves the window
      if (currentUserId && conversationId) {
        try {
          await supabase
            .from("user_cursors")
            .delete()
            .eq("user_id", currentUserId)
            .eq("conversation_id", conversationId)
          console.log("Cursor removed on mouse leave")
        } catch (error) {
          console.error("Error removing cursor:", error)
        }
      }
    }

    document.addEventListener("mousemove", handleMouseMove, { passive: true })
    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      // Clean up cursor on unmount
      if (currentUserId && conversationId) {
        (async () => {
          try {
            await supabase
              .from("user_cursors")
              .delete()
              .eq("user_id", currentUserId)
              .eq("conversation_id", conversationId)
            console.log("Cursor cleaned up on unmount")
          } catch (error) {
            console.error("Error cleaning up cursor:", error)
          }
        })()
      }
    }
  }, [currentUserId, conversationId, enabled, updateCursorPosition, supabase])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !enabled) return

    console.log("Setting up real-time subscription for cursors:", conversationId)

    fetchCursors()

    const channel = supabase
      .channel(`cursors_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_cursors",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Cursor update received:", payload)
          fetchCursors()
        },
      )
      .subscribe((status) => {
        console.log("Cursor subscription status:", status)
      })

    // Set up cleanup interval for old cursors
    cleanupIntervalRef.current = setInterval(async () => {
      try {
        // Clean up cursors older than 1 minute
        await supabase
          .from("user_cursors")
          .delete()
          .lt("updated_at", new Date(Date.now() - 60000).toISOString())
        console.log("Old cursors cleaned up")
      } catch (error) {
        console.error("Error cleaning up old cursors:", error)
      }
    }, 30000) // Clean up every 30 seconds

    return () => {
      console.log("Cleaning up cursor subscription")
      supabase.removeChannel(channel)
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [conversationId, enabled, supabase, fetchCursors])

  return {
    cursors: cursors.filter((cursor) => cursor.user_id !== currentUserId),
    updateCursorPosition,
  }
}
