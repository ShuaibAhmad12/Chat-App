"use client"

import { useEffect, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import { useDirectMessages } from "@/hooks/use-direct-messages"
import { MessageInput } from "./message-input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageCircle, Download, ExternalLink } from 'lucide-react'
import type { Profile } from "@/lib/types"
import { UserStatusIndicator } from "./user-status-indicator"

interface DirectMessageInterfaceProps {
  otherUser: Profile
  onBack: () => void
}

export function DirectMessageInterface({ otherUser, onBack }: DirectMessageInterfaceProps) {
  const { messages, sendDirectMessage, sendDirectImage, currentUserId } = useDirectMessages(otherUser.id)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (content: string) => {
    sendDirectMessage(content, otherUser.id)
  }

  const handleSendImage = (imageUrl: string, imageName: string) => {
    sendDirectImage(imageUrl, imageName, otherUser.id)
  }

  const handleImageClick = (imageUrl: string) => {
    window.open(imageUrl, '_blank')
  }

  const handleImageDownload = async (imageUrl: string, imageName: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = imageName || 'image.jpg'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  return (
    <Card className="flex-1 rounded-none border-0 md:border md:rounded-2xl md:m-4 bg-card/50 backdrop-blur-sm shadow-xl">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardTitle className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden hover:bg-primary/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={otherUser.avatar_url || undefined} alt={otherUser.username} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
              {otherUser.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{otherUser.username}</h2>
              <UserStatusIndicator user={otherUser} showText size="sm" />
            </div>
            {otherUser.full_name && (
              <p className="text-sm font-normal text-muted-foreground">{otherUser.full_name}</p>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea className="flex-1 h-[calc(100vh-200px)] md:h-[calc(100vh-280px)] custom-scrollbar">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Start your conversation</h3>
                <p className="text-muted-foreground">Send a message to {otherUser.username}</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === currentUserId
                const timestamp = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

                return (
                  <div key={message.id} className={`flex gap-3 mb-4 message-animate ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-primary/10">
                      <AvatarImage
                        src={isOwn ? message.sender.avatar_url || undefined : message.receiver.avatar_url || undefined}
                        alt={isOwn ? message.sender.username : message.receiver.username}
                      />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-muted to-muted/50">
                        {(isOwn ? message.sender.username : message.receiver.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                      <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-xs text-muted-foreground">{timestamp}</span>
                      </div>

                      {message.message_type === 'image' && message.image_url ? (
                        <div
                          className={`relative group rounded-xl overflow-hidden max-w-sm shadow-lg ${
                            isOwn ? "rounded-br-sm" : "rounded-bl-sm"
                          }`}
                        >
                          <img
                            src={message.image_url || "/placeholder.svg"}
                            alt={message.image_name || "Shared image"}
                            className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick(message.image_url!)}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleImageClick(message.image_url!)}
                                className="bg-white/90 hover:bg-white shadow-lg"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleImageDownload(message.image_url!, message.image_name || 'image.jpg')}
                                className="bg-white/90 hover:bg-white shadow-lg"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {message.content && (
                            <div className="p-3 bg-gradient-to-t from-black/70 to-transparent text-white text-sm">
                              {message.content}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`px-4 py-3 rounded-xl break-words shadow-sm ${
                            isOwn 
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm" 
                              : "bg-muted/50 text-foreground rounded-bl-sm border border-border/50"
                          }`}
                        >
                          {message.content}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input - Only for direct messages */}
        <div className="border-t bg-card/30 backdrop-blur-sm">
          <MessageInput onSendMessage={handleSendMessage} onSendImage={handleSendImage} />
        </div>
      </CardContent>
    </Card>
  )
}
