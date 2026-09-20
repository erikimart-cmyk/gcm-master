# M2B.3 Presentation Confirmation

Server-owned, idempotent confirmation of an Assignment already delivered by M2B.2.
Does not cut over `QuestionsPage`. Does not promote pilot QVs 1001–1012.

## Authority

`auth.uid()` → owned `question_assignments` → stored `question_version_id` → StudyTrack exam → `m2b2_question_version_passes_integrity`.

Missing UUID and other-user UUID both return `DENIED`.

## Local checks

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/m2b3_confirm_question_presentation_validation.sql
pnpm test --filter web
```

## RPC

`confirm_question_presentation(p_assignment_id uuid)`

Returns `outcome`, `assignment_id`, `presented_at`.

First stamp requires study context, non-null pin, `answered_at` null, published StudyTrack, and integrity. Retry returns the original `presented_at`.
