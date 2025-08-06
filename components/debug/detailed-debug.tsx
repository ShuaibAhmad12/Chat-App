"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function DetailedDebug() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [rawMessages, setRawMessages] = useState<any[]>([])
  const [messagesWithProfiles, setMessagesWithProfiles] = useState<any[]>([])
  const [testMessage, setTestMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const runDiagnostics = async () => {
      console.log("🔍 Running detailed diagnostics...")
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log("👤 Current user:", user, userError)
        setCurrentUser(user)

        // Test 1: Raw messages count
        const { count: messageCount, error: countError } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
        
        console.log("📊 Message count:", messageCount, countError)

        // Test 2: Raw messages
        const { data: rawMsgs, error: rawError } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10)

        console.log("📝 Raw messages:", rawMsgs, rawError)
        setRawMessages(rawMsgs || [])

        // Test 3: Messages with profiles
        const { data: msgsWithProfiles, error: joinError } = await supabase
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
          .limit(10)

        console.log("🔗 Messages with profiles:", msgsWithProfiles, joinError)
        setMessagesWithProfiles(msgsWithProfiles || [])

        // Test 4: Profiles count
        const { count: profileCount, error: profileCountError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })

        console.log("👥 Profile count:", profileCount, profileCountError)

        // Test 5: Current user's profile
        if (user) {
          const { data: userProfile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          console.log("👤 User profile:", userProfile, profileError)
        }

        setDebugInfo({
          messageCount,
          profileCount,
          rawMessagesLength: rawMsgs?.length || 0,
          messagesWithProfilesLength: msgsWithProfiles?.length || 0,
          hasUser: !!user,
          errors: {
            countError: countError?.message,
            rawError: rawError?.message,
            joinError: joinError?.message,
            profileCountError: profileCountError?.message
          }
        })

      } catch (err) {
        console.error("💥 Diagnostics error:", err)
        setError(`Diagnostics failed: ${err}`)
      }
    }

    runDiagnostics()
  }, [supabase])

  const sendTestMessage = async () => {
    if (!currentUser || !testMessage) return

    console.log("📤 Sending test message...")
    setError(null)

    try {
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
        console.error("❌ Send error:", error)
        setError(`Send failed: ${error.message}`)
      } else {
        console.log("✅ Send success:", data)
        setTestMessage("")
        // Refresh diagnostics
        window.location.reload()
      }
    } catch (err) {
      console.error("💥 Send exception:", err)
      setError(`Send exception: ${err}`)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Detailed Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Message Count:</strong> {debugInfo.messageCount ?? 'Loading...'}
            </div>
            <div>
              <strong>Profile Count:</strong> {debugInfo.profileCount ?? 'Loading...'}
            </div>
            <div>
              <strong>Raw Messages Fetched:</strong> {debugInfo.rawMessagesLength}
            </div>
            <div>
              <strong>Messages with Profiles:</strong> {debugInfo.messagesWithProfilesLength}
            </div>
            <div>
              <strong>Has User:</strong> {debugInfo.hasUser ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>User ID:</strong> {currentUser?.id?.slice(0, 8) || 'None'}...
            </div>
          </div>

          {debugInfo.errors && (
            <div className="space-y-2">
              <h4 className="font-semibold">Errors:</h4>
              {Object.entries(debugInfo.errors).map(([key, value]) => {
                return value ? (
                  <div key={key} className="text-red-600 text-sm">
                    <strong>{key}:</strong> {String(value)}
                  </div>
                ) : null
              })}
            </div>
          )}

          <div className="space-y-2">
            <Input 
              value={testMessage} 
              onChange={(e) => setTestMessage(e.target.value)} 
              placeholder="Test message..." 
            />
            <Button onClick={sendTestMessage} disabled={!testMessage || !currentUser}>
              Send Test Message
            </Button>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Raw Messages ({rawMessages.length}):</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {rawMessages.map((msg) => (
                <div key={msg.id} className="p-2 border rounded text-xs">
                  <div><strong>ID:</strong> {msg.id.slice(0, 8)}...</div>
                  <div><strong>Content:</strong> {msg.content}</div>
                  <div><strong>User ID:</strong> {msg.user_id.slice(0, 8)}...</div>
                  <div><strong>Created:</strong> {new Date(msg.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Messages with Profiles ({messagesWithProfiles.length}):</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {messagesWithProfiles.map((msg) => (
                <div key={msg.id} className="p-2 border rounded text-xs">
                  <div><strong>Content:</strong> {msg.content}</div>
                  <div><strong>Username:</strong> {msg.profiles?.username || 'No profile'}</div>
                  <div><strong>Profile ID:</strong> {msg.profiles?.id?.slice(0, 8) || 'None'}...</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
