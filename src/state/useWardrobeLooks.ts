import { useCallback, type MutableRefObject } from "react"
import type { User } from "@supabase/supabase-js"
import { bodyOrDefault } from "../data/bodies"
import { getPiece } from "../data/catalog"
import { resolveLookLayers } from "../data/outfit"
import type { Piece } from "../data/pieceTypes"
import { formatErrorMessage } from "../lib/errorFormat"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import { clampHue } from "../skin/hue"
import { bakeAndUploadLookThumb } from "../lib/piecePublish/lookThumbUpload"
import { supabase } from "../lib/supabase"
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

  // Best-effort embed thumbnail: bake the iso render after a successful save
  // and record its URL. A missing thumb just falls back to the shared outfit
  // image in embeds, so failures are silent.
  const bakeLookThumb = useCallback(
    async (look: Look, ownerId: string, bustCache = false) => {
      try {
        const pieces = look.stack
          .map(getPiece)
          .filter((piece): piece is Piece => Boolean(piece))
        if (pieces.length === 0) return
        const url = await bakeAndUploadLookThumb(
          supabase,
          ownerId,
          look.id,
          pieces,
          look.bodyId,
          look.bodyHue,
          look.model,
        )
        if (!url) return
        await supabase
          .from("looks")
          .update({ thumb_url: bustCache ? `${url}?v=${Date.now()}` : url })
          .eq("id", look.id)
          .eq("user_id", ownerId)
      } catch {
        // embed-only convenience; never surface a thumbnail failure
      }
    },
    [],
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
      const result = await runLookWrite(insertCloudLook(look, ownerId))
      if (!result.error) void bakeLookThumb(look, ownerId)
      return result
    },
    [bakeLookThumb, patch, runLookWrite, stateRef, user],
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
      const result = await runLookWrite(updateCloudLook(updated, id, ownerId))
      if (!result.error) void bakeLookThumb(updated, ownerId, true)
      return result
    },
    [bakeLookThumb, patch, runLookWrite, stateRef, user],
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

