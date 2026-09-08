'use client'

import { useEffect, useRef } from 'react'
import { createNoise3D } from 'simplex-noise'

export default function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const noise3D = createNoise3D()

    // Small resolution for blocky noise that gets blurred
    const width = 64
    const height = 64
    canvas.width = width
    canvas.height = height

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    let z = 0
    let animFrameId: number
    let running = true
    let lastRenderMs = 0
    const TARGET_FPS = 5
    const FRAME_INTERVAL_MS = 1000 / TARGET_FPS   // 200 ms per frame

    const render = (now: number) => {
      if (!running) return

      animFrameId = requestAnimationFrame(render)

      const elapsed = now - lastRenderMs
      if (elapsed < FRAME_INTERVAL_MS) return
      lastRenderMs = now - (elapsed % FRAME_INTERVAL_MS)

      z += 0.05

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const value = noise3D(x * 0.1, y * 0.1, z)
          // Map -1..1 to 0..255
          const brightness = (value + 1) * 128

          const idx = (x + y * width) * 4
          data[idx]     = 28   // R
          data[idx + 1] = 31   // G
          data[idx + 2] = 43   // B
          data[idx + 3] = brightness * 0.08  // 8% opacity noise
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }

    // Pause when the tab is hidden (Page Visibility API)
    const handleVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(animFrameId)
      } else {
        running = true
        lastRenderMs = 0
        animFrameId = requestAnimationFrame(render)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    animFrameId = requestAnimationFrame(render)

    return () => {
      running = false
      cancelAnimationFrame(animFrameId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[-1]"
      style={{
        filter: 'blur(1px)',
        opacity: 0.6,
      }}
      aria-hidden="true"
    />
  )
}
