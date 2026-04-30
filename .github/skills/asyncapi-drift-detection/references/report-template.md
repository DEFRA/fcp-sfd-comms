# Drift Report Template

Use this template verbatim when generating the drift report. Replace placeholders (`{...}`) with actual values. Omit priority sections that have zero findings.

---

````markdown
# AsyncAPI Contract Drift Report

**Spec**: `{spec_file_path}` (AsyncAPI {asyncapi_version}, info.version: {info_version})
**Service**: {service_name}
**Date**: {date}
**Overall Status**: {status_indicator}

> {status_indicator} is one of:
> - 🟢 **No drift** — spec and implementation are aligned
> - 🟡 **Minor drift** — only P2/P3 findings (no breaking contract issues)
> - 🔴 **Significant drift** — P0 or P1 findings present (contract is inaccurate)

---

## Summary

| Metric | Count |
|--------|-------|
| Total differences | {total} |
| P0 Critical | {p0_count} |
| P1 High | {p1_count} |
| P2 Medium | {p2_count} |
| P3 Low | {p3_count} |

| | Spec | Implementation |
|--|------|----------------|
| Channels | {spec_channels} | {impl_channels} |
| Operations | {spec_operations} | {impl_operations} |
| Message types | {spec_messages} | {impl_messages} |
| Event type values | {spec_event_types} | {impl_event_types} |

---

## Findings

### P0 — Critical (resolve immediately)

These indicate the spec is materially wrong — consumers relying on this documentation will encounter unexpected behaviour.

| # | Category | Spec Says | Service Does | Source File | Impact |
|---|----------|-----------|--------------|-------------|--------|
| {n} | {category} | {spec_value} | {impl_value} | `{file_path}` | {impact_description} |

### P1 — High (resolve before next release)

These indicate schema-level inaccuracies that could cause validation or integration issues.

| # | Category | Spec Says | Service Does | Source File | Impact |
|---|----------|-----------|--------------|-------------|--------|
| {n} | {category} | {spec_value} | {impl_value} | `{file_path}` | {impact_description} |

### P2 — Medium (resolve when convenient)

These are correctness gaps that are unlikely to cause runtime failures but reduce documentation quality.

| # | Category | Spec Says | Service Does | Source File | Impact |
|---|----------|-----------|--------------|-------------|--------|
| {n} | {category} | {spec_value} | {impl_value} | `{file_path}` | {impact_description} |

### P3 — Low (nice to have)

Documentation quality improvements.

| # | Category | Spec Says | Service Does | Source File | Impact |
|---|----------|-----------|--------------|-------------|--------|
| {n} | {category} | {spec_value} | {impl_value} | `{file_path}` | {impact_description} |

---

## Proposed Fixes

For each finding above, a specific change to apply to the AsyncAPI spec:

### Fix #{n}: {short_title}

- **File**: `{spec_file_path}`
- **YAML Path**: `{yaml_path}` (e.g. `components.schemas.statusDetails.properties.status.enum`)
- **Action**: {Add | Modify | Remove}
- **Change**: {precise description of what to add, modify, or remove in the YAML}
- **Priority**: {P0 | P1 | P2 | P3}

---

## Verification Checklist

After applying fixes, verify:

- [ ] All queue/topic addresses in code have matching spec channels
- [ ] All consumer/producer handlers have matching spec operations
- [ ] All validation schema fields match spec message schemas (names, types, formats, required, enums, constraints)
- [ ] All event type string constants appear in the correct spec message type enums
- [ ] All status string constants appear in the correct spec schema enums
- [ ] All outbound message builder fields match spec data schema properties
- [ ] No spec channel, operation, or message exists without a corresponding implementation
- [ ] No implementation channel, operation, or message exists without spec documentation
````

---

## Formatting Rules

- **Omit empty sections**: If a priority level has zero findings, omit that entire section (don't show an empty table)
- **Source File links**: Use workspace-relative paths (e.g. `src/messaging/outbound/received-request/index.js`)
- **Category values**: Use one of: `Channel`, `Operation`, `Message Schema`, `Event Type`, `Status Value`, `Data Payload`
- **Impact descriptions**: One sentence explaining the consumer-facing consequence (e.g. "Consumers expecting field X will receive field Y instead")
- **YAML Path**: Use dot notation from the spec root (e.g. `channels.commsRequestQueue.address`)
- **Fix numbering**: Must match the finding number for traceability
