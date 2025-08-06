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
    // Fetch initial messages with detailed error handling
    const fetchMessages = async () => {
      console.log("🔍 Starting to fetch initial general chat messages...")
      setLoading(true)
      setError(null)

      try {
        // First, let's try a simple query without joins
        const { data: simpleMessages, error: simpleError } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(50)

        console.log("📊 Simple messages query result:", { data: simpleMessages, error: simpleError })

        if (simpleError) {
          console.error("❌ Simple messages query failed:", simpleError)
          setError(`Simple query failed: ${simpleError.message}`)
          setLoading(false)
          return
        }

        if (!simpleMessages || simpleMessages.length === 0) {
          console.log("📭 No messages found in database")
          setMessages([])
          setLoading(false)
          return
        }

        // Now try with profile joins
        const { data: messagesWithProfiles, error: joinError } = await supabase
          .from("messages")
          .select(`
            *,
            profiles (
              id,
              username,
              full_name,
              avatar_url,
              is_online
            )
          `)
          .order("created_at", { ascending: true })
          .limit(50)

        console.log("🔗 Messages with profiles query result:", { data: messagesWithProfiles, error: joinError })

        if (joinError) {
          console.error("❌ Join query failed:", joinError)
          setError(`Join query failed: ${joinError.message}`)
          
          // Fallback: manually fetch profiles for each message
          console.log("🔄 Falling back to manual profile fetching...")
          const messagesWithManualProfiles = await Promise.all(
            simpleMessages.map(async (message) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url, is_online")
                .eq("id", message.user_id)
                .single()

              return {
                ...message,
                profiles: profile || {
                  id: message.user_id,
                  username: "Unknown User",
                  full_name: null,
                  avatar_url: null,
                  is_online: false
                }
              }
            })
          )

          console.log("✅ Manual profile fetching completed:", messagesWithManualProfiles)
          setMessages(messagesWithManualProfiles as ChatMessage[])
        } else {
          console.log("✅ Successfully fetched messages with profiles:", messagesWithProfiles)
          setMessages(messagesWithProfiles as ChatMessage[])
        }

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
            // Fetch the complete message with profile data
            const { data, error } = await supabase
              .from("messages")
              .select(`
                *,
                profiles (
                  id,
                  username,
                  full_name,
                  avatar_url,
                  is_online
                )
              `)
              .eq("id", payload.new.id)
              .single()

            if (error) {
              console.error("❌ Error fetching new message details:", error)
              
              // Fallback: create message with basic info
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
            } else if (data) {
              console.log("✅ Adding new message to state:", data)
              setMessages((prev) => [...prev, data as ChatMessage])
            }
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
