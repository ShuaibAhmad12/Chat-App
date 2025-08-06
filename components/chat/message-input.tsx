"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from 'lucide-react'
import { ImageUploadButton } from "./image-upload-button"

interface MessageInputProps {
  onSendMessage: (content: string) => void
  onSendImage?: (imageUrl: string, imageName: string) => void
  disabled?: boolean
}

export function MessageInput({ onSendMessage, onSendImage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleImageUploaded = (imageUrl: string, imageName: string) => {
    if (onSendImage) {
      onSendImage(imageUrl, imageName)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t relative">
      <div className="relative">
        <ImageUploadButton
          onImageUploaded={handleImageUploaded}
          disabled={disabled}
          className="relative"
        />
      </div>
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1"
      />
      <Button type="submit" disabled={!message.trim() || disabled} size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
