# M2A Validation Matrix (A1–A60)

How to reproduce local M2A validation. Does not access the remote Supabase project.

## Static checks (no database)

From the repository root:

```bash
git diff --name-only -- supabase/migrations/20260903000000_create_auth_and_study_progress.sql \
  supabase/migrations/20260915000000_create_multi_preparation_foundation.sql
ls -1 supabase/migrations | sort
pnpm test --filter web
```

Targeted contract test: `apps/web/src/features/study/m2aLegacyContract.test.ts`

## Database checks (disposable local only)

Requires local Supabase/Postgres. Do **not** run against production.

```bash
# after local supabase start / db reset --local
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/m2a_foundation_validation.sql
```

The SQL script inserts isolated fixtures (`m2a-*@example.test` UUIDs) and records PASS/FAIL rows in `m2a_validation_results`.

A18 asserts the approved consistency trigger `public.enforce_learning_evidence_event_profile`: SQLSTATE `P0001` and the message `learning_evidence.profile_id must match learning_events.profile_id`. A later `foreign_key_violation` is recorded as FAIL (trigger regression), not PASS.

If the official local Supabase CLI stack is unavailable, run the same file against a disposable local Postgres that already has the historical + M2A migrations applied. Do **not** use the remote project.

## Migrations added by M2A

1. `20260918000000_m2a_knowledge_and_question_versioning.sql`
2. `20260918010000_m2a_learning_evidence_foundation.sql`
3. `20260918020000_m2a_legacy_bridge.sql`

Historical migrations through `20260915000000_create_multi_preparation_foundation.sql` must remain unchanged.
