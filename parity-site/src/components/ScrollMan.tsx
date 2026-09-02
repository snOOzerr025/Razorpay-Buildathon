'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, useGLTF, Center } from '@react-three/drei'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function FrontribeModel() {
  const groupRef = useRef<THREE.Group>(null!)
  const { scene } = useGLTF('/model-punk/Android.gltf')
  const scrollData = useRef({ progress: 0 })

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(scrollData.current, {
        progress: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        }
      })
    })
    return () => ctx.revert()
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const p = scrollData.current.progress

    // Frontribe-style massive head/torso framing
    // Starts looking mostly forward/slightly side, head prominent
    const baseRotationY = Math.PI / 4
    
    // Smooth, dramatic rotation on scroll
    groupRef.current.rotation.y = baseRotationY - p * Math.PI * 0.8
    
    // Start with the model shifted down so the camera looks at the head/chest, then it drifts up
    const xPos = 1.5 - p * 2.5
    const yPos = -2.5 + p * 3 
    const zPos = 2 - p * 4 // Start close, push away on scroll

    groupRef.current.position.set(xPos, yPos, zPos)
    
    // Subtle mouse tracking for extra realism (head turning effect)
    const targetRotationY = (state.mouse.x * Math.PI) / 12
    const targetRotationX = -(state.mouse.y * Math.PI) / 12
    groupRef.current.rotation.y += targetRotationY
    groupRef.current.rotation.x = targetRotationX
  })

  // Center the model and scale
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
        <Center>
          <primitive object={scene} scale={0.16} />
        </Center>
      </Float>
    </group>
  )
}

export default function ScrollMan() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  
  if (!mounted) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[5]">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        {/* Soft studio lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#a0a0a0" />
        <Environment files="/model-punk/light.hdr" />
        <FrontribeModel />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/model-punk/Android.gltf')
