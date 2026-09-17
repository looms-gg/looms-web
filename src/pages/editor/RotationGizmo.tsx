import React, { useCallback, useEffect, useRef, useState } from "react"
import { Spherical, Vector3 } from "three"
import type { SkinViewer } from "skinview3d"

export interface RotationGizmoProps {
  viewer: SkinViewer | null
  className?: string
  size?: number
}

interface AxisDef {
  name: "X" | "Y" | "Z"
  color: string
  darkColor: string
  dir: Vector3
}

const AXES: AxisDef[] = [
  {
    name: "X",
    color: "#ef4444",
    darkColor: "#991b1b",
    dir: new Vector3(1, 0, 0),
  },
  {
    name: "Y",
    color: "#22c55e",
    darkColor: "#166534",
    dir: new Vector3(0, 1, 0),
  },
  {
    name: "Z",
    color: "#3b82f6",
    darkColor: "#1e40af",
    dir: new Vector3(0, 0, 1),
  },
]

type RenderItem =
  | {
      type: "line"
      axis: "X" | "Y" | "Z"
      color: string
      x: number
      y: number
      depth: number
    }
  | {
      type: "node"
      axis: "X" | "Y" | "Z"
      sign: 1 | -1
      color: string
      x: number
      y: number
      radius: number
      depth: number
      label?: string
    }

