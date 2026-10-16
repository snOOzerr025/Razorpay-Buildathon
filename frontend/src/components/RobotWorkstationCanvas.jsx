import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * RobotWorkstationCanvas
 * 3D Procedural Cyber-Recon Robot sitting at a holographic workstation.
 * - Dynamic mouse-tracking (head, visor, and torso follow cursor)
 * - Rhythmic keyboard typing animation
 * - Procedural terminal screen displaying animated matrix code
 * - Interactive states: Typing mode (fast typing) & Success mode (access celebration)
 * - Matcha Cloud & Honeyed Linen color palette
 */
export function RobotWorkstationCanvas({ isTyping = false, isSuccess = false }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // Graceful fallback for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const width = container.clientWidth || window.innerWidth / 2
    const height = container.clientHeight || window.innerHeight

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x08120b, 0.035)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 1.8, 7.5)
    camera.lookAt(0, 0.6, 0)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return
    }

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    container.appendChild(renderer.domElement)

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0x1a2e20, 1.5)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xf4f2e9, 2.4)
    keyLight.position.set(4, 6, 4)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    scene.add(keyLight)

    // Terminal Monitor Glow (Honey Amber)
    const monitorLight = new THREE.PointLight(0xd69e46, 2.8, 5)
    monitorLight.position.set(0, 0.9, 0.8)
    scene.add(monitorLight)

    // Backstage Matcha Rim Light
    const rimLight = new THREE.DirectionalLight(0x4e7a51, 2.2)
    rimLight.position.set(-5, 4, -4)
    scene.add(rimLight)

    // 3. Materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x0f1f14,
      metalness: 0.85,
      roughness: 0.25,
    })

    const armorPlatingMat = new THREE.MeshStandardMaterial({
      color: 0x182c1e,
      metalness: 0.6,
      roughness: 0.35,
    })

    const honeyGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd69e46,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x6e4e1a,
      emissiveIntensity: 0.4,
    })

    const glowingVisorMat = new THREE.MeshBasicMaterial({
      color: 0x050e07,
    })

    // 4. Procedural Dynamic Terminal Screen Texture
    const screenCanvas = document.createElement('canvas')
    screenCanvas.width = 512
    screenCanvas.height = 320
    const screenCtx = screenCanvas.getContext('2d')
    const screenTexture = new THREE.CanvasTexture(screenCanvas)
    screenTexture.minFilter = THREE.LinearFilter

    const updateScreenTexture = (time) => {
      if (!screenCtx) return
      // Dark background
      screenCtx.fillStyle = '#07130a'
      screenCtx.fillRect(0, 0, 512, 320)

      // Top title bar
      screenCtx.fillStyle = '#112616'
      screenCtx.fillRect(0, 0, 512, 32)
      screenCtx.fillStyle = '#d69e46'
      screenCtx.font = 'bold 13px monospace'
      screenCtx.fillText('● PARITY CORE // RECON WORKSTATION v2.4', 16, 21)

      // Matrix code / telemetry lines
      screenCtx.font = '11px monospace'
      const lines = [
        'INIT: CONNECTING TO DISTRIBUTED SETTLEMENT STREAM...',
        'STATUS: HOOTL AUTO-PILOT [ACTIVE 1,133 TX/S]',
        'HASH: 0x8F3B...9E02 ↔ AXIS_SETTLE_UTR_9921',
        'VERIFYING 5-PASS DETERMINISTIC BUFFER [PASS 1-4: 0 DRIFT]',
        isTyping ? '>>> OPERATOR INPUT DETECTED: BUFFERING CREDENTIALS...' : '>>> MONITORING 110,377 CANONICAL ENTRIES...',
        isSuccess ? '>>> [SUCCESS] HSM KEY MATCHED! PROVISIONING TIER 3...' : '>>> AUTH AGENT: WAITING FOR OPERATOR KEY...',
      ]

      for (let i = 0; i < lines.length; i++) {
        const y = 60 + i * 28
        screenCtx.fillStyle = i === lines.length - 1 && isSuccess
          ? '#34d399'
          : (i % 2 === 0 ? '#7ca37c' : '#f4f2e9')
        screenCtx.fillText(lines[i], 16, y)
      }

      // Animated Waveform graph at the bottom of the screen
      screenCtx.strokeStyle = isSuccess ? '#34d399' : '#d69e46'
      screenCtx.lineWidth = 2.5
      screenCtx.beginPath()
      for (let x = 0; x < 480; x += 10) {
        const wave = Math.sin((x * 0.08) + (time * 6)) * 18 + Math.cos((x * 0.04) - (time * 3)) * 8
        const py = 265 + wave
        if (x === 0) screenCtx.moveTo(16 + x, py)
        else screenCtx.lineTo(16 + x, py)
      }
      screenCtx.stroke()

      screenTexture.needsUpdate = true
    }

    // 5. Build 3D Desk & Equipment
    const deskGroup = new THREE.Group()
    scene.add(deskGroup)

    // Tabletop
    const deskGeo = new THREE.BoxGeometry(5.2, 0.12, 2.8)
    const deskMesh = new THREE.Mesh(deskGeo, darkMetalMat)
    deskMesh.position.set(0, -0.06, 0.4)
    deskMesh.receiveShadow = true
    deskGroup.add(deskMesh)

    // Glowing Honey Rim on Desk Front Edge
    const rimGeo = new THREE.BoxGeometry(5.22, 0.03, 0.04)
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xd69e46 })
    const deskRim = new THREE.Mesh(rimGeo, rimMat)
    deskRim.position.set(0, 0, 1.8)
    deskGroup.add(deskRim)

    // Desk Legs
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2)
    const legMat = darkMetalMat
    const leg1 = new THREE.Mesh(legGeo, legMat)
    leg1.position.set(-2.4, -1.16, -0.8)
    const leg2 = new THREE.Mesh(legGeo, legMat)
    leg2.position.set(2.4, -1.16, -0.8)
    const leg3 = new THREE.Mesh(legGeo, legMat)
    leg3.position.set(-2.4, -1.16, 1.6)
    const leg4 = new THREE.Mesh(legGeo, legMat)
    leg4.position.set(2.4, -1.16, 1.6)
    deskGroup.add(leg1, leg2, leg3, leg4)

    // Computer Monitor
    const monitorGroup = new THREE.Group()
    monitorGroup.position.set(0, 0.8, -0.2)
    deskGroup.add(monitorGroup)

    const screenFrameGeo = new THREE.BoxGeometry(3.2, 1.9, 0.08)
    const screenFrameMesh = new THREE.Mesh(screenFrameGeo, darkMetalMat)
    monitorGroup.add(screenFrameMesh)

    const screenDisplayGeo = new THREE.PlaneGeometry(3.08, 1.78)
    const screenDisplayMat = new THREE.MeshBasicMaterial({
      map: screenTexture,
      toneMapped: false,
    })
    const screenDisplayMesh = new THREE.Mesh(screenDisplayGeo, screenDisplayMat)
    screenDisplayMesh.position.z = 0.045
    monitorGroup.add(screenDisplayMesh)

    // Monitor Stand
    const standGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8)
    const standMesh = new THREE.Mesh(standGeo, honeyGoldMat)
    standMesh.position.set(0, -0.5, -0.1)
    monitorGroup.add(standMesh)

    const standBaseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24)
    const standBaseMesh = new THREE.Mesh(standBaseGeo, darkMetalMat)
    standBaseMesh.position.set(0, -0.88, -0.1)
    monitorGroup.add(standBaseMesh)

    // Cyber Keyboard
    const keyboardGeo = new THREE.BoxGeometry(1.8, 0.04, 0.75)
    const keyboardMesh = new THREE.Mesh(keyboardGeo, darkMetalMat)
    keyboardMesh.position.set(0, 0.02, 0.65)
    deskGroup.add(keyboardMesh)

    // Keyboard Glowing Keys Stripe
    const keysGeo = new THREE.PlaneGeometry(1.65, 0.6)
    const keysMat = new THREE.MeshBasicMaterial({
      color: 0xd69e46,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    })
    const keysMesh = new THREE.Mesh(keysGeo, keysMat)
    keysMesh.rotation.x = -Math.PI / 2
    keysMesh.position.set(0, 0.045, 0.65)
    deskGroup.add(keysMesh)

    // 6. Build 3D Cyber-Robot
    const robotRoot = new THREE.Group()
    robotRoot.position.set(0, 0.5, 1.8)
    scene.add(robotRoot)

    // Cyber Chair
    const chairGroup = new THREE.Group()
    chairGroup.position.set(0, -0.4, 0.2)
    robotRoot.add(chairGroup)

    const chairSeatGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.15, 24)
    const chairSeat = new THREE.Mesh(chairSeatGeo, darkMetalMat)
    chairGroup.add(chairSeat)

    const chairBackGeo = new THREE.BoxGeometry(1.2, 1.8, 0.12)
    const chairBack = new THREE.Mesh(chairBackGeo, armorPlatingMat)
    chairBack.position.set(0, 0.9, 0.75)
    chairBack.rotation.x = 0.08
    chairGroup.add(chairBack)

    // Robot Torso
    const torsoGroup = new THREE.Group()
    torsoGroup.position.set(0, 0.45, 0)
    robotRoot.add(torsoGroup)

    const chestGeo = new THREE.BoxGeometry(1.3, 1.4, 0.85)
    const chestMesh = new THREE.Mesh(chestGeo, armorPlatingMat)
    torsoGroup.add(chestMesh)

    // Chest Glowing Arc Reactor Core
    const reactorGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 24)
    const reactorMat = new THREE.MeshBasicMaterial({ color: 0xd69e46 })
    const reactor = new THREE.Mesh(reactorGeo, reactorMat)
    reactor.rotation.x = Math.PI / 2
    reactor.position.set(0, 0.2, 0.44)
    torsoGroup.add(reactor)

    const reactorRingGeo = new THREE.TorusGeometry(0.28, 0.04, 12, 32)
    const reactorRing = new THREE.Mesh(reactorRingGeo, honeyGoldMat)
    reactorRing.position.set(0, 0.2, 0.44)
    torsoGroup.add(reactorRing)

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.3)
    const neckMesh = new THREE.Mesh(neckGeo, darkMetalMat)
    neckMesh.position.set(0, 0.85, 0)
    torsoGroup.add(neckMesh)

    // Robot Head Group (Rotates and tracks cursor!)
    const headGroup = new THREE.Group()
    headGroup.position.set(0, 1.25, 0)
    torsoGroup.add(headGroup)

    const helmetGeo = new THREE.BoxGeometry(1.05, 0.95, 0.95)
    const helmetMesh = new THREE.Mesh(helmetGeo, armorPlatingMat)
    headGroup.add(helmetMesh)

    // Glossy Black Curved Visor Face
    const visorGeo = new THREE.BoxGeometry(0.9, 0.42, 0.12)
    const visorMesh = new THREE.Mesh(visorGeo, glowingVisorMat)
    visorMesh.position.set(0, 0.02, 0.48)
    headGroup.add(visorMesh)

    // Expressive LED Eyes (Drawn on Visor)
    const eyeCanvas = document.createElement('canvas')
    eyeCanvas.width = 128
    eyeCanvas.height = 64
    const eyeCtx = eyeCanvas.getContext('2d')
    const eyeTexture = new THREE.CanvasTexture(eyeCanvas)

    const updateEyes = (time, isBlinking) => {
      if (!eyeCtx) return
      eyeCtx.clearRect(0, 0, 128, 64)
      eyeCtx.fillStyle = isSuccess ? '#34d399' : (isTyping ? '#e5aa4a' : '#d69e46')

      if (isBlinking) {
        // Horizontal line when blinking
        eyeCtx.fillRect(28, 30, 24, 4)
        eyeCtx.fillRect(76, 30, 24, 4)
      } else if (isSuccess) {
        // Upward joyful curved arcs (happy robot eyes)
        eyeCtx.lineWidth = 5
        eyeCtx.strokeStyle = '#34d399'
        eyeCtx.beginPath()
        eyeCtx.arc(40, 36, 12, Math.PI, 0)
        eyeCtx.stroke()
        eyeCtx.beginPath()
        eyeCtx.arc(88, 36, 12, Math.PI, 0)
        eyeCtx.stroke()
      } else {
        // Glowing pill-shaped eyes
        eyeCtx.beginPath()
        eyeCtx.roundRect(26, 20, 26, 24, 6)
        eyeCtx.roundRect(76, 20, 26, 24, 6)
        eyeCtx.fill()
      }
      eyeTexture.needsUpdate = true
    }

    const eyeDisplayGeo = new THREE.PlaneGeometry(0.85, 0.38)
    const eyeDisplayMat = new THREE.MeshBasicMaterial({
      map: eyeTexture,
      transparent: true,
      toneMapped: false,
    })
    const eyeDisplayMesh = new THREE.Mesh(eyeDisplayGeo, eyeDisplayMat)
    eyeDisplayMesh.position.set(0, 0.02, 0.55)
    headGroup.add(eyeDisplayMesh)

    // Cute Cyber Antenna on Head with Pulsing Bulb
    const antennaStemGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.45)
    const antennaStem = new THREE.Mesh(antennaStemGeo, honeyGoldMat)
    antennaStem.position.set(0, 0.65, -0.05)
    headGroup.add(antennaStem)

    const antennaBulbGeo = new THREE.SphereGeometry(0.07, 16, 16)
    const antennaBulbMat = new THREE.MeshBasicMaterial({ color: 0xd69e46 })
    const antennaBulb = new THREE.Mesh(antennaBulbGeo, antennaBulbMat)
    antennaBulb.position.set(0, 0.88, -0.05)
    headGroup.add(antennaBulb)

    // Left & Right Arms + Animated Typing Hands
    const armGroupLeft = new THREE.Group()
    armGroupLeft.position.set(-0.75, 0.4, 0.1)
    torsoGroup.add(armGroupLeft)

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), darkMetalMat)
    armGroupLeft.add(shoulderL)

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7), armorPlatingMat)
    armL.position.set(0, -0.35, 0.3)
    armL.rotation.x = Math.PI / 4
    armGroupLeft.add(armL)

    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.3), honeyGoldMat)
    handL.position.set(0.2, -0.65, 0.65)
    armGroupLeft.add(handL)

    const armGroupRight = new THREE.Group()
    armGroupRight.position.set(0.75, 0.4, 0.1)
    torsoGroup.add(armGroupRight)

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), darkMetalMat)
    armGroupRight.add(shoulderR)

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7), armorPlatingMat)
    armR.position.set(0, -0.35, 0.3)
    armR.rotation.x = Math.PI / 4
    armGroupRight.add(armR)

    const handR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.3), honeyGoldMat)
    handR.position.set(-0.2, -0.65, 0.65)
    armGroupRight.add(handR)

    // 7. Floating Holographic Tripartite Reconciliation Orbit Rings
    const orbitGroup = new THREE.Group()
    orbitGroup.position.set(0, 1.4, -0.1)
    scene.add(orbitGroup)

    const ring1Geo = new THREE.TorusGeometry(1.6, 0.015, 8, 48)
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0xd69e46, transparent: true, opacity: 0.4 })
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat)
    ring1.rotation.x = Math.PI / 3
    orbitGroup.add(ring1)

    const ring2Geo = new THREE.TorusGeometry(1.8, 0.012, 8, 48)
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x7ca37c, transparent: true, opacity: 0.35 })
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
    ring2.rotation.y = Math.PI / 4
    orbitGroup.add(ring2)

    // Floating micro node on ring
    const floatNodeGeo = new THREE.IcosahedronGeometry(0.08, 1)
    const floatNodeMat = new THREE.MeshBasicMaterial({ color: 0xd69e46 })
    const floatNode = new THREE.Mesh(floatNodeGeo, floatNodeMat)
    orbitGroup.add(floatNode)

    // 8. Mouse Tracking & Smooth Damped Movement
    let mouseX = 0
    let mouseY = 0
    let targetHeadX = 0
    let targetHeadY = 0
    let targetTorsoX = 0

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      mouseX = Math.max(-1.5, Math.min(1.5, x))
      mouseY = Math.max(-1.5, Math.min(1.5, y))
    }

    // Also listen to window so mouse tracking feels seamless across both screen halves
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    // Resize handler
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || window.innerWidth / 2
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // 9. Animation Loop
    let animationFrameId
    const clock = new THREE.Clock()
    let blinkTimer = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const elapsedTime = clock.getElapsedTime()
      const delta = clock.getDelta()

      // Screen code updates
      updateScreenTexture(elapsedTime)

      // Eye blink logic (every ~3.5 seconds)
      blinkTimer += delta
      const isBlinking = blinkTimer % 3.8 < 0.18
      updateEyes(elapsedTime, isBlinking)

      // Mouse Lerp Tracking (Head smoothly follows cursor)
      const lerpSpeed = 0.06
      targetHeadX += (mouseX * 0.65 - targetHeadX) * lerpSpeed
      targetHeadY += (-mouseY * 0.45 - targetHeadY) * lerpSpeed
      targetTorsoX += (mouseX * 0.22 - targetTorsoX) * lerpSpeed

      headGroup.rotation.y = targetHeadX
      headGroup.rotation.x = targetHeadY + (isTyping ? 0.25 : 0) // Tilts down when typing
      torsoGroup.rotation.y = targetTorsoX

      // Rhythmic keyboard typing animation
      const typeFreq = isTyping ? 26 : 14
      const handWaveL = Math.sin(elapsedTime * typeFreq) * 0.06
      const handWaveR = Math.cos(elapsedTime * typeFreq + 1.2) * 0.06

      handL.position.y = -0.65 + Math.max(0, handWaveL)
      handR.position.y = -0.65 + Math.max(0, handWaveR)

      // Idle breathing float
      torsoGroup.position.y = 0.45 + Math.sin(elapsedTime * 2.0) * 0.02
      antennaBulb.scale.setScalar(1 + Math.sin(elapsedTime * 4.0) * 0.15)

      // Floating holographic rings rotation
      orbitGroup.rotation.y = elapsedTime * 0.35
      orbitGroup.rotation.x = Math.sin(elapsedTime * 0.5) * 0.15
      floatNode.position.set(
        Math.cos(elapsedTime * 1.5) * 1.6,
        Math.sin(elapsedTime * 1.2) * 0.4,
        Math.sin(elapsedTime * 1.5) * 1.6
      )

      // Success Mode celebration reaction
      if (isSuccess) {
        monitorLight.color.setHex(0x34d399)
        monitorLight.intensity = 4.5
        headGroup.position.y = 1.25 + Math.sin(elapsedTime * 12) * 0.06
        armGroupLeft.rotation.z = Math.sin(elapsedTime * 8) * 0.15
        armGroupRight.rotation.z = -Math.sin(elapsedTime * 8) * 0.15
      } else {
        monitorLight.color.setHex(0xd69e46)
        monitorLight.intensity = 2.8 + Math.sin(elapsedTime * 3) * 0.3
      }

      // Parallax camera motion
      if (!prefersReducedMotion) {
        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.03
        camera.position.y += (1.8 + mouseY * 0.3 - camera.position.y) * 0.03
        camera.lookAt(0, 0.6, 0)
      }

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
      renderer.dispose()
    }
  }, [isTyping, isSuccess])

  return (
    <div
      ref={mountRef}
      className="auth-robot-canvas-wrapper"
      aria-label="Interactive 3D Autonomous Recon Companion Workstation"
    />
  )
}
