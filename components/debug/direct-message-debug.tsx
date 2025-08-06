"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DirectMessageDebug() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [allMessages, setAllMessages] = useState<any[]>([])
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

      // Get all direct messages
      const { data: messages } = await supabase
        .from("direct_messages")
        .select("*")
        .order("created_at", { ascending: false })
      setAllMessages(messages || [])
    }

    init()
  }, [supabase])

  const sendTestMessage = async () => {
    if (!currentUser || !targetUserId || !testMessage) return

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
      // Refresh messages
      const { data: messages } = await supabase
        .from("direct_messages")
        .select("*")
        .order("created_at", { ascending: false })
      setAllMessages(messages || [])
    }
  }

  const refreshData = async () => {
    const { data: messages } = await supabase
      .from("direct_messages")
      .select("*")
      .order("created_at", { ascending: false })
    setAllMessages(messages || [])
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Direct Message Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p>
              <strong>Current User:</strong> {currentUser?.email} ({currentUser?.id})
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
                    {user.username} ({user.id})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Test message..." />
            <Button onClick={sendTestMessage} disabled={!targetUserId || !testMessage}>
              Send Test Message
            </Button>
            <Button onClick={refreshData} variant="outline">
              Refresh Data
            </Button>
          </div>

          <div>
            <h3 className="font-bold mb-2">All Direct Messages ({allMessages.length}):</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {allMessages.map((msg) => (
                <div key={msg.id} className="p-2 border rounded text-sm">
                  <p>
                    <strong>From:</strong> {msg.sender_id}
                  </p>
                  <p>
                    <strong>To:</strong> {msg.receiver_id}
                  </p>
                  <p>
                    <strong>Content:</strong> {msg.content}
                  </p>
                  <p>
                    <strong>Time:</strong> {new Date(msg.created_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Read:</strong> {msg.is_read ? "Yes" : "No"}
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
