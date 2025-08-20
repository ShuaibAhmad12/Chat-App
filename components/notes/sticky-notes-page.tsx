"use client"

import type React from "react"

import { useState } from "react"
import { useStickyNotes } from "@/hooks/use-sticky-notes"
import { useCursorTracking } from "@/hooks/use-cursor-tracking"
import { StickyNote } from "./sticky-note"
import { UserCursor } from "../shared/user-cursor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, StickyNoteIcon, Grid3X3, List, Search, ArrowLeft, Pin, PinOff, Trash2, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { NoteColor } from "@/lib/sticky-notes-types"

interface StickyNotesPageProps {
  onBack?: () => void
}

export function StickyNotesPage({ onBack }: StickyNotesPageProps) {
  const { notes, loading, error, createNote, updateNote, deleteNote, bringToFront } = useStickyNotes()
  const { cursors } = useCursorTracking()
  const [viewMode, setViewMode] = useState<"board" | "list">("board")
  const [searchTerm, setSearchTerm] = useState("")
  const [colorFilter, setColorFilter] = useState<NoteColor | "all">("all")

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesColor = colorFilter === "all" || note.color === colorFilter
    return matchesSearch && matchesColor
  })

  const handleCreateNote = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    await createNote({
      title: "New Note",
      content: "",
      position_x: Math.floor(Math.random() * 400) + 50,
      position_y: Math.floor(Math.random() * 300) + 50,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background relative">
      {/* Render other users' cursors */}
      {cursors.map(
        (cursor) =>
          cursor.profile && (
            <UserCursor key={cursor.id} x={cursor.cursor_x} y={cursor.cursor_y} profile={cursor.profile} />
          ),
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <StickyNoteIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">My Sticky Notes</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{notes.length} notes</span>
                    {cursors.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <Badge variant="secondary" className="text-xs">
                            {cursors.length} viewing
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "board" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("board")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Create Note Button */}
              <Button
                onClick={handleCreateNote}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="container mx-auto px-4 py-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {viewMode === "board" ? (
          /* Board View */
          <div className="relative min-h-[800px]">
            {filteredNotes.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <StickyNoteIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first sticky note to get started!</p>
                  <Button
                    onClick={handleCreateNote}
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Note
                  </Button>
                </div>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                  onBringToFront={bringToFront}
                />
              ))
            )}
          </div>
        ) : (
          /* List View */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <StickyNoteIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No notes found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? "Try adjusting your search terms" : "Create your first sticky note to get started!"}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={handleCreateNote}
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Note
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <Card key={note.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded ${
                          note.color === "yellow"
                            ? "bg-yellow-400"
                            : note.color === "pink"
                              ? "bg-pink-400"
                              : note.color === "blue"
                                ? "bg-blue-400"
                                : note.color === "green"
                                  ? "bg-green-400"
                                  : note.color === "purple"
                                    ? "bg-purple-400"
                                    : note.color === "orange"
                                      ? "bg-orange-400"
                                      : note.color === "red"
                                        ? "bg-red-400"
                                        : "bg-gray-400"
                        }`}
                      />
                      {note.title}
                      {note.is_pinned && <Pin className="h-4 w-4 text-muted-foreground" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{note.content || "No content"}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => updateNote(note.id, { is_pinned: !note.is_pinned })}
                        >
                          {note.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            if (window.confirm("Are you sure you want to delete this note?")) {
                              deleteNote(note.id)
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
