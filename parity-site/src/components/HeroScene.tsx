'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, MeshTransmissionMaterial } from '@react-three/drei'
import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import StaticHeroFallback from './StaticHeroFallback'
import MagneticButton from './MagneticButton'

function LedgerSheet({ index, total }: { index: number; total: number }) {
  const mesh = useRef<THREE.Mesh>(null!)
  const z = -3 + (index / (total - 1)) * 4
  const baseRotation = useMemo(() => Math.random() * 0.15 - 0.075, [])

  useFrame(({ clock, mouse }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    mesh.current.rotation.x = baseRotation + Math.sin(t * 0.3 + index) * 0.04
    mesh.current.rotation.y = Math.cos(t * 0.2 + index * 1.7) * 0.06
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, mouse.x * 0.4, 0.03)
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, mouse.y * 0.25, 0.03)
  })

  return (
    <mesh ref={mesh} position={[0, 0, z]}>
      <planeGeometry args={[3.2, 4.4]} />
      <MeshTransmissionMaterial
        color="#F6F1E4"
        transmission={0.85}
        roughness={0.35}
        thickness={0.4}
        ior={1.2}
      />
    </mesh>
  )
}

function Lines() {
  const linesRef = useRef<THREE.LineSegments>(null!)
  const linesUniform = useRef({ progress: 0 })
  const [flash, setFlash] = useState(false)

  const lineCount = 15
  const spread = 4

  const initialPositions = useMemo(() => {
    const arr = new Float32Array(lineCount * 6)
    for (let i = 0; i < lineCount; i++) {
      // random scattered positions and rotations
      const x1 = (Math.random() - 0.5) * spread
      const y1 = (Math.random() - 0.5) * spread
      const z1 = (Math.random() - 0.5) * spread
      
      const x2 = x1 + (Math.random() - 0.5) * spread
      const y2 = y1 + (Math.random() - 0.5) * spread
      const z2 = z1 + (Math.random() - 0.5) * spread

      arr[i * 6 + 0] = x1
      arr[i * 6 + 1] = y1
      arr[i * 6 + 2] = z1
      arr[i * 6 + 3] = x2
      arr[i * 6 + 4] = y2
      arr[i * 6 + 5] = z2
    }
    return arr
  }, [])

  const finalPositions = useMemo(() => {
    const arr = new Float32Array(lineCount * 6)
    for (let i = 0; i < lineCount; i++) {
      // perfect horizontal alignment
      const y = -1.5 + (i / (lineCount - 1)) * 3
      arr[i * 6 + 0] = -2   // x1
      arr[i * 6 + 1] = y    // y1
      arr[i * 6 + 2] = 1.5  // z1 (in front of sheets)
      arr[i * 6 + 3] = 2    // x2
      arr[i * 6 + 4] = y    // y2
      arr[i * 6 + 5] = 1.5  // z2
    }
    return arr
  }, [])

  const currentPositions = useMemo(() => new Float32Array(lineCount * 6), [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: '+=100%',
          scrub: 0.6,
        },
      }).to(linesUniform.current, {
        progress: 1,
        ease: 'power2.inOut',
      })
    })
    return () => ctx.revert()
  }, [])

  // Ref to track if we already flashed this scroll
  const flashed = useRef(false)

  useFrame(() => {
    if (!linesRef.current) return
    const p = linesUniform.current.progress

    for (let i = 0; i < currentPositions.length; i++) {
      currentPositions[i] = THREE.MathUtils.lerp(initialPositions[i], finalPositions[i], p)
    }

    const attr = linesRef.current.geometry.attributes.position
    attr.array = currentPositions
    attr.needsUpdate = true

    if (p > 0.95 && !flashed.current) {
      flashed.current = true
      setFlash(true)
      setTimeout(() => setFlash(false), 200)
    } else if (p <= 0.95) {
      flashed.current = false
    }
  })

  return (
    <>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lineCount * 2}
            array={currentPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#1C1F2B" transparent opacity={0.15} />
      </lineSegments>
      {flash && (
        <mesh position={[0, 0, 1.4]}>
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial color="#3F7D50" transparent opacity={0.3} />
        </mesh>
      )}
    </>
  )
}

export default function HeroScene() {
  const [shouldRender3D, setShouldRender3D] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isDesktop = window.innerWidth >= 768
    
    // basic webgl test
    let webglSupported = false
    try {
      const canvas = document.createElement('canvas')
      webglSupported = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
    } catch (e) {
      webglSupported = false
    }

    if (isDesktop && !prefersReducedMotion && webglSupported) {
      setShouldRender3D(true)
    }
  }, [])

  if (!shouldRender3D) {
    return (
      <div className="relative w-full h-[100vh]">
        <StaticHeroFallback />
        <HeroOverlay />
      </div>
    )
  }

  const sheetCount = 7

  return (
    <div className="w-full h-[150vh] bg-transparent" id="hero">
      <div className="sticky top-0 w-full h-[100vh]">
        <Canvas>
          <ambientLight intensity={0.6} />
          <directionalLight position={[-4, 5, 3]} intensity={1.1} color="#FFF8E8" />
          <Environment preset="apartment" />
          
          {[...Array(sheetCount)].map((_, i) => (
            <LedgerSheet key={i} index={i} total={sheetCount} />
          ))}
          <Lines />
        </Canvas>
        <HeroOverlay />
      </div>
    </div>
  )
}

function HeroOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-6 text-center">
      <h1 className="text-5xl md:text-7xl font-display font-bold text-[var(--ink)] mb-6 tracking-tight drop-shadow-sm">
        Razorpay Recon <br />
        <span className="text-[var(--ink-dim)]">Precision & Scale</span>
      </h1>
      <p className="max-w-2xl text-xl text-[var(--ink-dim)] mb-10 drop-shadow-sm">
        A deterministic three-way reconciliation engine. Matching gateway transaction records, bank settlements, and merchant ledger entries.
      </p>
      <div className="pointer-events-auto">
        <MagneticButton>
          Explore Architecture
        </MagneticButton>
      </div>
    </div>
  )
}
