# M2B.2 Secure Question Delivery

Server-owned Question Delivery foundation. Does not cut over `QuestionsPage`.
Does not promote pilot QVs 1001–1012. Review context is fail-closed.

## Authority

`auth.uid()` → `user_study_tracks.exam_id` → catalog questions / versions.

Not Journey. Not client `exam_id`.

## Local checks

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/m2b2_request_question_delivery_validation.sql
pnpm test --filter web
```

## RPC

`request_question_delivery(p_delivery_context text default 'study')`

Study only. `review` returns `UNAVAILABLE` until a secure review contract exists.
Does not call `assign_next_questions`.
