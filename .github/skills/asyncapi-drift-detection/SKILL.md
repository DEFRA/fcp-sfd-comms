---
name: asyncapi-drift-detection
description: "Detect drift between an AsyncAPI 3.x spec and the service implementation. Use when: checking AsyncAPI drift, auditing event documentation, validating message schemas, comparing spec vs code, reviewing contract accuracy, onboarding documentation review, verifying channels operations and event types match implementation."
---

# AsyncAPI Contract Drift Detection

Detect discrepancies between an AsyncAPI 3.x specification and the actual service implementation. This skill is framework-agnostic and works by dynamically discovering the spec and messaging code in any project.

## When to Use

- Before a release, to verify documentation accuracy
- When onboarding new developers or consumers to a service
- After iterating on a service to check if the spec needs updating
- During code review of messaging-related changes
- When a consumer reports unexpected message shapes

## Procedure

Follow these steps in order. Each step must complete before moving to the next.

### Step 0 — Project Discovery

This step builds a map of the project so the rest of the analysis is grounded in real files.

1. **Find the AsyncAPI spec(s)**:
  - Search the workspace for files matching: `**/asyncapi*.yaml`, `**/asyncapi*.yml`, `**/asyncapi*.json`
  - Also check common locations: `docs/`, `api/`, `spec/`, project root
  - If multiple specs are found, ask the user which to analyse — or analyse all if instructed
  - Confirm the spec uses AsyncAPI version 3.x (check the `asyncapi` field at the root starts with `3.`)

2. **Read the project's copilot-instructions.md** (if it exists at `.github/copilot-instructions.md` or root):
  - Extract: framework, language, directory structure conventions, messaging technology, key service names
  - This accelerates discovery by telling you where to look

3. **Discover messaging-related source code** using the patterns in [discovery-patterns.md](./references/discovery-patterns.md):
   - **Messaging infrastructure**: Queue consumers, topic publishers, broker clients
   - **Validation schemas**: Joi, Zod, Yup, JSON Schema, class-validator, or similar
   - **Event type constants**: String constants, enums, or objects defining event/message type names
   - **Message builders**: Functions that construct outbound message payloads
   - **Messaging config**: Environment variables or config files with queue URLs, topic ARNs, broker addresses
   - **Status constants**: Enums or objects defining message/notification status values

4. **Build a Service Inventory** — a mental model of:
  - Which channels (queues/topics) the service uses (inbound and outbound)
  - Which operations it performs (receive from queue, send/publish to topic)
  - What message shapes it validates on input
  - What message shapes it constructs on output
  - What event type strings it defines
  - What status values it tracks

### Step 1 — Parse the AsyncAPI Spec

Read the discovered AsyncAPI spec file and extract:

1. **Channels**: For each channel, note:
  - Channel name (key)
  - Address (the actual queue/topic name)
  - Protocol and bindings (SQS, SNS, Kafka, AMQP, etc.)
  - Which messages the channel carries

2. **Operations**: For each operation, note:
  - Operation name (key)
  - Action: `send` or `receive`
  - Which channel it references
  - Which message(s) it references
  - Description

3. **Messages**: For each message (in `components.messages` or inline), note:
  - Message name
  - Content type
  - Payload schema: all fields, types, formats, required list, enums, min/max constraints, patterns, defaults
  - Any traits applied

4. **Component Schemas**: For each reusable schema in `components.schemas`, note:
  - Schema name
  - Type, format, constraints (minLength, maxLength, minimum, maximum, pattern, enum)
  - Which messages reference it

### Step 2 — Analyse the Service Implementation

Using the Service Inventory from Step 0, read each discovered source file and extract the **actual** implementation details:

1. **Channels (actual)**:
  - Queue URLs / topic ARNs / broker addresses from config files or environment variable references
  - Map each to the spec channel by matching the address string

2. **Operations (actual)**:
  - Consumer/subscriber registrations (what the service listens to)
  - Publisher/producer calls (what the service sends to)
  - Map each to a spec operation by matching channel + direction (send/receive)

