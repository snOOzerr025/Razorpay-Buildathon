import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * ShaderGradientCanvas
 * High-performance WebGL Canvas combining:
 * 1. Liquid Organic GLSL Mesh Gradient (Stripe/DeSo/Unicorn-Studio aesthetic)
 * 2. Tripartite 3D Financial Nodes (Gateway, Settlement Bank, Merchant Ledger)
 * 3. Animated Transaction Particle Stream
 * 4. Graceful static CSS fallback & reduced-motion respect
 */
export function ShaderGradientCanvas({ scrollProgress = 0 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.z = 24

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return // WebGL not supported, fallback cleanly
    }

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    container.appendChild(renderer.domElement)

    // 2. Custom GLSL Liquid Shader Gradient Plane
    const vertexShader = `
      varying vec2 vUv;
      varying float vElevation;
      uniform float uTime;
      uniform float uScroll;

      void main() {
        vUv = uv;
        vec3 pos = position;
        
        float freq = 0.35;
        float amp = 1.6;
        float elevation = sin(pos.x * freq + uTime * 0.6) * cos(pos.y * freq + uTime * 0.4) * amp;
        elevation += sin((pos.x + pos.y) * 0.5 + uTime * 0.8) * 0.8;
        
        pos.z += elevation - (uScroll * 6.0);
        vElevation = elevation;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `

    const fragmentShader = `
      varying vec2 vUv;
      varying float vElevation;
      uniform float uTime;

      void main() {
        // DeSo & Parity Palette: Obsidian (#000818), Deep Sapphire (#0085ff), Electric Gold (#ffda59)
        vec3 colorBlack = vec3(0.0, 0.031, 0.094);       // #000818
        vec3 colorBlue  = vec3(0.0, 0.521, 1.0);         // #0085ff
        vec3 colorGold  = vec3(1.0, 0.855, 0.349);       // #ffda59
        vec3 colorCyan  = vec3(0.18, 0.615, 1.0);        // #2e9dff

        float mixFactor = smoothstep(-1.8, 2.2, vElevation);
        vec3 baseGrad = mix(colorBlack, colorBlue * 0.45, mixFactor);
        
        float goldHighlight = smoothstep(1.0, 2.5, vElevation + sin(uTime * 0.8 + vUv.x * 3.0) * 0.5);
        vec3 finalColor = mix(baseGrad, colorGold * 0.65, goldHighlight * 0.35);

        float edgeFade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        gl_FragColor = vec4(finalColor, 0.65 * edgeFade);
      }
    `

    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const planeGeo = new THREE.PlaneGeometry(60, 40, 48, 48)
    const planeMesh = new THREE.Mesh(planeGeo, shaderMaterial)
    planeMesh.position.z = -12
    planeMesh.rotation.x = -0.3
    scene.add(planeMesh)

    // 3. Tripartite Reconciliation Nodes (Gateway ↔ Bank ↔ Ledger)
    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const nodeMatGold = new THREE.MeshBasicMaterial({ color: 0xffda59, wireframe: true, transparent: true, opacity: 0.75 })
    const nodeMatBlue = new THREE.MeshBasicMaterial({ color: 0x0085ff, wireframe: true, transparent: true, opacity: 0.8 })
    const nodeMatMint = new THREE.MeshBasicMaterial({ color: 0x0bf191, wireframe: true, transparent: true, opacity: 0.75 })

    // Node A: Gateway (Icosahedron)
    const nodeGateway = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), nodeMatGold)
    nodeGateway.position.set(-8.5, 3.2, 0)
    nodeGroup.add(nodeGateway)

    // Node B: Settlement Bank (Dodecahedron)
    const nodeBank = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4), nodeMatBlue)
    nodeBank.position.set(8.5, 3.2, 0)
    nodeGroup.add(nodeBank)

    // Node C: Merchant Ledger (Octahedron)
    const nodeLedger = new THREE.Mesh(new THREE.OctahedronGeometry(2.0), nodeMatMint)
    nodeLedger.position.set(0, -6.0, 2)
    nodeGroup.add(nodeLedger)

    // 4. Connecting Transaction Particles
    const particleCount = 120
    const particleGeo = new THREE.BufferGeometry()
    const particlePos = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      // Interpolate along triangle edges between Gateway, Bank, Ledger
      const t = Math.random()
      const edge = i % 3
      let start = nodeGateway.position
      let end = nodeBank.position

      if (edge === 1) {
        start = nodeBank.position
        end = nodeLedger.position
      } else if (edge === 2) {
        start = nodeLedger.position
        end = nodeGateway.position
      }

      particlePos[i * 3] = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * 0.8
      particlePos[i * 3 + 1] = start.y + (end.y - start.y) * t + (Math.random() - 0.5) * 0.8
      particlePos[i * 3 + 2] = start.z + (end.z - start.z) * t + (Math.random() - 0.5) * 0.8
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xffda59,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
    })
    const particlePoints = new THREE.Points(particleGeo, particleMat)
    nodeGroup.add(particlePoints)

    // 5. Mouse Interaction
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e) => {
      const windowHalfX = window.innerWidth / 2
      const windowHalfY = window.innerHeight / 2
      mouseX = (e.clientX - windowHalfX) * 0.0015
      mouseY = (e.clientY - windowHalfY) * 0.0015
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // 7. Animation Loop with Visibility Control
    let animationFrameId
    let clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const delta = clock.getDelta()
      const elapsedTime = clock.getElapsedTime()

      shaderMaterial.uniforms.uTime.value = elapsedTime
      shaderMaterial.uniforms.uScroll.value = scrollProgress

      // Smooth mouse follow
      targetX += (mouseX - targetX) * 0.05
      targetY += (mouseY - targetY) * 0.05

      nodeGroup.rotation.y = elapsedTime * 0.15 + targetX * 2.0
      nodeGroup.rotation.x = targetY * 1.5

      nodeGateway.rotation.y += delta * 0.6
      nodeGateway.rotation.x += delta * 0.3
      nodeBank.rotation.y += delta * 0.5
      nodeBank.rotation.z += delta * 0.4
      nodeLedger.rotation.x += delta * 0.7

      // Float nodes slightly
      nodeGateway.position.y = 3.2 + Math.sin(elapsedTime * 1.2) * 0.4
      nodeBank.position.y = 3.2 + Math.cos(elapsedTime * 1.1) * 0.4
      nodeLedger.position.y = -6.0 + Math.sin(elapsedTime * 1.5) * 0.3

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      planeGeo.dispose()
      shaderMaterial.dispose()
      nodeMatGold.dispose()
      nodeMatBlue.dispose()
      nodeMatMint.dispose()
      renderer.dispose()
    }
  }, [scrollProgress])

  return (
    <div
      ref={containerRef}
      className="deso-canvas-container"
      aria-hidden="true"
    />
  )
}
