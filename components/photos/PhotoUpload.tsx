'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  dayNumber: number
  onUploaded: (url: string) => void
}

export function PhotoUpload({ dayNumber, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string>()

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)
    // Phase 1: mock upload delay
    setTimeout(() => {
      setUploading(false)
      onUploaded(objectUrl)
    }, 1000)
  }, [onUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <input {...getInputProps()} />
      {preview ? (
        <div className="w-full space-y-2">
          <img src={preview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
          {uploading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          )}
        </div>
      ) : (
        <>
          <Camera className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3 text-center">
            {`Drop Day ${dayNumber} photo here or click to select`}
          </p>
        </>
      )}
    </div>
  )
}
