# Drift Categories & Priority Framework

Use this framework to classify every difference found during drift detection. When in doubt, err on the side of higher priority — it's better to flag something as P1 that turns out to be P2 than to miss a breaking issue.

---

## P0 — Critical (resolve immediately)

Contract-breaking differences. Consumers relying on the spec will encounter unexpected behaviour at runtime.

| What to Check | Example Drift |
|---------------|---------------|
| **Missing channel in spec** | Code consumes from or publishes to a queue/topic that has no corresponding spec channel |
| **Extra channel in spec** | Spec documents a channel the service no longer uses |
| **Missing operation in spec** | Code performs a receive or send operation not documented in the spec |
| **Extra operation in spec** | Spec documents an operation the service no longer implements |
| **Wrong event type strings** | A `type` enum value in the spec doesn't match any constant in the code, or a code constant has no matching spec enum |
| **Missing required fields** | The code validates or produces a field that is not present at all in the spec message schema |
| **Extra required fields in spec** | The spec marks a field as required that the code does not validate or include |
| **Wrong message direction** | Spec says `receive` but the code actually sends to that channel (or vice versa) |

---

## P1 — High (resolve before next release)

Schema-level inaccuracies. Integration will technically work but validation, typing, or assumptions may break.

| What to Check | Example Drift |
|---------------|---------------|
| **Type mismatch** | Spec says `string` but code validates/produces `number` (or vice versa) |
| **Format mismatch** | Spec says `format: uuid` but code doesn't validate UUID format (or opposite) |
| **Enum value mismatch** | Code allows values not listed in the spec's `enum`, or spec lists values the code doesn't recognise |
| **Numeric range mismatch** | Spec says `minimum: 100` but code validates `min(50)` |
| **String constraint mismatch** | Spec says `pattern: "^[a-z]+$"` but code uses a different regex |
| **Required vs optional mismatch** | Spec marks a field as required but code treats it as optional (or vice versa) |
| **Wrong protocol bindings** | Spec says SQS FIFO but the actual queue is standard (or wrong region, wrong DLQ config) |
| **Status-to-event mapping mismatch** | Code maps status `X` to event type `Y` but spec documents a different mapping |
| **Missing status values** | Code defines status constants not present in the spec's status enum |

---

## P2 — Medium (resolve when convenient)

Correctness gaps unlikely to cause runtime failures, but reduce documentation reliability.

| What to Check | Example Drift |
|---------------|---------------|
| **Optional field not in spec** | Code conditionally includes a field the spec doesn't document |
| **Default value mismatch** | Code defaults to `"email"` but spec says default is `"sms"` (or spec has no default) |
| **Missing examples** | Spec provides no `examples` for a field that has non-obvious format (e.g. CRN, SBI) |
| **Constraint looseness** | Spec says `maxLength: 100` but code allows 200 (not breaking but misleading) |
| **Extra optional field in spec** | Spec documents an optional field the code no longer sends or validates |
| **Content type mismatch** | Spec says `application/json` but code uses a different content type header |
| **Stale description on message** | The spec description for a message doesn't reflect current behaviour |

---

## P3 — Low (nice to have)

Documentation quality. No functional impact but improves developer experience.

| What to Check | Example Drift |
|---------------|---------------|
| **Missing descriptions** | A channel, operation, message, or schema field has no `description` |
| **Cosmetic naming** | Spec uses `comms_request_queue` but code constant is `COMMS_REQUEST_QUEUE` (functional match, style mismatch) |
| **Missing spec metadata** | `info.version` hasn't been bumped despite changes, or `info.description` is stale |
| **Missing server definitions** | The spec doesn't define server objects for the protocols used |
| **Missing tags** | Messages or operations have no tags for discoverability |
| **Schema documentation gaps** | A reusable component schema has no description of its purpose |
| **Missing contact/license info** | `info.contact` or `info.license` fields are absent or stale |

---

## Decision Matrix

When a difference could be classified at multiple levels, use this to decide:

| Question | If Yes → |
|----------|----------|
| Would a consumer's integration break at runtime? | **P0** |
| Would a consumer's validation logic reject valid messages (or accept invalid ones)? | **P1** |
| Would a consumer be surprised but not broken? | **P2** |
| Is it purely about documentation polish? | **P3** |
