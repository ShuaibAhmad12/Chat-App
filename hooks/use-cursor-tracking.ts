"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { usePathname } from "next/navigation"
import type { Profile } from "@/lib/types"

interface UserCursor {
  id: string
  user_id: string
  page_path: string
  cursor_x: number
  cursor_y: number
  updated_at: string
  profile?: Profile
}

export function useCursorTracking() {
  const [cursors, setCursors] = useState<UserCursor[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  const pathname = usePathname()
  const lastUpdateRef = useRef<number>(0)
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [supabase])

  // Update cursor position
  const updateCursorPosition = useCallback(
    async (x: number, y: number) => {
      if (!currentUserId) return

      // Throttle updates to avoid too many database calls
      const now = Date.now()
      if (now - lastUpdateRef.current < 100) return // Max 10 updates per second
      lastUpdateRef.current = now

      try {
        await supabase.rpc("update_cursor_position", {
          p_user_id: currentUserId,
          p_page_path: pathname,
          p_cursor_x: x,
          p_cursor_y: y,
        })
      } catch (error) {
        console.error("Error updating cursor position:", error)
      }
    },
    [currentUserId, pathname, supabase],
  )

  // Fetch cursors for current page
  const fetchCursors = useCallback(async () => {
    if (!pathname) return

    try {
      const { data: cursorsData, error } = await supabase
        .from("user_cursors")
        .select("*")
        .eq("page_path", pathname)
        .neq("user_id", currentUserId || "")

      if (error) {
        console.error("Error fetching cursors:", error)
        return
      }

      // Fetch profiles for each cursor
      if (cursorsData && cursorsData.length > 0) {
        const userIds = cursorsData.map((cursor) => cursor.user_id)
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds)

        const cursorsWithProfiles = cursorsData.map((cursor) => ({
          ...cursor,
          profile: profiles?.find((p) => p.id === cursor.user_id),
        }))

        setCursors(cursorsWithProfiles)
      } else {
        setCursors([])
      }
    } catch (error) {
      console.error("Error fetching cursors:", error)
    }
  }, [pathname, currentUserId, supabase])

  // Set up mouse tracking
  useEffect(() => {
    if (!currentUserId) return

    const handleMouseMove = (e: MouseEvent) => {
      updateCursorPosition(e.clientX, e.clientY)
    }

    const handleMouseLeave = () => {
      // Remove cursor when mouse leaves the window
      if (currentUserId) {
        supabase
          .from("user_cursors")
          .delete()
          .eq("user_id", currentUserId)
          .eq("page_path", pathname)
          .then(() => {
            console.log("Cursor removed on mouse leave")
          })
      }
    }

    document.addEventListener("mousemove", handleMouseMove, { passive: true })
    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      // Clean up cursor on unmount
      if (currentUserId) {
        supabase.from("user_cursors").delete().eq("user_id", currentUserId).eq("page_path", pathname)
      }
    }
  }, [currentUserId, pathname, updateCursorPosition, supabase])

  // Set up real-time subscription
  useEffect(() => {
    if (!pathname) return

    fetchCursors()

    const channel = supabase
      .channel(`cursors_${pathname}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_cursors",
          filter: `page_path=eq.${pathname}`,
        },
        (payload) => {
          console.log("Cursor update:", payload)
          fetchCursors()
        },
      )
      .subscribe()

    // Set up cleanup interval
    cleanupIntervalRef.current = setInterval(() => {
      supabase.rpc("cleanup_old_cursors")
    }, 30000) // Clean up every 30 seconds

    return () => {
      supabase.removeChannel(channel)
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [pathname, supabase, fetchCursors])

  return {
    cursors: cursors.filter((cursor) => cursor.user_id !== currentUserId),
    updateCursorPosition,
  }
}
