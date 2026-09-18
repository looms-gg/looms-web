import { useCallback, useMemo, useState } from "react"
import type { EditorControls, LimbId } from "./editorControls"

export type EditorVisibilityData = Pick<EditorControls, "bodyParts" | "armorParts">

export interface EditorVisibilityState {
  data: EditorVisibilityData
  patch: (p: Partial<EditorVisibilityData>) => void
  layers: { inner: boolean; outer: boolean }
  toggleLayer: (layer: "inner" | "outer") => void
  limbs: Record<LimbId, boolean>
  toggleLimb: (limb: LimbId) => void
  isolateLimb: (limb: LimbId) => void
  showAllLimbs: () => void
  toggleBodyPart: (limb: LimbId) => void
  toggleArmorPart: (limb: LimbId) => void
  toggleAllBody: () => void
  toggleAllArmor: () => void
}

export const ALL_VISIBLE: Record<LimbId, boolean> = {
  head: true,
  body: true,
  rightArm: true,
  leftArm: true,
  rightLeg: true,
  leftLeg: true,
}

export function useEditorVisibility(): EditorVisibilityState {
  const [data, setData] = useState<EditorVisibilityData>({
    bodyParts: { ...ALL_VISIBLE },
    armorParts: { ...ALL_VISIBLE },
  })

  const patch = useCallback((p: Partial<EditorVisibilityData>) => {
    setData((prev) => ({ ...prev, ...p }))
  }, [])

  const toggleBodyPart = useCallback((limb: LimbId) => {
    setData((prev) => ({
      ...prev,
      bodyParts: { ...prev.bodyParts, [limb]: !prev.bodyParts[limb] },
    }))
  }, [])

  const toggleArmorPart = useCallback((limb: LimbId) => {
    setData((prev) => ({
      ...prev,
      armorParts: { ...prev.armorParts, [limb]: !prev.armorParts[limb] },
    }))
  }, [])

  const toggleAllBody = useCallback(() => {
    setData((prev) => {
      const next = !Object.values(prev.bodyParts).some(Boolean)
      return {
        ...prev,
        bodyParts: {
          head: next,
          body: next,
          rightArm: next,
          leftArm: next,
          rightLeg: next,
          leftLeg: next,
        },
      }
    })
  }, [])

  const toggleAllArmor = useCallback(() => {
    setData((prev) => {
      const next = !Object.values(prev.armorParts).some(Boolean)
      return {
        ...prev,
        armorParts: {
          head: next,
          body: next,
          rightArm: next,
          leftArm: next,
          rightLeg: next,
          leftLeg: next,
        },
      }
    })
  }, [])

  const toggleLayer = useCallback((layer: "inner" | "outer") => {
    if (layer === "inner") {
      toggleAllBody()
    } else {
      toggleAllArmor()
    }
  }, [toggleAllBody, toggleAllArmor])

  const toggleLimb = useCallback((limb: LimbId) => {
    setData((prev) => {
      const next = !prev.bodyParts[limb]
      return {
        ...prev,
        bodyParts: { ...prev.bodyParts, [limb]: next },
        armorParts: { ...prev.armorParts, [limb]: next },
      }
    })
  }, [])

  const isolateLimb = useCallback((target: LimbId) => {
    setData((prev) => {
      const isSoleVisible =
        prev.bodyParts[target] &&
        Object.entries(prev.bodyParts).every(([k, v]) => (k === target ? v : !v))
      const nextVal = !isSoleVisible
      const update = {
        head: target === "head" || nextVal,
        body: target === "body" || nextVal,
        rightArm: target === "rightArm" || nextVal,
        leftArm: target === "leftArm" || nextVal,
        rightLeg: target === "rightLeg" || nextVal,
        leftLeg: target === "leftLeg" || nextVal,
      }
      return { ...prev, bodyParts: update, armorParts: update }
    })
  }, [])

  const showAllLimbs = useCallback(() => {
    setData((prev) => ({
      ...prev,
      bodyParts: { ...ALL_VISIBLE },
      armorParts: { ...ALL_VISIBLE },
    }))
  }, [])

  const limbs = useMemo<Record<LimbId, boolean>>(() => ({
    head: data.bodyParts.head || data.armorParts.head,
    body: data.bodyParts.body || data.armorParts.body,
    rightArm: data.bodyParts.rightArm || data.armorParts.rightArm,
    leftArm: data.bodyParts.leftArm || data.armorParts.leftArm,
    rightLeg: data.bodyParts.rightLeg || data.armorParts.rightLeg,
    leftLeg: data.bodyParts.leftLeg || data.armorParts.leftLeg,
  }), [data.bodyParts, data.armorParts])

  const layers = useMemo(() => ({
    inner: Object.values(data.bodyParts).some(Boolean),
    outer: Object.values(data.armorParts).some(Boolean),
  }), [data.bodyParts, data.armorParts])

  return useMemo(
    () => ({
      data,
      patch,
      layers,
      toggleLayer,
      limbs,
      toggleLimb,
      isolateLimb,
      showAllLimbs,
      toggleBodyPart,
      toggleArmorPart,
      toggleAllBody,
      toggleAllArmor,
    }),
    [
      data,
      patch,
      layers,
      toggleLayer,
      limbs,
      toggleLimb,
      isolateLimb,
      showAllLimbs,
      toggleBodyPart,
      toggleArmorPart,
      toggleAllBody,
      toggleAllArmor,
    ],
  )
}
