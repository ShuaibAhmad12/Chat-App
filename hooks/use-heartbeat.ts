"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"

interface UseHeartbeatOptions {
  interval?: number // in milliseconds
  enabled?: boolean
}

export function useHeartbeat({ interval = 45000, enabled = true }: UseHeartbeatOptions = {}) {
  const supabase = createClient()
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userIdRef.current = user?.id || null
    }
    getCurrentUser()
  }, [supabase])

  useEffect(() => {
    if (!enabled || !userIdRef.current) return

    const sendHeartbeat = async () => {
      if (!userIdRef.current) return

      try {
        await supabase.rpc("update_user_presence", {
          user_uuid: userIdRef.current,
          online_status: true,
        })
      } catch (error) {
        console.error("Heartbeat failed:", error)
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval
    heartbeatRef.current = setInterval(sendHeartbeat, interval)

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
    }
  }, [enabled, interval, supabase])

  return {
    sendHeartbeat: async () => {
      if (userIdRef.current) {
        await supabase.rpc("update_user_presence", {
          user_uuid: userIdRef.current,
          online_status: true,
        })
      }
    },
  }
}
