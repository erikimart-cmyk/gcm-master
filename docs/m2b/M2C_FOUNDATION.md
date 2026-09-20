# M2C Canonical Question Response

Server-owned answer recording and optional deterministic evidence.
Does not cut over `QuestionsPage`. Does not promote pilot QVs 1001–1012.

## RPC

`submit_question_response(p_assignment_id uuid, p_selected_answer text, p_submission_id uuid)`

Returns `outcome`, `assignment_id`, `attempt_id`, `selected_answer`, `is_correct`, `correct_answer`, `explanation`.

Outcomes: `RECORDED` | `CONFLICT` | `UNAVAILABLE` | `DENIED`.

## Authority

`auth.uid()` → owned assignment → stored QV pin → server grade.

Presentation (`presented_at`) is required. Evidence only if current `AVAILABLE` and exactly one published PRIMARY KnowledgeUnit.

## Local checks

```bash
psql -v ON_ERROR_STOP=1 -f supabase/tests/m2c_submit_question_response_validation.sql
pnpm test --filter web
```
