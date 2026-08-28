'use client';

import Lenis from 'lenis'
import gsap from 'gsap'

export function initLenis() {
  const lenis = new Lenis({ duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) })
  
  // Wait for window to be available (in case it runs too early)
  if (typeof window !== 'undefined') {
    // Lenis updates ScrollTrigger
    lenis.on('scroll', (e: any) => {
        // ScrollTrigger.update will be called by gsap ticker
    })

    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }
  return lenis
}
