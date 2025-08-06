"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function GeneralChatDebug() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [testMessage, setTestMessage] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Initial fetch of messages
      fetchMessages()
    }

    init()
  }, [supabase])

  const fetchMessages = async () => {
    console.log("Fetching general messages...")
    
    const { data: messages, error } = await supabase
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
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching messages:", error)
    } else {
      console.log("Fetched messages:", messages)
      setMessages(messages || [])
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("general_debug")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("Real-time general message update:", payload)
          fetchMessages() // Refetch all messages
        },
      )
      .subscribe((status) => {
        console.log("General debug subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const sendTestMessage = async () => {
    if (!currentUser || !testMessage) return

    console.log("Sending general test message:", { testMessage, currentUserId: currentUser.id })

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          content: testMessage,
          user_id: currentUser.id,
        },
      ])
      .select()

    if (error) {
      console.error("Error:", error)
    } else {
      console.log("Success:", data)
      setTestMessage("")
      fetchMessages() // Manually refresh
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>General Chat Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p>
              <strong>Current User:</strong> {currentUser?.email}
            </p>
          </div>

          <div className="space-y-2">
            <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Test message..." />
            <Button onClick={sendTestMessage} disabled={!testMessage}>
              Send Test Message
            </Button>
            <Button onClick={fetchMessages} variant="outline">
              Refresh Messages
            </Button>
          </div>

          <div>
            <h3 className="font-bold mb-2">All General Messages ({messages.length}):</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="p-2 border rounded text-sm">
                  <p>
                    <strong>Content:</strong> {msg.content}
                  </p>
                  <p>
                    <strong>User:</strong> {msg.profiles?.username || 'Unknown'} ({msg.user_id.slice(0, 8)}...)
                  </p>
                  <p>
                    <strong>Time:</strong> {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
