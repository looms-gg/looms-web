#!/usr/bin/env python3
"""Upload bundled clothing PNGs and insert garment rows for the loft author."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

USER = "45e6be54-c9a5-4627-af39-9c14b27ec92e"
PUBLIC_BASE = (
    "https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments"
    f"/{USER}"
)
ROOT = Path(__file__).resolve().parents[1]


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    seed = json.loads((ROOT / "src/data/catalog-seed.json").read_text())
    skins = ROOT / "src/assets/skins"
    staging = Path(tempfile.mkdtemp()) / USER
    staging.mkdir(parents=True)
    for row in seed:
        src = skins / row["file"]
        if not src.exists():
            raise SystemExit(f"missing texture {src}")
        shutil.copy(src, staging / f"{row['id']}.png")

    subprocess.check_call(
        [
            "supabase",
            "--experimental",
            "storage",
            "cp",
            "-r",
            str(staging),
            f"ss:///garments/{USER}",
            "--linked",
            "--content-type",
            "image/png",
        ],
        cwd=ROOT,
    )

    values = []
    for row in seed:
        covers = row.get("covers") or [row["group"]]
        covers_sql = "ARRAY[" + ", ".join(sql_str(c) for c in covers) + "]"
        values.append(
            f"""(
      {sql_str(row['id'])},
      '{USER}'::uuid,
      {sql_str(row['name'])},
      {sql_str(row['blurb'])},
      {sql_str(row['slot'])},
      {sql_str(row['group'])},
      {row['saved_count']},
      {row['added']},
      {covers_sql},
      {sql_str(f"{PUBLIC_BASE}/{row['id']}.png")},
      true,
      '{{}}'::text[]
    )"""
        )

    sql = (
        """insert into public.garments (
  id, user_id, name, description, slot, body_group, saved_count, added, covers,
  texture_url, is_public, tags
) values
"""
        + ",\n".join(values)
        + """
on conflict (id) do update set
  user_id = excluded.user_id,
  name = excluded.name,
  description = excluded.description,
  slot = excluded.slot,
  body_group = excluded.body_group,
  saved_count = excluded.saved_count,
  added = excluded.added,
  covers = excluded.covers,
  texture_url = excluded.texture_url,
  is_public = excluded.is_public;
"""
    )
    sql_path = Path(tempfile.mkdtemp()) / "seed-garments.sql"
    sql_path.write_text(sql)
    subprocess.check_call(
        ["supabase", "db", "query", "--linked", "-f", str(sql_path)],
        cwd=ROOT,
    )


if __name__ == "__main__":
    main()
