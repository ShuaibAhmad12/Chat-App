"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import type { ChatMessage } from "@/lib/types"

export function useRealtimeMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial messages with improved error handling
    const fetchMessages = async () => {
      console.log("🔍 Starting to fetch initial general chat messages...")
      setLoading(true)
      setError(null)

      try {
        // Method 1: Try the join query first
        console.log("🔗 Attempting join query...")
        const { data: messagesWithProfiles, error: joinError } = await supabase
          .from("messages")
          .select(`
            id,
            content,
            user_id,
            created_at,
            updated_at,
            image_url,
            image_name,
            message_type,
            profiles!messages_user_id_fkey (
              id,
              username,
              full_name,
              avatar_url,
              is_online
            )
          `)
          .order("created_at", { ascending: true })
          .limit(50)

        if (!joinError && messagesWithProfiles) {
          console.log("✅ Join query successful:", messagesWithProfiles)
          setMessages(
            (messagesWithProfiles as any[]).map(msg => ({
              ...msg,
              profiles: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
            })) as ChatMessage[]
          )
          setLoading(false)
          return
        }

        console.log("⚠️ Join query failed, trying alternative approach:", joinError)

        // Method 2: Fallback to separate queries
        console.log("🔄 Falling back to separate queries...")
        const { data: rawMessages, error: rawError } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(50)

        if (rawError) {
          console.error("❌ Raw messages query failed:", rawError)
          setError(`Failed to fetch messages: ${rawError.message}`)
          setLoading(false)
          return
        }

        if (!rawMessages || rawMessages.length === 0) {
          console.log("📭 No messages found in database")
          setMessages([])
          setLoading(false)
          return
        }

        // Fetch profiles separately
        console.log("👥 Fetching profiles for messages...")
        const userIds = [...new Set(rawMessages.map(msg => msg.user_id))]
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, is_online")
          .in("id", userIds)

        if (profilesError) {
          console.error("❌ Profiles query failed:", profilesError)
          setError(`Failed to fetch user profiles: ${profilesError.message}`)
          setLoading(false)
          return
        }

        // Combine messages with profiles
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])
        const messagesWithManualProfiles = rawMessages.map(message => ({
          ...message,
          profiles: profilesMap.get(message.user_id) || {
            id: message.user_id,
            username: "Unknown User",
            full_name: null,
            avatar_url: null,
            is_online: false
          }
        }))

        console.log("✅ Manual profile fetching completed:", messagesWithManualProfiles)
        setMessages(messagesWithManualProfiles as ChatMessage[])

      } catch (err) {
        console.error("💥 Unexpected error fetching messages:", err)
        setError(`Unexpected error: ${err}`)
      }

      setLoading(false)
    }

    fetchMessages()

    // Subscribe to new messages
    console.log("🔔 Setting up real-time subscription...")
    const channel = supabase
      .channel("general_messages_fixed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          console.log("📨 New message received via real-time:", payload)
          
          try {
            // Try to fetch the complete message with profile data
            const { data: messageWithProfile, error: fetchError } = await supabase
              .from("messages")
              .select(`
                id,
                content,
                user_id,
                created_at,
                updated_at,
                image_url,
                image_name,
                message_type,
                profiles!messages_user_id_fkey (
                  id,
                  username,
                  full_name,
                  avatar_url,
                  is_online
                )
              `)
              .eq("id", payload.new.id)
              .single()

            if (!fetchError && messageWithProfile) {
              console.log("✅ Adding new message with profile to state:", messageWithProfile)
              setMessages((prev) => [
                ...prev,
                {
                  ...messageWithProfile,
                  profiles: Array.isArray(messageWithProfile.profiles)
                    ? messageWithProfile.profiles[0]
                    : messageWithProfile.profiles
                } as ChatMessage
              ])
              return
            }

            console.log("⚠️ Fallback: fetching profile separately for new message")
            // Fallback: fetch profile separately
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url, is_online")
              .eq("id", payload.new.user_id)
              .single()

            const fallbackMessage = {
              ...payload.new,
              profiles: profile || {
                id: payload.new.user_id,
                username: "Unknown User",
                full_name: null,
                avatar_url: null,
                is_online: false
              }
            }

            console.log("🔄 Using fallback message:", fallbackMessage)
            setMessages((prev) => [...prev, fallbackMessage as ChatMessage])

          } catch (err) {
            console.error("💥 Error processing new message:", err)
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 General messages subscription status:", status)
      })

    return () => {
      console.log("🧹 Cleaning up general messages subscription")
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const sendMessage = async (content: string) => {
    console.log("📤 Attempting to send text message:", content)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("❌ No user found when trying to send message")
        setError("No authenticated user found")
        return
      }

      console.log("👤 Current user:", { id: user.id, email: user.email })

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            content,
            user_id: user.id,
            message_type: 'text'
          },
        ])
        .select()

      if (error) {
        console.error("❌ Error sending message:", error)
        setError(`Failed to send message: ${error.message}`)
      } else {
        console.log("✅ Message sent successfully:", data)
        setError(null)
      }
    } catch (err) {
      console.error("💥 Unexpected error sending message:", err)
      setError(`Unexpected error: ${err}`)
    }
  }

  const sendImage = async (imageUrl: string, imageName: string, caption?: string) => {
    console.log("📤 Attempting to send image:", { imageUrl, imageName, caption })

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("❌ No user found when trying to send image")
        setError("No authenticated user found")
        return
      }

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            content: caption || '',
            user_id: user.id,
            message_type: 'image',
            image_url: imageUrl,
            image_name: imageName
          },
        ])
        .select()

      if (error) {
        console.error("❌ Error sending image:", error)
        setError(`Failed to send image: ${error.message}`)
      } else {
        console.log("✅ Image sent successfully:", data)
        setError(null)
      }
    } catch (err) {
      console.error("💥 Unexpected error sending image:", err)
      setError(`Unexpected error: ${err}`)
    }
  }

  return { messages, loading, sendMessage, sendImage, error }
}
