"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setHasPermission(true)
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          setHasPermission(permission === "granted")
        })
      }
    }
  }, [])

  const showNotification = (title: string, body: string, icon?: string) => {
    if (hasPermission && document.hidden) {
      new Notification(title, {
        body,
        icon: icon || "/placeholder.svg?height=64&width=64",
        tag: "chat-message",
      })
    }
  }

  useEffect(() => {
    if (!hasPermission) return

    const generalChannel = supabase
      .channel("message-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          // Don't show notification for own messages
          if (user && payload.new.user_id !== user.id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", payload.new.user_id)
              .single()

            if (profile) {
              showNotification(`New message from ${profile.username}`, payload.new.content)
            }
          }
        },
      )
      .subscribe()

    const directChannel = supabase
      .channel("direct-message-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        async (payload) => {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          // Only show notification if message is for current user
          if (user && payload.new.receiver_id === user.id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", payload.new.sender_id)
              .single()

            if (profile) {
              showNotification(`Direct message from ${profile.username}`, payload.new.content)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(generalChannel)
      supabase.removeChannel(directChannel)
    }
  }, [hasPermission, supabase])

  return { hasPermission, showNotification }
}
