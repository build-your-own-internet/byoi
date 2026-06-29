# Project Instructions for Claude

## Issue Management Protocol

### Issue Directory Structure
All issues are tracked in `issues/` at repo root. Each issue is a YAML file named `ISS-####.yml` where `####` is a zero-padded monotonically increasing integer (e.g. ISS-0001.yml, ISS-0042.yml).

### Issue File Format
Every issue file MUST contain these fields:

```yaml
title: Short descriptive title
description: |
  Detailed multi-line description of the problem, context, and what needs to be done.
  Include specifics like file paths, error messages, or examples.
severity: high | medium | low
type: feature | bug
status: open | in-progress | fixed | closed
solution: |  # REQUIRED for status: fixed or closed
  Explanation of what was done to fix/implement this.
  Include approach taken, files changed, key decisions.
```

### When to Create an Issue

**THE FIRST THING YOU DO** when you hear about a problem is CREATE an issue file. This includes:
- User reports a bug
- User requests a feature
- You discover a bug while working
- You leave something unimplemented/incomplete
- Validation catches an error
- You make a design decision to defer work

If the user says "file an issue" or similar, immediately create the issue file.

### Issue Lifecycle

1. **Create** — set `status: open`, assign next available ISS number
2. **Start work** — update `status: in-progress` 
3. **Implementation complete** — update `status: fixed` when work is done and tested, ADD `solution` field explaining the fix
4. **UAT passed** — update `status: closed` ONLY when user confirms it works (keep the `solution` field)
5. **Reopen** — if UAT fails, change back to `open` or `in-progress`

**NEVER delete issue files** — they remain as historical record regardless of status.

**Status transition rules:**
- `open` → `in-progress` → `fixed` → `closed` (normal flow)
- `fixed` → `in-progress` (UAT failed, needs more work)
- Only transition to `closed` when user explicitly confirms or accepts the work
- When transitioning to `fixed`, MUST add `solution` field documenting the fix

### Finding Next Issue Number

```bash
# Get highest existing number
ls issues/ | grep -oP 'ISS-\K\d+' | sort -n | tail -1
# Add 1, zero-pad to 4 digits
```

### Example Workflow

User: "The images aren't loading"

You immediately:
1. Create `issues/ISS-0008.yml` with status: open
2. Investigate the issue
3. Update status: in-progress when you start fixing
4. Update status: fixed when implementation complete and tested
5. Update status: closed ONLY when user confirms it works (UAT)
6. NEVER delete ISS-0008.yml — it remains as historical record

### Cross-Referencing

When working on code, reference the issue in comments:
```typescript
// ISS-0042: post-process HTML instead of custom renderer to fix nested image links
```

When closing an issue via code changes, mention it in commit messages:
```
Fix image rendering (closes ISS-0042)
```
