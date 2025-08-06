"use client"

import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink } from 'lucide-react'
import type { ChatMessage } from "@/lib/types"

interface MessageItemProps {
  message: ChatMessage
  isOwn: boolean
}

export function MessageItem({ message, isOwn }: MessageItemProps) {
  const timestamp = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })

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
    <div className={`flex gap-3 mb-4 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/10">
        <AvatarImage src={message.profiles.avatar_url || undefined} alt={message.profiles.username} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
          {message.profiles.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-2 mb-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-sm font-medium text-foreground">{message.profiles.username}</span>
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
}
