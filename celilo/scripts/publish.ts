import { defineHook, subdomainOf } from '@celilo/capabilities';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HookLogger, IdpCapability, PublicWebCapability } from '@celilo/capabilities';
import type { ByoiConfig } from '../celilo/types';

// scripts/ is one level below the module root. The packaged netapp carries the
// built site at <module>/web/dist (staged there by the manifest build command),
// so resolve dist relative to the module root, not the repo root.
const defaultDistDir = join(import.meta.dir, '..', 'web', 'dist');

export interface ByoiPublishDeps {
  config: ByoiConfig;
  logger: HookLogger;
  capabilities: { public_web?: PublicWebCapability; idp?: IdpCapability };
  secrets?: Record<string, string>;
  /** Overridable for tests so we can assert on the value without touching disk. */
  distDir?: string;
}

export async function byoiPublish(deps: ByoiPublishDeps): Promise<void> {
  const { config, logger, capabilities } = deps;
  const distDir = deps.distDir ?? defaultDistDir;

  if (!capabilities.public_web) {
    throw new Error('public_web capability not available — deploy Caddy first');
  }

  // Phase 2 (byoi_deployment.md §2.2): OIDC provisioning, guarded so Phase 1
  // deploys still work without Authentik. Runs BEFORE publish so the client_id
  // can be baked into config.js in the upload (resolves risk #1: no post-publish
  // write needed — publishStaticSite uploads everything in sourceDir).
  if (capabilities.idp) {
    const password = deps.secrets?.admin_password;
    if (!password) {
      throw new Error('admin_password secret not available — required for idp provisioning');
    }

    // Static SPA → public client with PKCE, no secret. Both calls are idempotent.
    const oidc = await capabilities.idp.create_oidc_client({
      client_name: 'byoi',
      redirect_uris: [`https://${config.domain}/auth/callback`],
      client_type: 'public',
      groups: ['byoi-admins', 'byoi-users'],
    });
    logger.info(`OIDC client 'byoi' provisioned (client_id ${oidc.client_id})`);

    await capabilities.idp.create_user({
      username: 'byoi_admin',
      email: 'admin@example.org',
      password,
      groups: ['byoi-admins'],
    });
    logger.success('Provisioned byoi_admin user in byoi-admins');

    // Runtime config for the browser PKCE client (web/src/lib/auth-client.ts).
    // Hand-written rather than publishStaticSite's clientConfig because the
    // frontend contract is window.__BYOI_CONFIG__, not __MODULE_CONFIG__.
    const clientConfig = {
      AUTHENTIK_URL: `https://${subdomainOf(capabilities.public_web, 'auth')}/application/o`,
      CLIENT_ID: oidc.client_id,
      APPLICATION_SLUG: oidc.application_slug,
      REDIRECT_URI: `https://${config.domain}/auth/callback`,
    };
    writeFileSync(
      join(distDir, 'config.js'),
      `window.__BYOI_CONFIG__ = ${JSON.stringify(clientConfig)};\n`,
      'utf-8',
    );
    logger.info('Wrote runtime config.js into dist');
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

export default defineHook<ByoiConfig, [], ['public_web', 'dns_registrar', 'idp'], 'on_install'>({
  hook: 'on_install',
  requires: [],
  optional: ['public_web', 'dns_registrar', 'idp'],
  handler: async ({ config, logger, capabilities, secrets }) =>
    byoiPublish({ config, logger, capabilities, secrets }),
});
