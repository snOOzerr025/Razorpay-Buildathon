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
    let animationFrameId: number
    let z = 0

    // Small resolution for blocky noise that gets blurred
    const width = 64
    const height = 64
    canvas.width = width
    canvas.height = height

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    const render = () => {
      z += 0.05 // Advance time

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const value = noise3D(x * 0.1, y * 0.1, z)
          // Map -1 to 1 to 0 to 255
          const brightness = (value + 1) * 128
          
          const index = (x + y * width) * 4
          // Apply to alpha channel, keep rgb black
          data[index] = 28     // R (from grain-dark)
          data[index + 1] = 31 // G
          data[index + 2] = 43 // B
          data[index + 3] = brightness * 0.08 // Subdued opacity (8% of noise)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
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
    />
  )
}
