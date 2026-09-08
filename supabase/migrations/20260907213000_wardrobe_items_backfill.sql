-- Backfill wardrobe_items for rows that existed before the auto-wardrobe trigger.
-- 1) Every upload belongs in the uploader's wardrobe.
-- 2) Every garment referenced by a saved look belongs in that look owner's wardrobe.

insert into public.wardrobe_items (user_id, garment_id)
select g.user_id, g.id
from public.garments g
on conflict do nothing;

insert into public.wardrobe_items (user_id, garment_id)
select distinct l.user_id, g.id
from public.looks l
cross join lateral unnest(l.stack) as s(piece_id)
join public.garments g on g.id = s.piece_id
on conflict do nothing;
