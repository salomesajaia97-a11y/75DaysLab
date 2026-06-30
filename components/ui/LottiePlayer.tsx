'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface Props {
  src: string
  className?: string
  loop?: boolean
  autoplay?: boolean
}

export function LottiePlayer({ src, className, loop = true, autoplay = true }: Props) {
  const [data, setData] = useState<object | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect()
          fetch(src)
            .then(r => r.json())
            .then(setData)
            .catch(() => {/* silently fail */})
        }
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [src])

  return (
    <div ref={containerRef} className={className}>
      {data && <Lottie animationData={data} loop={loop} autoplay={autoplay} />}
    </div>
  )
}
