"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeMessages } from "../../hooks/use-realtime-messages"
import { useDirectMessages } from "@/hooks/use-direct-messages"
import { useUserPresence } from "@/hooks/use-user-presence"
import { useNotifications } from "@/hooks/use-notifications"
import { MessageItem } from "./message-item"
import { MessageInput } from "./message-input"
import { ConversationsList } from "./conversations-list"
import { DirectMessageInterface } from "./direct-message-interface"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogOut, MessageCircle, Users, Settings } from "lucide-react"
import type { Profile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useHeartbeat } from "@/hooks/use-heartbeat"
import { UserStatusIndicator } from "./user-status-indicator"
import { DetailedDebug } from "../debug/detailed-debug"
import { CursorDebug } from "../debug/cursor-debug"

export function ChatInterface() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState("general")
  const [debugMode, setDebugMode] = useState(false)

  // General chat hooks - now using the fixed version with image support
  const { messages, loading, sendMessage, sendImage, error } = useRealtimeMessages()

  // Direct messages hooks
  const { conversations } = useDirectMessages()

  // User presence and notifications
  const { onlineUsers } = useUserPresence()
  const { hasPermission } = useNotifications()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Add heartbeat hook
  const { sendHeartbeat } = useHeartbeat({ interval: 45000 })

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSelectUser = (user: Profile) => {
    setSelectedUser(user)
    setActiveTab("direct")
  }

  const handleBackToList = () => {
    setSelectedUser(null)
  }

  const handleSendImage = (imageUrl: string, imageName: string) => {
    sendImage(imageUrl, imageName)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center glass-effect p-8 rounded-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your chat experience...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card/50 backdrop-blur-sm hidden md:flex flex-col shadow-lg">
        <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                ChatApp
              </h1>
            </div>
            <div className="flex gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => setDebugMode(!debugMode)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {currentUser && (
            <div className="mt-3 p-3 rounded-lg bg-card/50 backdrop-blur-sm">
              <p className="text-sm font-medium">
                Welcome back, {currentUser.user_metadata?.username || currentUser.email?.split("@")[0]}! 👋
              </p>
              {!hasPermission && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  🔔 Enable notifications for message alerts
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50">
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="direct"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Direct
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    Online Users
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-primary/20">
                      {onlineUsers.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {onlineUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No users online right now</p>
                    </div>
                  ) : (
                    onlineUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1">
                            <UserStatusIndicator user={user} size="sm" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.username}</p>
                          {user.full_name && <p className="text-xs text-muted-foreground truncate">{user.full_name}</p>}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSelectUser(user)}
                          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                        >
                          Message
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="direct" className="mt-4">
              <ConversationsList
                conversations={conversations}
                onlineUsers={onlineUsers.filter((user) => user.id !== currentUser?.id)}
                onSelectConversation={setSelectedUser}
                onSelectUser={handleSelectUser}
                selectedUserId={selectedUser?.id}
              />
            </TabsContent>
          </Tabs>

         {debugMode && (
        <div className="mt-4 space-y-4">
          <DetailedDebug />
          <CursorDebug />
        </div>
      )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === "direct" && selectedUser ? (
          <DirectMessageInterface otherUser={selectedUser} onBack={handleBackToList} />
        ) : (
          <Card className="flex-1 rounded-none border-0 md:border md:rounded-2xl md:m-4 bg-card/50 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">General Chat</h2>
                  <p className="text-sm text-muted-foreground font-normal">
                    {messages.length} messages • {onlineUsers.length} online
                  </p>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 h-[calc(100vh-200px)] md:h-[calc(100vh-280px)] custom-scrollbar">
                <div className="p-4 space-y-4">
                  {/* Show error if any */}
                  {error && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Welcome to General Chat!</h3>
                      <p className="text-muted-foreground">Start the conversation and connect with others</p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div key={message.id} className="message-animate">
                        <MessageItem message={message} isOwn={message.user_id === currentUser?.id} />
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input - Only show for general chat */}
              <div className="border-t bg-card/30 backdrop-blur-sm">
                <MessageInput onSendMessage={sendMessage} onSendImage={handleSendImage} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t p-2 z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="direct"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Direct
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">
            {activeTab === "direct" && selectedUser ? selectedUser.username : "ChatApp"}
          </h1>
          <div className="flex items-center gap-2">
            {activeTab === "direct" && selectedUser && (
              <Button variant="ghost" size="sm" onClick={handleBackToList}>
                Back
              </Button>
            )}
            <Badge variant="secondary" className="text-xs">
              {onlineUsers.length} online
            </Badge>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