export function RotationGizmo({ viewer, className = "", size = 96 }: RotationGizmoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const startPosRef = useRef({ x: 0, y: 0 })
  const itemsRef = useRef<RenderItem[]>([])
  const [hoveredNode, setHoveredNode] = useState<{ axis: "X" | "Y" | "Z"; sign: 1 | -1 } | null>(null)

  const drawGizmo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const width = size
    const height = size
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const cx = width / 2
    const cy = height / 2
    const sphereRadius = width * 0.44
    const armRadius = width * 0.30
    const nodeRadius = 10
    const negNodeRadius = 8

    // Dark translucent backdrop circle
    ctx.beginPath()
    ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(24, 24, 27, 0.65)"
    ctx.fill()
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"
    ctx.lineWidth = 1
    ctx.stroke()

    if (!viewer) {
      ctx.restore()
      return
    }

    const camera = viewer.camera
    const invMat = camera.matrixWorldInverse

    const items: RenderItem[] = []

    for (const axis of AXES) {
      // Transform world axis direction into camera view space
      const viewDir = axis.dir.clone().transformDirection(invMat)

      // Positive node
      const posX = cx + viewDir.x * armRadius
      const posY = cy - viewDir.y * armRadius
      const posDepth = viewDir.z

      // Negative node
      const negX = cx - viewDir.x * armRadius
      const negY = cy + viewDir.y * armRadius
      const negDepth = -viewDir.z

      // Line from center to positive node
      items.push({
        type: "line",
        axis: axis.name,
        color: axis.color,
        x: posX,
        y: posY,
        depth: posDepth * 0.5,
      })

      // Negative node
      items.push({
        type: "node",
        axis: axis.name,
        sign: -1,
        color: axis.darkColor,
        x: negX,
        y: negY,
        radius: negNodeRadius,
        depth: negDepth,
      })

      // Positive node
      items.push({
        type: "node",
        axis: axis.name,
        sign: 1,
        color: axis.color,
        x: posX,
        y: posY,
        radius: nodeRadius,
        depth: posDepth,
        label: axis.name,
      })
    }

    // Sort by depth ascending so furthest back is drawn first
    items.sort((a, b) => a.depth - b.depth)
    itemsRef.current = items

    // Draw sorted items
    for (const item of items) {
      if (item.type === "line") {
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(item.x, item.y)
        ctx.strokeStyle = item.color
        ctx.lineWidth = 2.5
        ctx.lineCap = "round"
        ctx.stroke()
      } else if (item.type === "node") {
        const isHovered =
          hoveredNode &&
          hoveredNode.axis === item.axis &&
          hoveredNode.sign === item.sign

        ctx.beginPath()
        ctx.arc(item.x, item.y, isHovered ? item.radius + 1.5 : item.radius, 0, Math.PI * 2)
        ctx.fillStyle = item.color
        ctx.fill()
        ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(0, 0, 0, 0.4)"
        ctx.lineWidth = isHovered ? 1.5 : 1
        ctx.stroke()

        if (item.label) {
          ctx.fillStyle = "#000000"
          ctx.font = "bold 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(item.label, item.x, item.y + 0.5)
        }
      }
    }

    ctx.restore()
  }, [hoveredNode, size, viewer])

  // Subscribe to OrbitControls change event
  useEffect(() => {
    if (!viewer) return
    drawGizmo()
    const controls = viewer.controls
    const handleChange = () => {
      drawGizmo()
    }
    controls.addEventListener("change", handleChange)
    return () => {
      controls.removeEventListener("change", handleChange)
    }
  }, [drawGizmo, viewer])

  // Snap camera angle on click
  const snapCamera = useCallback(
    (axis: "X" | "Y" | "Z", sign: 1 | -1) => {
      if (!viewer) return
      const controls = viewer.controls
      const camera = viewer.camera
      const target = controls.target.clone()
      const dist = camera.position.distanceTo(target) || 45

      if (axis === "Z") {
        // Front (sign > 0) or Back (sign < 0)
        camera.position.set(target.x, target.y, target.z + dist * sign)
      } else if (axis === "X") {
        // Right (sign > 0) or Left (sign < 0)
        camera.position.set(target.x + dist * sign, target.y, target.z)
      } else if (axis === "Y") {
        // Top (sign > 0) or Bottom (sign < 0) clamped within limits
        const polar = sign > 0 ? controls.minPolarAngle + 0.05 : controls.maxPolarAngle - 0.05
        camera.position.set(
          target.x,
          target.y + dist * Math.cos(polar) * sign,
          target.z + dist * Math.sin(polar),
        )
      }

      camera.lookAt(target)
      controls.update()
      viewer.render()
      drawGizmo()
    },
    [drawGizmo, viewer],
  )

  const findHitNode = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    // Find node with highest depth (closest to screen) that contains point
    const nodes = itemsRef.current
      .filter((it): it is Extract<RenderItem, { type: "node" }> => it.type === "node")
      .slice()
      .reverse()

    for (const node of nodes) {
      const dx = x - node.x
      const dy = y - node.y
      if (Math.hypot(dx, dy) <= node.radius + 3) {
        return { axis: node.axis, sign: node.sign }
      }
    }
    return null
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true
    hasMovedRef.current = false
    startPosRef.current = { x: e.clientX, y: e.clientY }
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current && viewer) {
      const dx = e.clientX - lastPosRef.current.x
      const dy = e.clientY - lastPosRef.current.y
      if (Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y) > 3) {
        hasMovedRef.current = true
      }
      lastPosRef.current = { x: e.clientX, y: e.clientY }

      // Orbit camera: dx orbits azimuth, dy orbits polar. OrbitControls no longer
      // exposes rotateLeft/rotateUp, so drive the camera position directly.
      const target = viewer.controls.target
      const offset = viewer.camera.position.clone().sub(target)
      const sph = new Spherical().setFromVector3(offset)
      sph.theta -= dx * 0.01
      sph.phi -= dy * 0.01
      sph.phi = Math.max(
        viewer.controls.minPolarAngle,
        Math.min(viewer.controls.maxPolarAngle, sph.phi),
      )
      sph.makeSafe()
      viewer.camera.position.copy(target).add(new Vector3().setFromSpherical(sph))
      viewer.camera.lookAt(target)
      viewer.controls.update()
      viewer.render()
      drawGizmo()
    } else {
      const hit = findHitNode(e.clientX, e.clientY)
      setHoveredNode(hit)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}

    if (!hasMovedRef.current) {
      const hit = findHitNode(e.clientX, e.clientY)
      if (hit) {
        snapCamera(hit.axis, hit.sign)
      }
    }
  }

  const handlePointerLeave = () => {
    setHoveredNode(null)
  }

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title="3D Rotation Gizmo · Drag to orbit, click axis to snap"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className={`touch-none rounded-full ${
          hoveredNode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        }`}
      />
    </div>
  )
}
