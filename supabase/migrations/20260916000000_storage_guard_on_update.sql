-- Storage overwrites (upload with upsert on an existing key) run as UPDATE on
-- storage.objects, so the garments bucket guard must fire on updates too.
drop trigger if exists trg_storage_garments_guard on storage.objects;
create trigger trg_storage_garments_guard
  before insert or update on storage.objects
  for each row execute procedure public.trg_storage_garments_guard();
