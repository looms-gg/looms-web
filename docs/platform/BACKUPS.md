# Backups & Recovery

looms runs on a single Supabase project. Everything users create — profiles, garments, looks, comments, likes — lives in Postgres; garment and profile textures live in Supabase Storage buckets (`garments`, `profiles`). If the project is lost, the app is lost. Treat backups as a production requirement, not an option.

## What Supabase gives you

Supabase does **not** back up free-plan projects automatically. Check **Dashboard → Database → Backups** and confirm what your plan actually provides:

- **Pro plan**: daily backups with 7-day retention are included; Point-in-Time Recovery (PITR) can be enabled and is the recommended option (roughly 5-minute recovery point, billed per project-month).
- **Free plan**: no automatic backups. You must export manually on a cadence you own.

## Manual export (works on any plan)

Get the Postgres connection string from **Dashboard → Connect**, then from the project root:

```bash
# Schema + data, compressed
pg_dump "$DATABASE_URL" -Fc -f looms-backup-$(date +%F).dump

# Restore into a fresh project
pg_restore -d "$DATABASE_URL" --clean --if-exists looms-backup-YYYY-MM-DD.dump
```

Storage objects (textures) are **not** in `pg_dump`. Export them separately:

```bash
# Verify bucket reachability, then use Dashboard → Storage to download
npx supabase@latest storage ls
```

Keep the texture archive next to the dump file. Migrations in `supabase/migrations/` recreate the full schema, so a data-only dump (`pg_dump --data-only`) also works if migrations are applied first — `deploy.command` already pushes schema changes on every deploy.

## Recovery drill (once per quarter)

1. Create a throwaway Supabase project.
2. Restore the latest dump into it (`pg_restore`), or apply all migrations and then restore data-only.
3. Point a local `.env.local` at the restored project and verify: sign-in works, a public piece page renders its texture, the Studio loads a look.
4. Delete the throwaway project.

If step 3 fails, the backup is decorative — fix whatever broke and re-run the drill.

## Related operational notes

- **Auth users** live in `auth.users`, managed by Supabase Auth. A `pg_dump` of `public` schemas does not restore them into a new project; users re-register, or the full cluster must be restored via Supabase support. Set expectations in incident comms accordingly.
- **GDPR deletions**: the self-serve `delete_my_account` RPC removes the profile row and cascades to all user content. The residual `auth.users` row is removed via Dashboard → Auth → Users → Remove (requires no service-role code) when the account must vanish from the auth system too.
- **Admin actions** are recorded in the append-only `admin_audit_log` table (see `20260909130000_admin_audit_log.sql`). Include it in backups — it is part of the moderation record.
