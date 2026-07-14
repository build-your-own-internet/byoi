# Changesets — byoi release versioning

byoi's payload version (`celilo/manifest.yml#version`) is authored via changesets,
not bumped by hand. Adopted for `version_source: { kind: changeset }` (by-chz / ISS-0151).

## Add a changeset in every behaviour-changing PR

```bash
bunx @celilo/cli module changeset celilo --bump <major|minor|patch> --message "what changed"
```

This writes `.changeset/<name>.md` keyed by the module id (`byoi`). Pick the bump by
deploy **blast radius**, not API compatibility (byoi provides no capability): `patch`
for content/recipe tweaks, `minor`/`major` to request a safer (backup-first) deploy.

A PR with **no** changeset makes **no** release — ordinary edits that shouldn't ship
a new `.netapp` simply omit one.

## Releasing (automated)

On merge to `main`, `.github/workflows/publish-netapp.yml` runs
`celilo module version celilo`, which consumes every pending `.changeset/*.md`, stamps
the new `version:` + `CHANGELOG.md`, commits that back, and publishes the `.netapp`.
No manual version bump, no `--allow-stale`.
