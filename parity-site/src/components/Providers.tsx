'use client'

import { useEffect } from 'react'
import { initLenis } from '@/lib/lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = initLenis()
    return () => {
      lenis?.destroy()
    }
  }, [])

  return <>{children}</>
}
