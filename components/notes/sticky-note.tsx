"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pin, PinOff, Trash2, Palette } from "lucide-react"
import type { NoteColor } from "@/lib/sticky-notes-types"

const noteColors: Record<NoteColor, { bg: string; border: string; text: string }> = {
  yellow: { bg: "bg-yellow-200", border: "border-yellow-300", text: "text-yellow-900" },
  pink: { bg: "bg-pink-200", border: "border-pink-300", text: "text-pink-900" },
  blue: { bg: "bg-blue-200", border: "border-blue-300", text: "text-blue-900" },
  green: { bg: "bg-green-200", border: "border-green-300", text: "text-green-900" },
  purple: { bg: "bg-purple-200", border: "border-purple-300", text: "text-purple-900" },
  orange: { bg: "bg-orange-200", border: "border-orange-300", text: "text-orange-900" },
  red: { bg: "bg-red-200", border: "border-red-300", text: "text-red-900" },
  gray: { bg: "bg-gray-200", border: "border-gray-300", text: "text-gray-900" },
}

interface StickyNoteProps {
  note: any
  onUpdate: (id: string, updates: any) => void
  onDelete: (id: string) => void
  onBringToFront: (id: string) => void
}

export function StickyNote({ note, onUpdate, onDelete, onBringToFront }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: note.position_x, y: note.position_y })
  const [size, setSize] = useState({ width: note.width, height: note.height })

  const noteRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const colorScheme = noteColors[note.color as NoteColor] || noteColors.yellow

  // Handle mouse down for dragging - only from header
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Prevent dragging if clicking on interactive elements
      const target = e.target as HTMLElement
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("button") ||
        target.closest('[role="menuitem"]') ||
        e.target === resizeRef.current
      ) {
        return
      }

      // Only allow dragging from the header area
      if (!headerRef.current?.contains(target)) {
        return
      }

      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
      onBringToFront(note.id)
      e.preventDefault()
      e.stopPropagation()
    },
    [position.x, position.y, note.id, onBringToFront],
  )

  // Handle mouse down for resizing
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    e.stopPropagation()
    e.preventDefault()
  }, [])

  // Handle mouse move and mouse up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, e.clientX - dragStart.x)
        const newY = Math.max(0, e.clientY - dragStart.y)
        setPosition({ x: newX, y: newY })
      } else if (isResizing) {
        const rect = noteRef.current?.getBoundingClientRect()
        if (rect) {
          const newWidth = Math.max(200, e.clientX - rect.left)
          const newHeight = Math.max(150, e.clientY - rect.top)
          setSize({ width: newWidth, height: newHeight })
        }
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        onUpdate(note.id, { position_x: position.x, position_y: position.y })
        setIsDragging(false)
      }
      if (isResizing) {
        onUpdate(note.id, { width: size.width, height: size.height })
        setIsResizing(false)
      }
    }

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, position, size, note.id, onUpdate])

  const handleSave = useCallback(() => {
    onUpdate(note.id, { title, content })
    setIsEditing(false)
  }, [note.id, title, content, onUpdate])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSave()
      }
      if (e.key === "Escape") {
        setTitle(note.title)
        setIsEditing(false)
      }
    },
    [handleSave, note.title],
  )

  const handleContentKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setContent(note.content)
        setIsEditing(false)
      }
      // Allow Ctrl+Enter or Cmd+Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave, note.content],
  )

  const handleColorChange = useCallback(
    (color: NoteColor) => {
      onUpdate(note.id, { color })
    },
    [note.id, onUpdate],
  )

  const handlePinToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onUpdate(note.id, { is_pinned: !note.is_pinned })
    },
    [note.id, note.is_pinned, onUpdate],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (window.confirm("Are you sure you want to delete this note?")) {
        onDelete(note.id)
      }
    },
    [note.id, onDelete],
  )

  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  // Update local state when note prop changes
  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setPosition({ x: note.position_x, y: note.position_y })
    setSize({ width: note.width, height: note.height })
  }, [note.title, note.content, note.position_x, note.position_y, note.width, note.height])

  return (
    <div
      ref={noteRef}
      className={`absolute select-none shadow-lg rounded-lg border-2 ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text} transition-shadow hover:shadow-xl`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: note.z_index,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onBringToFront(note.id)
      }}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className="flex items-center justify-between p-3 border-b border-current/20 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {note.is_pinned && <Pin className="h-4 w-4 text-current/60" />}
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-6 text-sm font-medium bg-transparent border-none p-0 focus:ring-0"
              onBlur={handleSave}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <h3
              className="text-sm font-medium truncate cursor-text hover:bg-current/10 px-1 py-0.5 rounded"
              onClick={handleTitleClick}
            >
              {note.title}
            </h3>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-current/10"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handlePinToggle}>
              {note.is_pinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin Note
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin Note
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="p-0">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-accent">
                  <Palette className="h-4 w-4 mr-2" />
                  Change Color
                </DropdownMenuTrigger>
                <DropdownMenuContent side="left" className="w-32">
                  {Object.entries(noteColors).map(([color, scheme]) => (
                    <DropdownMenuItem
                      key={color}
                      onClick={(e) => {
                        e.preventDefault()
                        handleColorChange(color as NoteColor)
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-4 h-4 rounded ${scheme.bg} ${scheme.border} border`} />
                      <span className="capitalize">{color}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 overflow-hidden">
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full resize-none bg-transparent border-none p-0 focus:ring-0 text-sm"
            placeholder="Write your note here..."
            onBlur={handleSave}
            onKeyDown={handleContentKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="w-full h-full text-sm whitespace-pre-wrap overflow-y-auto cursor-text custom-scrollbar hover:bg-current/5 p-1 rounded"
            onClick={handleContentClick}
          >
            {note.content || "Click to add content..."}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        ref={resizeRef}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100"
        onMouseDown={handleResizeMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-current/40" />
      </div>
    </div>
  )
}
