"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import type { DirectMessageWithProfile, Conversation } from "@/lib/types"

export function useDirectMessages(receiverId?: string) {
  const [messages, setMessages] = useState<DirectMessageWithProfile[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [supabase])

  // Fetch conversations
  useEffect(() => {
    if (!currentUserId) return

    const fetchConversations = async () => {
      try {
        // Get conversations
        const { data: conversationsData, error: conversationsError } = await supabase
          .from("conversations")
          .select("*")
          .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
          .order("last_message_at", { ascending: false })

        if (conversationsError) {
          console.error("Error fetching conversations:", conversationsError)
          setLoading(false)
          return
        }

        // Get profiles for other users using separate queries
        const conversationsWithProfiles = await Promise.all(
          (conversationsData || []).map(async (conv) => {
            const otherUserId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id

            // Fetch profile separately
            const { data: profileData } = await supabase.from("profiles").select("*").eq("id", otherUserId).single()

            // Count unread messages
            const { count } = await supabase
              .from("direct_messages")
              .select("*", { count: "exact", head: true })
              .eq("receiver_id", currentUserId)
              .eq("sender_id", otherUserId)
              .eq("is_read", false)

            return {
              ...conv,
              other_user: profileData,
              unread_count: count || 0,
            }
          }),
        )

        setConversations(conversationsWithProfiles)
        setLoading(false)
      } catch (err) {
        console.error("Unexpected error fetching conversations:", err)
        setLoading(false)
      }
    }

    fetchConversations()

    // Subscribe to conversation changes
    const conversationChannel = supabase
      .channel("conversations_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        fetchConversations,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        fetchConversations,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(conversationChannel)
    }
  }, [currentUserId, supabase])

  // Fetch messages for specific conversation
  useEffect(() => {
    if (!currentUserId || !receiverId) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      try {
        // Get direct messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("direct_messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`,
          )
          .order("created_at", { ascending: true })

        if (messagesError) {
          console.error("Error fetching direct messages:", messagesError)
          return
        }

        // Get profiles for each message using separate queries
        const messagesWithProfiles = await Promise.all(
          (messagesData || []).map(async (message) => {
            const [senderProfile, receiverProfile] = await Promise.all([
              supabase.from("profiles").select("*").eq("id", message.sender_id).single(),
              supabase.from("profiles").select("*").eq("id", message.receiver_id).single(),
            ])

            return {
              ...message,
              sender: senderProfile.data || {
                id: message.sender_id,
                username: "Unknown User",
                full_name: null,
                avatar_url: null,
                is_online: false,
              },
              receiver: receiverProfile.data || {
                id: message.receiver_id,
                username: "Unknown User",
                full_name: null,
                avatar_url: null,
                is_online: false,
              },
            }
          }),
        )

        setMessages(messagesWithProfiles as DirectMessageWithProfile[])

        // Mark messages as read
        const unreadMessages = messagesData?.filter(
          (msg) => msg.sender_id === receiverId && msg.receiver_id === currentUserId && !msg.is_read,
        )

        if (unreadMessages && unreadMessages.length > 0) {
          await supabase
            .from("direct_messages")
            .update({ is_read: true })
            .eq("sender_id", receiverId)
            .eq("receiver_id", currentUserId)
            .eq("is_read", false)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
      }
    }

    fetchMessages()

    // Subscribe to new direct messages
    const messageChannel = supabase
      .channel(`dm_${currentUserId}_${receiverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        fetchMessages,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
    }
  }, [currentUserId, receiverId, supabase])

  const sendDirectMessage = async (content: string, receiverId: string) => {
    if (!currentUserId) return

    const { error } = await supabase.from("direct_messages").insert([
      {
        content,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message_type: "text",
      },
    ])

    if (error) {
      console.error("Error sending direct message:", error)
    }
  }

  const sendDirectImage = async (imageUrl: string, imageName: string, receiverId: string, caption?: string) => {
    if (!currentUserId) return

    const { error } = await supabase.from("direct_messages").insert([
      {
        content: caption || "",
        sender_id: currentUserId,
        receiver_id: receiverId,
        message_type: "image",
        image_url: imageUrl,
        image_name: imageName,
      },
    ])

    if (error) {
      console.error("Error sending direct image:", error)
    }
  }

  return {
    messages,
    conversations,
    loading,
    sendDirectMessage,
    sendDirectImage, // Added this line
    currentUserId,
  }
}
