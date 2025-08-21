export interface StickyNote {
  id: string
  title: string
  content: string
  color: string
  position_x: number
  position_y: number
  width: number
  height: number
  user_id: string
  created_at: string
  updated_at: string
  is_pinned: boolean
  z_index: number
}

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "purple" | "orange" | "red" | "gray"

export interface CreateNoteData {
  title?: string
  content?: string
  color?: NoteColor
  position_x?: number
  position_y?: number
  width?: number
  height?: number
}

export interface UpdateNoteData {
  title?: string
  content?: string
  color?: NoteColor
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  is_pinned?: boolean
  z_index?: number
}

export interface StickyNoteProps {
  note: StickyNote
  onUpdate: (id: string, updates: Partial<StickyNote>) => void
  onDelete: (id: string) => void
  onBringToFront: (id: string) => void
}
