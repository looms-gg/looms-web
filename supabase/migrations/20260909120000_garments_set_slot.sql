-- Allow multi-part garments (e.g. a bikini set) to live in their own "set" slot.
-- Rendering is driven by the free-form `covers` array, so no other change is
-- needed: a set row carries covers like '{torso,legs}'.

alter table public.garments drop constraint if exists garments_slot_check;

alter table public.garments
  add constraint garments_slot_check
  check (slot in ('hair', 'hat', 'face', 'shirt', 'set', 'coat', 'pants', 'shoes'));
