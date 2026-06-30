'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n'

interface PhotoUploadProps {
  dayNumber: number
  onUploaded: (url: string) => void
}

export function PhotoUpload({ dayNumber, onUploaded }: PhotoUploadProps) {
  const { t } = useLanguage()
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<string>()
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string>()

  const onDrop = useCallback((files: File[]) => {
    const picked = files[0]
    if (!picked) return
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
    setSaved(false)
    setError(undefined)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    noKeyboard: true,
  })

  async function handleSave() {
    if (!file) return
    setUploading(true)
    setError(undefined)
    try {
      const form = new FormData()
      form.append('photo', file)
      form.append('dayNumber', String(dayNumber))
      const res = await fetch('/api/photos', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.text()
        let detail = body
        try { detail = JSON.parse(body).error ?? body } catch { /* not json */ }
        throw new Error(`${res.status}: ${detail}`)
      }
      const { url } = await res.json()
      onUploaded(url)
      setSaved(true)
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err instanceof Error ? err.message : t('photos.save_failed'))
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setFile(undefined)
    setPreview(undefined)
    setSaved(false)
    setError(undefined)
  }

  if (preview) {
    return (
      <div className="w-full space-y-3">
        <img src={preview} alt="Preview" className="w-full max-h-64 object-cover rounded-lg" />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {saved ? (
          <div className="flex items-center justify-center gap-2 text-green-500 text-sm">
            <Check className="h-4 w-4" /> {t('photos.day_saved', { n: dayNumber })}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={uploading} className="flex-1">
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('photos.uploading')}
                </span>
              ) : (
                t('photos.save')
              )}
            </Button>
            <Button onClick={reset} variant="outline" disabled={uploading}>
              {t('photos.change')}
            </Button>
          </div>
        )}
        {saved && (
          <Button onClick={reset} variant="outline" className="w-full">
            {t('photos.change')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <input {...getInputProps()} />
      <Camera className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mt-3 text-center">
        {`Drop Day ${dayNumber} photo here or click to select`}
      </p>
    </div>
  )
}
