"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile } from "@/lib/types"

interface UserCursorProps {
  x: number
  y: number
  profile: Profile
}

export function UserCursor({ x, y, profile }: UserCursorProps) {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-orange-500",
  ]

  // Generate consistent color based on user ID
  const colorIndex = profile.id.charCodeAt(0) % colors.length
  const cursorColor = colors[colorIndex]

  return (
    <div
      className="fixed pointer-events-none z-50 transition-all duration-100 ease-out"
      style={{
        left: x,
        top: y,
        transform: "translate(-2px, -2px)",
      }}
    >
      {/* Cursor pointer */}
      <div className="relative">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="drop-shadow-lg">
          <path
            d="M3 3L17 9L10 10L9 17L3 3Z"
            fill="currentColor"
            className={`${cursorColor.replace("bg-", "text-")} opacity-90`}
          />
          <path d="M3 3L17 9L10 10L9 17L3 3Z" stroke="white" strokeWidth="1" fill="none" />
        </svg>

        {/* User info tooltip */}
        <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/80 text-white px-2 py-1 rounded-md text-xs whitespace-nowrap backdrop-blur-sm">
          <Avatar className="h-4 w-4">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
            <AvatarFallback className={`text-xs ${cursorColor} text-white`}>
              {profile.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{profile.username}</span>
        </div>
      </div>
    </div>
  )
}
