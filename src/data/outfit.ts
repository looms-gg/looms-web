import { getPiece, SLOTS, SLOT_STACK, type Piece, type Slot } from "./catalog"
import { bodyOrDefault } from "./bodies"

export type Equipped = Partial<Record<Slot, string>>

export function equippedIds(equipped: Equipped) {
  const ids: string[] = []
  for (const slot of SLOTS) {
    const id = equipped[slot]
    if (id) ids.push(id)
  }
  return ids
}

export function sortPiecesByStack(outfit: Piece[], stack?: string[]) {
  if (stack && stack.length > 0) {
    const rank = new Map(stack.map((id, i) => [id, i]))
    return [...outfit].sort((a, b) => {
      const ia = rank.get(a.id)
      const ib = rank.get(b.id)
      if (ia == null && ib == null) {
        return SLOT_STACK.indexOf(a.slot) - SLOT_STACK.indexOf(b.slot)
      }
      if (ia == null) return 1
      if (ib == null) return -1
      return ia - ib
    })
  }
  return [...outfit].sort(
    (a, b) => SLOT_STACK.indexOf(a.slot) - SLOT_STACK.indexOf(b.slot),
  )
}

export function equippedFromStack(stack: string[]): Equipped {
  const equipped: Equipped = {}
  for (const id of stack) {
    const piece = getPiece(id)
    if (piece) equipped[piece.slot] = id
  }
  return equipped
}

export function resolveLookLayers(look: {
  equipped?: Equipped
  stack?: string[]
}) {
  const stack = look.stack ?? []
  const equipped =
    equippedIds(look.equipped ?? {}).length > 0
      ? look.equipped ?? {}
      : equippedFromStack(stack)
  return {
    equipped,
    stack: mergeStack(stack, equipped),
  }
}

export function piecesFromEquipped(equipped: Equipped, stack?: string[]) {
  const layers = resolveLookLayers({ equipped, stack })
  const next: Piece[] = []
  for (const slot of SLOTS) {
    const id = layers.equipped[slot]
    if (!id) continue
    const piece = getPiece(id)
    if (piece) next.push(piece)
  }
  return sortPiecesByStack(next, layers.stack)
}

export function mergeStack(stack: string[], equipped: Equipped) {
  const wanted = new Set(equippedIds(equipped))
  const next = stack.filter((id) => wanted.has(id))
  for (const slot of SLOT_STACK) {
    const id = equipped[slot]
    if (!id || next.includes(id)) continue
    const rank = SLOT_STACK.indexOf(slot)
    const insertAt = next.findIndex((existing) => {
      const piece = getPiece(existing)
      return piece != null && SLOT_STACK.indexOf(piece.slot) > rank
    })
    if (insertAt === -1) next.push(id)
    else next.splice(insertAt, 0, id)
  }
  return next
}

export function wearInStack(
  stack: string[],
  equipped: Equipped,
  piece: Piece,
  previousId?: string,
) {
  if (previousId && previousId !== piece.id) {
    const swapped = stack.map((id) => (id === previousId ? piece.id : id))
    return mergeStack(swapped, equipped)
  }
  return mergeStack(stack, equipped)
}

export function moveStackId(stack: string[], id: string, steps: number) {
  const from = stack.indexOf(id)
  if (from < 0 || steps === 0) return stack
  const to = from + steps
  if (to < 0 || to >= stack.length) return stack
  const next = [...stack]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function isSameEquipped(a?: Equipped, b?: Equipped): boolean {
  if (!a && !b) return true
  const safeA = a ?? {}
  const safeB = b ?? {}
  for (const slot of SLOTS) {
    if ((safeA[slot] || undefined) !== (safeB[slot] || undefined)) {
      return false
    }
  }
  return true
}

export function findMatchingLook<
  T extends {
    equipped?: Equipped
    stack?: string[]
    bodyId?: string
    bodyHue?: number
    model?: string
  },
>(
  looks: T[],
  equipped: Equipped,
  bodyId?: string,
  bodyHue?: number,
  model?: string,
): T | undefined {
  return looks.find((look) => {
    const lookEquipped = resolveLookLayers(look).equipped
    if (!isSameEquipped(lookEquipped, equipped)) return false
    if (bodyId && look.bodyId && bodyOrDefault(look.bodyId).id !== bodyOrDefault(bodyId).id) {
      return false
    }
    if (bodyHue !== undefined && look.bodyHue !== undefined && look.bodyHue !== bodyHue) {
      return false
    }
    if (model && look.model && look.model !== model) return false
    return true
  })
}
