import type { Group, Piece, Slot } from "./catalog"
import { SLOT_GROUP } from "./catalog"

const FIXTURE_SKIN =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

type FixtureRow = {
  id: string
  name: string
  slot: Slot
  group?: Group
  savedCount: number
  added: number
  blurb: string
  covers?: Group[]
}

// Synthetic test fixtures only. The real catalog comes from the garments
// table; nothing seed-shaped may ship to the client.
const FIXTURE_ROWS: FixtureRow[] = [
  {
    id: "fixture-shirt",
    name: "Test Shirt",
    slot: "shirt",
    savedCount: 12,
    added: 1,
    blurb: "Fixture piece for tests.",
  },
  {
    id: "fixture-coat",
    name: "Test Coat",
    slot: "coat",
    savedCount: 8,
    added: 2,
    blurb: "Fixture piece for tests.",
    covers: ["torso", "legs"],
  },
  {
    id: "fixture-hair",
    name: "Test Hair",
    slot: "hair",
    savedCount: 20,
    added: 3,
    blurb: "Fixture piece for tests.",
    covers: ["head", "torso"],
  },
  {
    id: "fixture-pants",
    name: "Test Pants",
    slot: "pants",
    savedCount: 5,
    added: 4,
    blurb: "Fixture piece for tests.",
    covers: ["torso", "legs"],
  },
  {
    id: "fixture-hat",
    name: "Test Hat",
    slot: "hat",
    savedCount: 2,
    added: 5,
    blurb: "",
  },
  {
    id: "fixture-shoes",
    name: "Test Shoes",
    slot: "shoes",
    savedCount: 15,
    added: 6,
    blurb: "Fixture piece for tests.",
  },
  {
    id: "fixture-tee",
    name: "Test Tee",
    slot: "shirt",
    savedCount: 9,
    added: 7,
    blurb: "Fixture piece for tests.",
  },
]

export function fixturePieces(maker = "TestMaker", skin = FIXTURE_SKIN): Piece[] {
  return FIXTURE_ROWS.map((row) => ({
    id: row.id,
    name: row.name,
    slot: row.slot,
    group: row.group ?? SLOT_GROUP[row.slot],
    maker,
    savedCount: row.savedCount,
    likeCount: 0,
    added: row.added,
    blurb: row.blurb,
    skin,
    covers: row.covers,
  }))
}
