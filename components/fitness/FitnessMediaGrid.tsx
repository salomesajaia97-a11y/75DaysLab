'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Video, Loader2 } from 'lucide-react'
import { LottiePlayer } from '@/components/ui/LottiePlayer'
import type { FitnessMediaCategory } from '@/models/FitnessMedia'

interface MediaItem {
  _id: string
  title: string
  type: 'video' | 'gif' | 'lottie'
  url: string
  category: FitnessMediaCategory
  order: number
}

interface Props {
  category: FitnessMediaCategory
}

function VideoCard({ item }: { item: MediaItem }) {
  const isYouTube = item.url.includes('youtube.com') || item.url.includes('youtu.be')
  const isVimeo = item.url.includes('vimeo.com')

  let embedUrl: string | null = null
  if (isYouTube) {
    const id = item.url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
    if (id) embedUrl = `https://www.youtube.com/embed/${id}`
  } else if (isVimeo) {
    const id = item.url.match(/vimeo\.com\/(\d+)/)?.[1]
    if (id) embedUrl = `https://player.vimeo.com/video/${id}`
  }

  if (embedUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="relative aspect-video">
          <iframe
            src={embedUrl}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <p className="truncate px-2 py-1.5 text-xs font-medium">{item.title}</p>
      </div>
    )
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted"
    >
      <div className="mb-2 flex aspect-video items-center justify-center rounded-lg bg-muted text-3xl">
        <Video className="h-8 w-8 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium leading-tight">{item.title}</span>
      <span className="mt-2 flex items-center gap-1 text-xs text-primary">
        Watch <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  )
}

function GifCard({ item }: { item: MediaItem }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-background">
      <img
        src={item.url}
        alt={item.title}
        loading="lazy"
        className="aspect-square w-full object-contain bg-muted"
      />
      <figcaption className="truncate px-2 py-1.5 text-xs font-medium">
        {item.title}
      </figcaption>
    </figure>
  )
}

function LottieCard({ item }: { item: MediaItem }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-background">
      <LottiePlayer src={item.url} className="aspect-square bg-muted" />
      <figcaption className="truncate px-2 py-1.5 text-xs font-medium">
        {item.title}
      </figcaption>
    </figure>
  )
}

export function FitnessMediaGrid({ category }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [status, setStatus] = useState<'loading' | 'empty' | 'ok'>('loading')

  useEffect(() => {
    setStatus('loading')
    fetch(`/api/fitness-media?category=${category}`)
      .then(r => r.json())
      .then((data: MediaItem[]) => {
        setItems(data)
        setStatus(data.length === 0 ? 'empty' : 'ok')
      })
      .catch(() => setStatus('empty'))
  }, [category])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading media…
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No media added yet for this focus. Add some in the{' '}
        <a href="/admin/fitness-media" className="underline hover:text-foreground">
          admin panel
        </a>
        .
      </p>
    )
  }

  const videos = items.filter(i => i.type === 'video')
  const visuals = items.filter(i => i.type !== 'video')

  return (
    <div className="space-y-4">
      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map(item => <VideoCard key={item._id} item={item} />)}
        </div>
      )}
      {visuals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visuals.map(item =>
            item.type === 'gif'
              ? <GifCard key={item._id} item={item} />
              : <LottieCard key={item._id} item={item} />
          )}
        </div>
      )}
    </div>
  )
}
