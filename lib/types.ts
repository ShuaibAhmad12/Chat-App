export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  last_seen: string
  is_online: boolean
}

export interface Message {
  id: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
  image_url?: string | null
  image_name?: string | null
  message_type: 'text' | 'image'
  profiles?: Profile
}

export interface ChatMessage extends Message {
  profiles: Profile
}

export interface DirectMessage {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  created_at: string
  updated_at: string
  is_read: boolean
  image_url?: string | null
  image_name?: string | null
  message_type: 'text' | 'image'
  sender?: Profile
  receiver?: Profile
}

export interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  last_message_at: string
  created_at: string
  other_user?: Profile
  last_message?: DirectMessage
  unread_count?: number
}

export interface DirectMessageWithProfile extends DirectMessage {
  sender: Profile
  receiver: Profile
}
