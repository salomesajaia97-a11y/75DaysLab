'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface Props {
  src: string
  className?: string
  loop?: boolean
  autoplay?: boolean
  /** Set false when a parent already controls viewport visibility. */
  deferUntilVisible?: boolean
}

export function LottiePlayer({
  src,
  className,
  loop = true,
  autoplay = true,
  deferUntilVisible = true,
}: Props) {
  const [data, setData] = useState<object | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = () =>
      fetch(src, { signal: controller.signal })
        .then(r => r.json())
        .then(setData)
        .catch(() => {/* fallback remains visible */})

    if (!deferUntilVisible) {
      load()
      return () => controller.abort()
    }

    const el = containerRef.current
    if (!el) return () => controller.abort()
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      load()
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => {
      observer.disconnect()
      controller.abort()
    }
  }, [src, deferUntilVisible])

  return (
    <div ref={containerRef} className={className}>
      {data && <Lottie animationData={data} loop={loop} autoplay={autoplay} />}
    </div>
  )
}
