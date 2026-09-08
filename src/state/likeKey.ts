export type LikeTargetType = "garment" | "look"

export function likeKey(type: LikeTargetType, id: string): string {
  return `${type}:${id}`
}

export function parseLikeKey(
  key: string,
): { type: LikeTargetType; id: string } | null {
  const sep = key.indexOf(":")
  if (sep <= 0) return null
  const type = key.slice(0, sep)
  const id = key.slice(sep + 1)
  if (!id) return null
  if (type !== "garment" && type !== "look") return null
  return { type, id }
}
