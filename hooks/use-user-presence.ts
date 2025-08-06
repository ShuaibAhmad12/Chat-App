"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import type { Profile } from "@/lib/types"

export function useUserPresence() {
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)
  const lastActivityRef = useRef(Date.now())

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    isActiveRef.current = true
  }, [])

  // Update presence in database
  const updatePresence = useCallback(async (online: boolean) => {
    if (!currentUserId) return

    try {
      await supabase.rpc("update_user_presence", {
        user_uuid: currentUserId,
        online_status: online,
      })
    } catch (error) {
      console.error("Error updating presence:", error)
    }
  }, [currentUserId, supabase])

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_online", true)
        .order("username")

      if (error) {
        console.error("Error fetching online users:", error)
      } else {
        setOnlineUsers(data || [])
      }
    } catch (error) {
      console.error("Unexpected error fetching online users:", error)
    }
  }, [supabase])

  // Cleanup inactive users
  const cleanupInactiveUsers = useCallback(async () => {
    try {
      await supabase.rpc("cleanup_inactive_users")
      fetchOnlineUsers() // Refresh the list after cleanup
    } catch (error) {
      console.error("Error cleaning up inactive users:", error)
    }
  }, [supabase, fetchOnlineUsers])

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [supabase])

  useEffect(() => {
    if (!currentUserId) return

    // Set user as online initially
    updatePresence(true)
    fetchOnlineUsers()

    // Set up activity tracking
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActiveRef.current = false
      } else {
        updateActivity()
        updatePresence(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle beforeunload to set user offline
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status update
      if (navigator.sendBeacon !== undefined) {
        const formData = new FormData()
        formData.append('user_id', currentUserId)
        formData.append('online', 'false')
        // Note: This would need a separate API endpoint in a real app
      } else {
        updatePresence(false)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Regular presence updates (every 30 seconds)
    presenceIntervalRef.current = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityRef.current
      
      // If user has been inactive for more than 1 minute, set as offline
      if (timeSinceLastActivity > 60000) {
        isActiveRef.current = false
        updatePresence(false)
      } else if (isActiveRef.current) {
        updatePresence(true)
      }
    }, 30000)

    // Cleanup inactive users every minute
    cleanupIntervalRef.current = setInterval(cleanupInactiveUsers, 60000)

    // Subscribe to profile changes for real-time updates
    const channel = supabase
      .channel("profiles_presence")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          // Only refetch if it's a presence-related change
          if (payload.eventType === 'UPDATE' && 
              (payload.new.is_online !== payload.old?.is_online || 
               payload.new.last_seen !== payload.old?.last_seen)) {
            fetchOnlineUsers()
          }
        },
      )
      .subscribe()

    // Cleanup function
    return () => {
      // Clear intervals
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current)
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }

      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // Remove channel subscription
      supabase.removeChannel(channel)

      // Set user as offline
      updatePresence(false)
    }
  }, [currentUserId, supabase, updatePresence, fetchOnlineUsers, cleanupInactiveUsers, updateActivity])

  return { onlineUsers, currentUserId }
}