3. **Inbound Message Schemas (actual)**:
  - Read validation schema definitions (Joi objects, Zod schemas, JSON Schema files, etc.)
  - Extract: field names, types, required vs optional, format validations (UUID, email, date-time), enums (.valid()/.enum()), numeric ranges (.min()/.max()/.minimum()/.maximum()), string constraints (.pattern()/.regex()), defaults
  - Map framework-specific constraints to their JSON Schema equivalents:
    - `Joi.string().uuid()` → `{ type: "string", format: "uuid" }`
    - `Joi.number().min(X).max(Y)` → `{ type: "number", minimum: X, maximum: Y }`
    - `Joi.string().valid('a', 'b')` → `{ type: "string", enum: ["a", "b"] }`
    - `Joi.string().pattern(/regex/)` → `{ type: "string", pattern: "regex" }`
    - `z.string().uuid()` → `{ type: "string", format: "uuid" }`
    - `z.enum(['a', 'b'])` → `{ type: "string", enum: ["a", "b"] }`

4. **Outbound Message Payloads (actual)**:
  - Read message builder/factory functions
  - Extract: exact field names included in each outbound message, where values come from, any transformations applied
  - Pay special attention to which fields are always present vs conditionally included

5. **Event Types (actual)**:
  - Read event type constants/enums
  - Extract the exact string values (e.g. `uk.gov.fcp.sfd.notification.received`)
  - Note any status-to-event-type mappings

6. **Status Values (actual)**:
  - Read status constants/enums
  - Extract exact string values and any categorisation (e.g. terminal vs transient, retryable vs final)

### Step 3 — Compare and Detect Drift

Compare the spec (Step 1) against the implementation (Step 2) across these 6 dimensions. For each difference found, classify it using the priority framework in [drift-categories.md](./references/drift-categories.md).

#### Dimension 1: Channels
- Does every channel address in the spec have a matching config value in the code?
- Does the code reference any queue/topic addresses NOT in the spec?
- Do protocol bindings match (e.g. SQS FIFO setting, Kafka partitions)?

#### Dimension 2: Operations
- Does every spec operation have a matching handler in the code?
- Does the code perform any consume/produce operations NOT described in the spec?
- Do send/receive directions match?

#### Dimension 3: Message Schemas
- For each message in the spec, compare every field against the validation schema or message builder:
  - **Field presence**: Is every spec field present in the code? Is every code field present in the spec?
  - **Required vs optional**: Does the spec's `required` list match the code's validation (e.g. `.required()` in Joi)?
  - **Type**: Does `string`/`number`/`object`/`array` match?
  - **Format**: Do format constraints match (uuid, date-time, email)?
  - **Enum values**: Do `.valid()` or `.enum()` values match the spec's `enum` list exactly?
  - **Numeric ranges**: Do min/max match `minimum`/`maximum`?
  - **String constraints**: Do patterns/lengths match `pattern`/`minLength`/`maxLength`?
  - **Defaults**: Do default values match?

#### Dimension 4: Event Types
- Does every event type string constant in the code appear as a `type` enum value in the appropriate spec message?
- Does the spec list any event type values that don't exist in the code constants?
- Are event types mapped to the correct operations/messages?

#### Dimension 5: Status Values
- Do status string constants in the code match enum values in the spec's status-related schemas?
- Are status categories (terminal, retryable, etc.) reflected accurately in the spec descriptions?

#### Dimension 6: Data Payloads
- For each outbound message builder, do the fields it includes match the spec's data schema properties exactly?
- Are conditionally-included fields correctly marked as optional in the spec?
- Are fields that are always included correctly marked as required?

### Step 4 — Generate the Drift Report

Use the template in [report-template.md](./references/report-template.md) to produce the report.

- Fill in all metadata (spec file path, version, service name, date)
- Set the overall status indicator:
  - 🟢 **No drift** — zero findings
  - 🟡 **Minor drift** — only P2/P3 findings
  - 🔴 **Significant drift** — any P0 or P1 findings
- List findings in priority order (P0 first), with specific source file references
- Explain each finding
- Generate proposed fixes for every finding
- Build the verification checklist based on what was actually analysed

### Step 5 — Offer Fixes

After presenting the report:

1. Ask the user if they want to apply the proposed fixes to the AsyncAPI spec
2. If yes, apply fixes **one at a time** in priority order (P0 first)
3. After each fix, briefly confirm what was changed
4. After all fixes are applied, offer to re-run the comparison to verify zero remaining drift

**Remember**: Only edit the AsyncAPI spec file(s). Never edit application source code.
