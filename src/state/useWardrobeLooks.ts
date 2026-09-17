import { useCallback, type MutableRefObject } from "react"
import type { User } from "@supabase/supabase-js"
import { bodyOrDefault } from "../data/bodies"
import { resolveLookLayers } from "../data/outfit"
import { formatErrorMessage } from "../lib/errorFormat"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import { clampHue } from "../skin/hue"
import { applyLookMeta, type LookMetaPatch } from "./lookMeta"
import { insertCloudLook, updateCloudLook, updateCloudLookMeta } from "./lookSync"
import type { Look, Persist } from "./persist"
import type { PatchFn, WardrobeMutationResult } from "./wardrobeTypes"

export function useWardrobeLooks({
  user,
  stateRef,
  patch,
  flash,
  setActiveLook,
}: {
  user: User | null
  stateRef: MutableRefObject<Persist>
  patch: PatchFn
  flash: (message?: string) => void
  setActiveLook: (look: Look | null) => void
}) {
  const runLookWrite = useCallback(
    async (
      promise: PromiseLike<{ error: { message: string } | null }>,
    ): Promise<WardrobeMutationResult> => {
      const { error } = await promise
      if (error) {
        flash(formatErrorMessage(error))
        return { error: new Error(error.message) }
      }
      return { error: null }
    },
    [flash],
  )

  const loadLook = useCallback(
    (look: Look, options?: { notify?: boolean }) => {
      setActiveLook(look)
      const layers = resolveLookLayers(look)
      patch(
        (prev) => ({
          next: {
            ...prev,
            activeLookId: look.id,
            equipped: layers.equipped,
            stack: layers.stack,
            bodyId: bodyOrDefault(look.bodyId).id,
            bodyHue: clampHue(look.bodyHue),
            model: look.model,
          },
          message: `Loaded ${look.name}.`,
        }),
        options,
      )
    },
    [patch, setActiveLook],
  )

  const saveLook = useCallback(
    async (name: string): Promise<WardrobeMutationResult> => {
      if (!user) return { error: new Error("Not authenticated") }
      const lookName = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      const lookId = crypto.randomUUID()
      const ownerId = user.id
      const prev = stateRef.current
      const look: Look = {
        id: lookId,
        name: lookName,
        equipped: { ...prev.equipped },
        stack: [...prev.stack],
        bodyId: prev.bodyId,
        bodyHue: prev.bodyHue,
        model: prev.model,
        savedAt: Date.now(),
        description: "",
        visibility: "private",
      }
      patch(() => ({
        next: { ...prev, activeLookId: lookId, looks: [look, ...prev.looks] },
        message: `Saved ${look.name}.`,
        activeLook: look,
      }))
      return runLookWrite(insertCloudLook(look, ownerId))
    },
    [patch, runLookWrite, stateRef, user],
  )

  const overwriteLook = useCallback(
    async (id: string, name: string): Promise<WardrobeMutationResult> => {
      if (!user) return { error: new Error("Not authenticated") }
      const targetName = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      const ownerId = user.id
      const prev = stateRef.current
      const existing = prev.looks.find((l) => l.id === id)
      if (!existing) {
        patch(() => ({ next: { ...stateRef.current, activeLookId: id } }))
        return { error: null }
      }
      const updated: Look = {
        ...existing,
        name: targetName,
        equipped: { ...prev.equipped },
        stack: [...prev.stack],
        bodyId: prev.bodyId,
        bodyHue: prev.bodyHue,
        model: prev.model,
        savedAt: Date.now(),
      }
      const nextLooks = prev.looks.map((l) => (l.id === id ? updated : l))
      patch(() => ({
        next: { ...prev, activeLookId: id, looks: nextLooks },
        message: `Overwrote ${targetName}.`,
        activeLook: updated,
      }))
      return runLookWrite(updateCloudLook(updated, id, ownerId))
    },
    [patch, runLookWrite, stateRef, user],
  )

  const updateLookMeta = useCallback(
    async (id: string, meta: LookMetaPatch): Promise<WardrobeMutationResult> => {
      if (!user) return { error: new Error("Not authenticated") }
      const ownerId = user.id
      const prev = stateRef.current
      const current = prev.looks.find((look) => look.id === id)
      if (!current) return { error: null }
      const updated = applyLookMeta(current, meta)
      patch(() => ({
        next: {
          ...prev,
          looks: prev.looks.map((look) => (look.id === id ? updated : look)),
        },
      }))
      return runLookWrite(
        updateCloudLookMeta(
          {
            name: updated.name,
            description: updated.description,
            visibility: updated.visibility,
          },
          id,
          ownerId,
        ),
      )
    },
    [patch, runLookWrite, stateRef, user],
  )

  const renameLook = useCallback(
    (id: string, name: string) => updateLookMeta(id, { name }),
    [updateLookMeta],
  )

  return {
    loadLook,
    saveLook,
    overwriteLook,
    updateLookMeta,
    renameLook,
  }
}

