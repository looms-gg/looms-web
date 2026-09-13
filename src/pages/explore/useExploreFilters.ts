import { useMemo, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { filterExplorePieces, type SlotFilter, type Sort } from "../../lib/exploreBrowse"
import { filterAndSortPublicLooks, type LookModelFilter, type LookSort, type PublicLook } from "../../state/publicLooks"
import type { Piece } from "../../data/catalog"

export function useExploreFilters(pieces: Piece[], looks: PublicLook[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const tabParam = searchParams.get("tab")
  const isLookLanding = location.pathname === "/look"
  const mode: "pieces" | "looks" =
    tabParam === "looks" || isLookLanding ? "looks" : "pieces"

  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<Sort>("Trending")
  const [slot, setSlot] = useState<SlotFilter>("all")
  const [lookSort, setLookSort] = useState<LookSort>("Trending")
  const [lookModel, setLookModel] = useState<LookModelFilter>("all")

  function setMode(nextMode: "pieces" | "looks") {
    if (isLookLanding && nextMode === "pieces") {
      navigate("/", { replace: true })
      return
    }
    const next = new URLSearchParams(searchParams)
    if (nextMode === "looks") {
      next.set("tab", "looks")
    } else {
      next.delete("tab")
    }
    setSearchParams(next, { replace: true })
  }

  const filteredPieces = useMemo(
    () => filterExplorePieces(pieces, query, slot, sort),
    [slot, pieces, query, sort],
  )

  const filteredLooks = useMemo(
    () => filterAndSortPublicLooks(looks, query, lookSort, lookModel),
    [looks, query, lookSort, lookModel],
  )

  const resetFilters = () => {
    setQuery("")
    setSlot("all")
    setLookModel("all")
  }

  const showHero = !query.trim()

  return {
    mode,
    setMode,
    query,
    setQuery,
    sort,
    setSort,
    slot,
    setSlot,
    lookSort,
    setLookSort,
    lookModel,
    setLookModel,
    filteredPieces,
    filteredLooks,
    resetFilters,
    showHero,
  }
}
