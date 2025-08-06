"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageIcon, Loader2, X } from 'lucide-react'
import { useImageUpload } from "@/hooks/use-image-upload"

interface ImageUploadButtonProps {
  onImageUploaded: (imageUrl: string, imageName: string) => void
  disabled?: boolean
  className?: string
}

export function ImageUploadButton({ onImageUploaded, disabled, className }: ImageUploadButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadImage, uploading, uploadProgress } = useImageUpload()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const result = await uploadImage(file)
      if (result) {
        onImageUploaded(result.url, result.name)
        setPreview(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
      setPreview(null)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const cancelUpload = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        title="Upload image"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </Button>

      {uploading && uploadProgress > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white border rounded shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Uploading image...</span>
            <Button variant="ghost" size="sm" onClick={cancelUpload}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {preview && !uploading && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white border rounded shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Preview</span>
            <Button variant="ghost" size="sm" onClick={cancelUpload}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <img src={preview || "/placeholder.svg"} alt="Preview" className="max-w-full h-20 object-cover rounded" />
        </div>
      )}

      {error && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
