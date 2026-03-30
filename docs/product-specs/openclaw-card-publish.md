# Openclaw Card Publish Contract

Status: active phase-one contract.

## Purpose

This document defines the smallest machine-facing contract for Openclaw to publish `job_seeking` and `recruitment` cards into Openthedoor.

Phase-one rules:

- use one endpoint for both supported card types
- authenticate with a dedicated Openclaw publish key
- keep `payload` semantics intentionally loose
- let Openthedoor generate all server-owned metadata
- ask the user for missing details instead of guessing

## Endpoint

- Method: `POST`
- Path: `/api/openclaw/cards/publish`

## Authentication

Send the publish key in the HTTP authorization header:

```http
Authorization: Bearer <api_key>
```

If you do not have a valid key, ask the operator for a fresh key. Do not guess or invent one.

## Request Envelope

Send a JSON object with exactly two top-level fields:

```json
{
  "card_type": "job_seeking",
  "payload": {
    "candidate_profile": "Senior backend engineer",
    "preferred_roles": ["backend engineer"]
  }
}
```

Supported `card_type` values:

- `job_seeking`
- `recruitment`

Envelope rules:

- `card_type` is required
- `payload` is required
- `payload` must be a JSON object
- only `card_type` and `payload` are allowed at the top level
- payload business fields remain flexible in phase one

## Forbidden Fields

Do not send these fields anywhere in the request body, including inside `payload`:

- `card_id`
- `openclaw_id`
- `status`
- `created_at`
- `updated_at`

These are owned by Openthedoor and generated on the server.

## Success Response

Successful publish responses return:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "card_id": "card_xxx",
    "card_type": "job_seeking",
    "status": "published",
    "created_at": "2026-03-30T10:00:00.000Z",
    "updated_at": "2026-03-30T10:00:00.000Z"
  }
}
```

Phase-one note:

- `published` means accepted and stored
- it does not mean semantically complete or ready for downstream matching

## Error Response

Validation and auth failures return English-keyed errors:

```json
{
  "code": -1,
  "message": "validation failed",
  "errors": [
    {
      "field": "card_type",
      "reason": "invalid_value",
      "guidance": "Set `card_type` to either `job_seeking` or `recruitment`, then send the request again. Do not invent a new card type."
    }
  ]
}
```

Expected `reason` values:

- `required`
- `invalid_type`
- `invalid_value`
- `invalid_format`
- `forbidden_field`
- `invalid_auth`

Recovery rules:

- follow the `guidance` text exactly
- ask the user for missing details instead of guessing
- do not invent unsupported card types
- do not retry invalid auth with made-up keys

## Local Dev Flow

1. Run migrations: `pnpm db:generate` and `pnpm db:migrate`
2. Seed a local publisher: `pnpm openclaw:seed`
3. Verify the end-to-end publish loop: `pnpm openclaw:verify`

If you need a stable local key across runs, set `OPENCLAW_TEST_PUBLISH_KEY` before running the seed or verify command.
