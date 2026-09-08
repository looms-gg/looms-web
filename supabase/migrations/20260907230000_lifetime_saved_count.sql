-- Lifetime saved_count: inserts increment; deletes must not decrement.

drop trigger if exists trg_wardrobe_items_saved_count_del on public.wardrobe_items;
drop function if exists public.trg_wardrobe_items_saved_count_del();
