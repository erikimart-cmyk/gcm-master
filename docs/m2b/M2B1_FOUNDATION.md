# M2B.1 Foundation

Additive Delivery Control for `QuestionVersion`. Does not cut over runtime.
Does not access the remote Supabase project.

## Local checks

```bash
ls -1 supabase/migrations | sort
psql -v ON_ERROR_STOP=1 -f supabase/tests/m2b1_delivery_control_validation.sql
pnpm test --filter web
```

## Objects

- `question_version_delivery_controls` — 1:1 current operational state
- Pilot 1001–1012 imported during migration as draft QV v1 + HOLD, then the privileged bootstrap function is dropped (not a runtime API)

Pilot v1 is **draft + HOLD**, not APPROVED, not published, not AVAILABLE.
No KnowledgeUnit mapping is created (Topic ≠ KnowledgeUnit).

Catalog `questions.status=published` is not treated as QV APPROVED.

| id | correct | difficulty | structural | QV | delivery |
|---|---|---|---|---|---|
| 1001–1012 | A–D match key | easy/medium/hard | pass | draft, unpublished | HOLD |
