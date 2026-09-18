-- garments.thumb_url: a pre-baked static thumbnail the client can show
-- without rendering on-device. Nullable by design: pieces without one fall
-- back to live client rendering. Same ownership rules as texture_url —
-- updates flow through the existing owner-scoped update policy; no new
-- policy, no counter exposure.
alter table public.garments add column if not exists thumb_url text;
