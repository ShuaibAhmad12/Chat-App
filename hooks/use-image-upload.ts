"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"

interface UseImageUploadOptions {
  maxSizeInMB?: number
  allowedTypes?: string[]
}

export function useImageUpload({ 
  maxSizeInMB = 5, 
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] 
}: UseImageUploadOptions = {}) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const supabase = createClient()

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed. Please use: ${allowedTypes.join(', ')}`
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      return `File size must be less than ${maxSizeInMB}MB`
    }

    return null
  }

  const uploadImage = async (file: File): Promise<{ url: string; name: string } | null> => {
    const validationError = validateFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName)

      setUploadProgress(100)
      
      return {
        url: publicUrl,
        name: file.name
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const deleteImage = async (fileName: string): Promise<void> => {
    try {
      const { error } = await supabase.storage
        .from('chat-images')
        .remove([fileName])

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      throw error
    }
  }

  return {
    uploadImage,
    deleteImage,
    uploading,
    uploadProgress,
    validateFile
  }
}
