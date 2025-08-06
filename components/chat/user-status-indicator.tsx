"use client"

import { formatDistanceToNow } from "date-fns"
import type { Profile } from "@/lib/types"

interface UserStatusIndicatorProps {
  user: Profile
  showText?: boolean
  size?: "sm" | "md" | "lg"
}

export function UserStatusIndicator({ user, showText = false, size = "md" }: UserStatusIndicatorProps) {
  const isOnline = user.is_online
  const lastSeen = new Date(user.last_seen)
  const now = new Date()
  const timeDiff = now.getTime() - lastSeen.getTime()
  
  // Consider user online if last seen within 2 minutes
  const isRecentlyActive = timeDiff < 2 * 60 * 1000
  const actuallyOnline = isOnline && isRecentlyActive

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4"
  }

  const getStatusColor = () => {
    if (actuallyOnline) return "bg-green-500"
    if (timeDiff < 5 * 60 * 1000) return "bg-yellow-500" // Away (within 5 minutes)
    return "bg-gray-400" // Offline
  }

  const getStatusText = () => {
    if (actuallyOnline) return "Online"
    if (timeDiff < 5 * 60 * 1000) return "Away"
    return `Last seen ${formatDistanceToNow(lastSeen, { addSuffix: true })}`
  }

  return (
    <div className="flex items-center gap-1">
      <div 
        className={`${sizeClasses[size]} ${getStatusColor()} border-2 border-white rounded-full`}
        title={getStatusText()}
      />
      {showText && (
        <span className="text-xs text-gray-500">
          {getStatusText()}
        </span>
      )}
    </div>
  )
}
