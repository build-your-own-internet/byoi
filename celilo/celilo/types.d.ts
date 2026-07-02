// Generated from manifest.yml by `celilo module types generate`.
// Do not edit by hand. Run the command again after changing `variables.owns`.
// CI enforces this file stays in sync via `celilo module types check`.

/**
 * Configuration shape for the Build Your Own Internet module.
 *
 * Static Astro documentation site for Build Your Own Internet, served via Caddy.
 *
 * Fields are derived from `variables.owns` and `variables.imports` in the
 * module manifest. Optional fields (marked with `?`) correspond to variables
 * that are neither `required: true` nor have a `default:` value.
 *
 * Emitted as a `type` alias rather than an `interface` so it satisfies the
 * `Record<string, unknown>` constraint on `defineHook<Config>`: TypeScript
 * gives type aliases an implicit index signature but withholds one from
 * interfaces (which can be declaration-merged). See v2/issues.
 */
export type ByoiConfig = {
  // Module-owned variables (from variables.owns)
  /** Public domain this site serves on (must be a caddy hostname). */
  domain: string;
};
