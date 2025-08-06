"use client"

import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Users, Plus } from 'lucide-react'
import { UserStatusIndicator } from "./user-status-indicator"
import type { Conversation, Profile } from "@/lib/types"

interface ConversationsListProps {
  conversations: Conversation[]
  onlineUsers: Profile[]
  onSelectConversation: (user: Profile) => void
  onSelectUser: (user: Profile) => void
  selectedUserId?: string
}

export function ConversationsList({
  conversations,
  onlineUsers,
  onSelectConversation,
  onSelectUser,
  selectedUserId,
}: ConversationsListProps) {
  return (
    <div className="space-y-4">
      {/* Recent Conversations */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            Recent Chats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48 custom-scrollbar">
            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start chatting with someone below!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.other_user!)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-all duration-200 group ${
                      selectedUserId === conversation.other_user?.id 
                        ? "bg-primary/10 border border-primary/20 shadow-sm" 
                        : "hover:shadow-sm"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                        <AvatarImage
                          src={conversation.other_user?.avatar_url || undefined}
                          alt={conversation.other_user?.username}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
                          {conversation.other_user?.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1">
                        <UserStatusIndicator user={conversation.other_user!} size="sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {conversation.other_user?.username}
                        </p>
                        <div className="flex items-center gap-2">
                          {conversation.unread_count! > 0 && (
                            <Badge variant="destructive" className="text-xs px-2 py-0.5 bg-primary text-primary-foreground">
                              {conversation.unread_count}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {conversation.other_user?.full_name && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{conversation.other_user.full_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Online Users */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Plus className="h-4 w-4 text-white" />
            </div>
            Start New Chat
            <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-primary/20">
              {onlineUsers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48 custom-scrollbar">
            {onlineUsers.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No users online</p>
              </div>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-all duration-200 group hover:shadow-sm"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/10">
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
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
