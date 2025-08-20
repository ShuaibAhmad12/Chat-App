"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useCursorTracking } from "@/hooks/use-cursor-tracking"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MousePointer, Users, Database, Zap } from "lucide-react"

export function CursorDebug() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [testConversationId, setTestConversationId] = useState("test_conversation_123")
  const [enabled, setEnabled] = useState(true)
  const [dbCursors, setDbCursors] = useState<any[]>([])
  const [rpcExists, setRpcExists] = useState<boolean | null>(null)
  const supabase = createClient()

  const { cursors, updateCursorPosition } = useCursorTracking({
    conversationId: testConversationId,
    enabled,
  })

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [supabase])

  const fetchDbCursors = async () => {
    try {
      const { data, error } = await supabase
        .from("user_cursors")
        .select(`
          *,
          profiles:user_id (
            username,
            full_name
          )
        `)
        .order("updated_at", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error fetching DB cursors:", error)
      } else {
        setDbCursors(data || [])
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const testRpcFunction = async () => {
    if (!currentUserId) return

    try {
      const { error } = await supabase.rpc("update_cursor_position", {
        p_user_id: currentUserId,
        p_conversation_id: testConversationId,
        p_cursor_x: 100,
        p_cursor_y: 100,
      })

      if (error) {
        console.error("RPC Error:", error)
        setRpcExists(false)
      } else {
        console.log("RPC function works!")
        setRpcExists(true)
        fetchDbCursors()
      }
    } catch (error) {
      console.error("RPC Test Error:", error)
      setRpcExists(false)
    }
  }

  const testDirectInsert = async () => {
    if (!currentUserId) return

    try {
      const { error } = await supabase.from("user_cursors").upsert(
        {
          user_id: currentUserId,
          conversation_id: testConversationId,
          cursor_x: Math.floor(Math.random() * 500),
          cursor_y: Math.floor(Math.random() * 500),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,conversation_id",
        },
      )

      if (error) {
        console.error("Direct insert error:", error)
      } else {
        console.log("Direct insert successful!")
        fetchDbCursors()
      }
    } catch (error) {
      console.error("Direct insert error:", error)
    }
  }

  const clearCursors = async () => {
    try {
      const { error } = await supabase.from("user_cursors").delete().eq("conversation_id", testConversationId)

      if (error) {
        console.error("Clear cursors error:", error)
      } else {
        console.log("Cursors cleared!")
        fetchDbCursors()
      }
    } catch (error) {
      console.error("Clear cursors error:", error)
    }
  }

  useEffect(() => {
    fetchDbCursors()
    const interval = setInterval(fetchDbCursors, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Cursor Tracking Debug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="conversation-id">Test Conversation ID</Label>
              <Input
                id="conversation-id"
                value={testConversationId}
                onChange={(e) => setTestConversationId(e.target.value)}
                placeholder="Enter conversation ID"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => setEnabled(!enabled)} variant={enabled ? "default" : "outline"}>
                {enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={testRpcFunction} size="sm">
              <Zap className="h-4 w-4 mr-1" />
              Test RPC
            </Button>
            <Button onClick={testDirectInsert} size="sm" variant="outline">
              <Database className="h-4 w-4 mr-1" />
              Test Direct Insert
            </Button>
            <Button onClick={fetchDbCursors} size="sm" variant="outline">
              Refresh DB
            </Button>
            <Button onClick={clearCursors} size="sm" variant="destructive">
              Clear Test Cursors
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Real-time Cursors ({cursors.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {cursors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cursors detected</p>
                ) : (
                  cursors.map((cursor) => (
                    <div key={cursor.id} className="text-xs bg-muted p-2 rounded">
                      <div className="font-medium">{cursor.profile?.username || "Unknown"}</div>
                      <div>
                        Position: ({cursor.cursor_x}, {cursor.cursor_y})
                      </div>
                      <div>Updated: {new Date(cursor.updated_at).toLocaleTimeString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Cursors ({dbCursors.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {dbCursors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cursors in database</p>
                ) : (
                  dbCursors.map((cursor) => (
                    <div key={cursor.id} className="text-xs bg-muted p-2 rounded">
                      <div className="font-medium">{cursor.profiles?.username || "Unknown"}</div>
                      <div>
                        Position: ({cursor.cursor_x}, {cursor.cursor_y})
                      </div>
                      <div>Conversation: {cursor.conversation_id}</div>
                      <div>Updated: {new Date(cursor.updated_at).toLocaleTimeString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <Badge variant={rpcExists === true ? "default" : rpcExists === false ? "destructive" : "secondary"}>
              RPC Function: {rpcExists === null ? "Unknown" : rpcExists ? "Working" : "Failed"}
            </Badge>
            <Badge variant={currentUserId ? "default" : "destructive"}>
              User ID: {currentUserId ? "Set" : "Missing"}
            </Badge>
            <Badge variant={enabled ? "default" : "secondary"}>Tracking: {enabled ? "On" : "Off"}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
