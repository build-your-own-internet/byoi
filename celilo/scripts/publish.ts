import { defineHook } from '@celilo/capabilities';
import { join } from 'node:path';
import type { HookLogger, PublicWebCapability } from '@celilo/capabilities';
import type { ByoiConfig } from '../celilo/types';

// scripts/ is one level below the module root, which sits beside web/ at the repo root
const defaultDistDir = join(import.meta.dir, '..', '..', 'web', 'dist');

export interface ByoiPublishDeps {
  config: ByoiConfig;
  logger: HookLogger;
  capabilities: { public_web?: PublicWebCapability };
  /** Overridable for tests so we can assert on the value without touching disk. */
  distDir?: string;
}

export async function byoiPublish(deps: ByoiPublishDeps): Promise<void> {
  const { config, logger, capabilities } = deps;
  const distDir = deps.distDir ?? defaultDistDir;

  if (!capabilities.public_web) {
    throw new Error('public_web capability not available — deploy Caddy first');
  }

  logger.info(`Publishing ${config.domain} from ${distDir}`);

  const result = await capabilities.public_web.publishStaticSite({
    path: '/',
    sourceDir: distDir,
    hostname: config.domain,
  });

  if (!result.success) {
    throw new Error(`Failed to publish to ${config.domain}`);
  }

  logger.success(`Published ${result.filesUploaded} files to ${config.domain}`);
}

export default defineHook<ByoiConfig, [], ['public_web', 'dns_registrar'], 'on_install'>({
  hook: 'on_install',
  requires: [],
  optional: ['public_web', 'dns_registrar'],
  handler: async ({ config, logger, capabilities }) =>
    byoiPublish({ config, logger, capabilities }),
});
