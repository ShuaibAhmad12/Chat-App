"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SimpleDMTest() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [testMessage, setTestMessage] = useState("")
  const [targetUserId, setTargetUserId] = useState("")
  const [allUsers, setAllUsers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Get all users
      const { data: users } = await supabase.from("profiles").select("*")
      setAllUsers(users || [])

      // Initial fetch of messages
      fetchMessages()
    }

    init()
  }, [supabase])

  const fetchMessages = async () => {
    const { data: messages } = await supabase
      .from("direct_messages")
      .select("*")
      .order("created_at", { ascending: false })
    setMessages(messages || [])
    console.log("Fetched messages:", messages)
  }

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("dm_test")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          console.log("Real-time update:", payload)
          fetchMessages() // Refetch all messages
        },
      )
      .subscribe((status) => {
        console.log("Subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const sendTestMessage = async () => {
    if (!currentUser || !targetUserId || !testMessage) return

    console.log("Sending message:", { testMessage, targetUserId, currentUserId: currentUser.id })

    const { data, error } = await supabase
      .from("direct_messages")
      .insert([
        {
          content: testMessage,
          sender_id: currentUser.id,
          receiver_id: targetUserId,
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
          <CardTitle>Simple DM Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p>
              <strong>Current User:</strong> {currentUser?.email}
            </p>
          </div>

          <div className="space-y-2">
            <label>Target User:</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select user...</option>
              {allUsers
                .filter((u) => u.id !== currentUser?.id)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Test message..." />
            <Button onClick={sendTestMessage} disabled={!targetUserId || !testMessage}>
              Send Test Message
            </Button>
            <Button onClick={fetchMessages} variant="outline">
              Refresh Messages
            </Button>
          </div>

          <div>
            <h3 className="font-bold mb-2">All Messages ({messages.length}):</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="p-2 border rounded text-sm">
                  <p>
                    <strong>Content:</strong> {msg.content}
                  </p>
                  <p>
                    <strong>From:</strong> {msg.sender_id.slice(0, 8)}...
                  </p>
                  <p>
                    <strong>To:</strong> {msg.receiver_id.slice(0, 8)}...
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
