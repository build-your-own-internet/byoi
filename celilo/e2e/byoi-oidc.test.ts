/**
 * Phase 2 E2E test: byoi OIDC login via Authentik (byoi_deployment.md §2.5).
 *
 * Topology: direct-internet (fw-main only, no greenwave)
 *   fw-main    192.168.0.254   iptables NAT + external routing
 *   caddy      10.0.10.10      DMZ, serves the static site
 *   authentik  10.0.20.30      app zone, identity provider
 *
 * Dependency order: namecheap → iptables (deployFirewall) → caddy → authentik → byoi
 *
 * What this verifies:
 *   1. Provisioning: on_install created the `byoi` OIDC client, the
 *      byoi-admins/byoi-users groups, and the byoi_admin user in Authentik
 *   2. Config: https://<domain>/config.js carries the real CLIENT_ID and
 *      AUTHENTIK_URL, with no dev-mode markers
 *   3. Login flow: inline PKCE walk (identification → password → redirect →
 *      token exchange) as byoi_admin — §2.5 marks this optional; drop it if
 *      it proves flaky and keep stages 1+2 as the gate
 */

import { afterAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { network, progress } from '@celilo/e2e';
import type { NetworkHandle } from '@celilo/e2e/types';

const MODULE_DIR = join(import.meta.dir, '..');
const DOMAIN = 'iamtheinternet.org';
const PEBBLE_CERT = '/usr/local/share/ca-certificates/pebble-acme-root.crt';
const AUTHENTIK_API = 'http://10.0.20.30:9000/api/v3';
// client_id is derived by the idp provider as `${client_name}-web`
const CLIENT_ID = 'byoi-web';
const ADMIN_PASSWORD = 'TestByoi123!';

describe('byoi oidc', () => {
  let net: NetworkHandle;
  let stageError: string | null = null;

  function requireStage(label: string) {
    if (stageError) throw new Error(`Skipped — prior stage failed (${stageError})`);
  }

  afterAll(async () => {
    await net?.stop();
  });

  // ── Stage 1: deploy ─────────────────────────────────────────────────────────

  test('stage 1: publish module, stand up infra, deploy byoi with authentik', async () => {
    try {
      net = await network()
        .topology('direct-internet')
        .dmz({ caddy: '10.0.10.10' })
        .app({ authentik: '10.0.20.30' })
        .observe('publicInternet')
        .start();

      progress('publishing byoi to e2e registry', 'module published');
      await net.publishModule(MODULE_DIR);

      // The firewall provides the dmz/app zones before services are placed.
      progress('deploying firewall (provides dmz + app)', 'firewall deployed');
      await net.deployFirewall({ zones: ['dmz', 'app'] });

      progress('adding machines', 'machines added');
      await net.celilo('machine add 10.0.10.10 --ssh-user root');
      await net.celilo('machine add 10.0.20.30 --ssh-user root');

      progress('importing modules', 'modules imported');
      await net.celilo('module import namecheap');
      await net.celilo('module import caddy');
      await net.celilo('module import authentik');
      await net.celilo('module import byoi');

      progress('configuring modules', 'modules configured');
      await net.celilo(
        `module secret set namecheap ddns_passwords '${JSON.stringify({ [DOMAIN]: 'test123' })}'`,
      );
      await net.celilo('module config set caddy hostname www');
      // Pre-stage every hostname (apex, www, auth) so the cross-module
      // ensure interview doesn't fire when byoi/authentik register routes.
      await net.celilo(
        `module config set caddy hostnames '${JSON.stringify([
          `www.${DOMAIN}`,
          DOMAIN,
          `auth.${DOMAIN}`,
        ])}'`,
      );
      await net.celilo(`module config set caddy acme_email admin@${DOMAIN}`);
      await net.configureAcme();
      await net.celilo('module secret set authentik admin_password TestAdmin123!');
      await net.celilo('module config set authentik hostname authentik');
      await net.celilo(`module config set authentik admin_email admin@${DOMAIN}`);
      await net.celilo(`module config set authentik domain ${DOMAIN}`);
      await net.celilo(`module config set byoi domain ${DOMAIN}`);
      // Set explicitly (rather than letting celilo generate) so the PKCE
      // stage below can log in as byoi_admin with a known password.
      await net.celilo(`module secret set byoi admin_password '${ADMIN_PASSWORD}'`);

      progress('deploying namecheap', 'namecheap deployed');
      await net.celilo('module deploy namecheap');

      progress('deploying caddy', 'caddy deployed');
      await net.celilo('module deploy caddy', 300_000);

      progress('deploying authentik', 'authentik deployed');
      await net.celilo('module deploy authentik', 900_000);

      progress('deploying byoi', 'byoi deployed');
      await net.celilo('module deploy byoi', 180_000);

      progress.done('all modules deployed');
    } catch (err) {
      stageError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }, 1_800_000);

  // ── Stage 2: Authentik provisioning assertions ──────────────────────────────

  test('stage 2: OIDC client, groups, and admin user provisioned in authentik', async () => {
    requireStage('deploy');

    const tokenOut = await net.celilo('module secret get authentik authentik_bootstrap_token');
    const bootstrapToken = tokenOut.stdout.trim();
    expect(bootstrapToken.length).toBeGreaterThan(0);

    const authentikGet = async (path: string) => {
      const result = await net.exec(
        'management',
        `curl -s -H 'Authorization: Bearer ${bootstrapToken}' ` +
          `-H 'Accept: application/json' '${AUTHENTIK_API}${path}'`,
      );
      const body = result.stdout.trim();
      if (!body || body.startsWith('<')) {
        throw new Error(`Authentik API error on ${path} (exit ${result.exitCode}): ${body.slice(0, 200)}`);
      }
      return JSON.parse(body) as { results: Array<Record<string, unknown>> };
    };

    progress('verifying byoi OIDC client', 'OIDC client registered');
    const providers = await authentikGet('/providers/oauth2/');
    const byoiProvider = providers.results.find((r) => r.client_id === CLIENT_ID);
    expect(byoiProvider).toBeDefined();

    progress('verifying groups', 'byoi-admins and byoi-users exist');
    const groups = await authentikGet('/core/groups/');
    const groupNames = groups.results.map((g) => g.name);
    expect(groupNames).toContain('byoi-admins');
    expect(groupNames).toContain('byoi-users');

    progress('verifying byoi_admin user', 'byoi_admin exists');
    const users = await authentikGet('/core/users/?username=byoi_admin');
    expect(users.results.length).toBeGreaterThan(0);

    progress.done('authentik provisioning verified');
  }, 120_000);

  // ── Stage 3: served config.js has production values ─────────────────────────

  test('stage 3: config.js served over HTTPS with real client id, no dev mode', async () => {
    requireStage('deploy');

    progress('waiting for HTTPS on apex', 'apex serves HTTPS');
    await net.waitFor(
      async () => {
        const result = await net.exec(
          'fw-ext',
          `curl -sf --max-time 5 --cacert ${PEBBLE_CERT} https://${DOMAIN}/ -o /dev/null 2>&1`,
        );
        return result.exitCode === 0;
      },
      120_000,
      `HTTPS response from ${DOMAIN}`,
    );

    progress('fetching config.js', 'config.js verified');
    const configJs = await net.exec(
      'fw-ext',
      `curl -sf --max-time 10 --cacert ${PEBBLE_CERT} https://${DOMAIN}/config.js`,
    );
    expect(configJs.exitCode).toBe(0);
    expect(configJs.stdout).toContain('window.__BYOI_CONFIG__');
    expect(configJs.stdout).toContain(`"CLIENT_ID":"${CLIENT_ID}"`);
    expect(configJs.stdout).toContain(`https://auth.${DOMAIN}/application/o`);
    expect(configJs.stdout).toContain(`https://${DOMAIN}/auth/callback`);
    expect(configJs.stdout).not.toContain('AUTH_MODE');
    expect(configJs.stdout).not.toContain('localhost');

    progress.done('config.js carries production OIDC values');
  }, 180_000);

  // ── Stage 4: PKCE login flow (§2.5 item 3 — optional; drop if flaky) ────────

  test('stage 4: byoi_admin completes a PKCE login against authentik', async () => {
    requireStage('deploy');

    // Caddy starts ACME for auth.<domain> when authentik registers its
    // route; wait for a valid HTTPS response before walking the flow.
    progress('waiting for Caddy TLS on auth subdomain', 'Caddy TLS ready');
    await net.waitFor(
      async () => {
        const r = await net.exec(
          'management',
          `curl -sk --connect-timeout 3 https://auth.${DOMAIN}/ -w "%{http_code}" -o /dev/null 2>/dev/null || echo "0"`,
        );
        const code = parseInt(r.stdout.trim(), 10);
        return code > 0 && code < 600;
      },
      120_000,
      `Caddy serving HTTPS for auth.${DOMAIN}`,
    );

    progress('running PKCE login flow', 'login flow completed');

    // Inline PKCE walk (modeled on lunacycle's deploy.test.ts): authorize →
    // identification → password → consent → redirect with ?code= → token
    // exchange. byoi is a static site, so a successful token exchange IS the
    // end state — there's no protected API to call afterwards.
    const pkceScript = /* typescript */ `
import { createHash, randomBytes } from 'node:crypto';

const AUTHENTIK = 'https://auth.${DOMAIN}';
const CLIENT_ID = '${CLIENT_ID}';
const REDIRECT_URI = 'https://${DOMAIN}/auth/callback';
const USERNAME = 'byoi_admin';
const PASSWORD = '${ADMIN_PASSWORD}';

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(16).toString('hex');
const authorizeParams = new URLSearchParams({
  client_id: CLIENT_ID,
  response_type: 'code',
  scope: 'openid profile email',
  redirect_uri: REDIRECT_URI,
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
});
const authUrl = AUTHENTIK + '/application/o/authorize/?' + authorizeParams;

// Cookie jar — Authentik uses Django sessions; must replay cookies between requests
function mergeCookies(existing: string, response: Response): string {
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const jar = new Map<string, string>();
  for (const pair of existing.split(';').map(s => s.trim()).filter(Boolean)) {
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  for (const header of setCookie) {
    const val = header.split(';')[0].trim();
    const idx = val.indexOf('=');
    if (idx > 0) jar.set(val.slice(0, idx), val.slice(idx + 1));
  }
  return [...jar.entries()].map(([k, v]) => k + '=' + v).join('; ');
}

// Run a flow executor to completion, handling identification + password stages
async function runFlowExecutor(
  slug: string, params: string, startCookies: string,
): Promise<{ to: string; cookies: string }> {
  let cookies = startCookies;
  const execBase = AUTHENTIK + '/api/v3/flows/executor/' + slug + '/?' + params;
  const hdrs = (extra?: object) => ({
    'Content-Type': 'application/json', Accept: 'application/json', Cookie: cookies, ...extra,
  });

  const initResp = await fetch(execBase, { headers: hdrs() });
  cookies = mergeCookies(cookies, initResp);
  let stage = await initResp.json() as { component: string; to?: string };

  if (stage.component === 'ak-stage-identification') {
    const r = await fetch(execBase, {
      method: 'POST', headers: hdrs(), body: JSON.stringify({ uid_field: USERNAME }),
    });
    cookies = mergeCookies(cookies, r);
    stage = await r.json() as { component: string; to?: string };
  }

  if (stage.component === 'ak-stage-password') {
    const r = await fetch(execBase, {
      method: 'POST', headers: hdrs(), body: JSON.stringify({ password: PASSWORD }),
    });
    cookies = mergeCookies(cookies, r);
    stage = await r.json() as { component: string; to?: string };
  }

  // Handle any remaining stages (e.g. implicit consent) with empty POSTs
  for (let i = 0; i < 5 && stage.component !== 'xak-flow-redirect'; i++) {
    const r = await fetch(execBase, {
      method: 'POST', headers: hdrs(), body: JSON.stringify({}),
    });
    cookies = mergeCookies(cookies, r);
    stage = await r.json() as { component: string; to?: string };
  }

  if (stage.component !== 'xak-flow-redirect' || !stage.to) {
    throw new Error('Flow did not complete: ' + JSON.stringify(stage));
  }
  return { to: stage.to, cookies };
}

// Phase 1: Authentication — GET authorize to kick off the auth flow
let cookies = '';
const authResp = await fetch(authUrl, { redirect: 'manual' });
cookies = mergeCookies(cookies, authResp);
let flowUrl = authResp.headers.get('location');
if (!flowUrl) throw new Error('No redirect from authorization endpoint: ' + authResp.status);

// Authentik 2024+: /flows/-/default/authentication/ → /if/flow/<slug>/
if (!flowUrl.includes('/if/flow/')) {
  const hop2 = await fetch(new URL(flowUrl, AUTHENTIK).toString(), {
    redirect: 'manual', headers: { Cookie: cookies },
  });
  cookies = mergeCookies(cookies, hop2);
  flowUrl = hop2.headers.get('location') ?? flowUrl;
}

const authFlowUrl = new URL(flowUrl, AUTHENTIK);
const authSlug = authFlowUrl.pathname.replace('/if/flow/', '').split('/')[0];
const authResult = await runFlowExecutor(authSlug, authFlowUrl.searchParams.toString(), cookies);
cookies = authResult.cookies;

// Phase 2: Re-call authorize with the authenticated session — Authentik routes
// to the consent flow which returns the final redirect_uri with ?code=
const authAgain = await fetch(authUrl, { redirect: 'manual', headers: { Cookie: cookies } });
cookies = mergeCookies(cookies, authAgain);
const consentFlowLoc = authAgain.headers.get('location');
if (!consentFlowLoc) throw new Error('No redirect after re-authorize: ' + authAgain.status);

const consentFlowUrl = new URL(consentFlowLoc, AUTHENTIK);
const consentSlug = consentFlowUrl.pathname.replace('/if/flow/', '').split('/')[0];
const consentResult = await runFlowExecutor(consentSlug, consentFlowUrl.searchParams.toString(), cookies);

// The consent flow's xak-flow-redirect.to is the full callback URL with ?code=
const codeUrl = new URL(consentResult.to, AUTHENTIK);
const code = codeUrl.searchParams.get('code');
if (!code) throw new Error('No code in consent redirect: ' + consentResult.to);

// Exchange code for tokens — public client + PKCE, no client_secret
const tokenResp = await fetch(AUTHENTIK + '/application/o/token/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  }),
});
const tokens = await tokenResp.json() as { access_token?: string; error?: string };
if (!tokens.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(tokens));
console.log('access_token:' + tokens.access_token.substring(0, 20) + '...');
`;

    // Base64-encode to avoid shell escaping issues with the multiline script.
    // Fetch Pebble's runtime CA (generated fresh each startup) so bun trusts
    // Caddy's TLS cert for auth.<domain>.
    const pkceEncoded = Buffer.from(pkceScript).toString('base64');
    const pkceResult = await net.exec(
      'management',
      `curl -sk https://100.64.0.100:15000/roots/0 > /tmp/pebble-ca.crt && ` +
        `echo '${pkceEncoded}' | base64 -d > /tmp/pkce-flow.ts && ` +
        `NODE_EXTRA_CA_CERTS=/tmp/pebble-ca.crt bun run /tmp/pkce-flow.ts`,
      120_000,
    );

    if (!pkceResult.stdout.includes('access_token:')) {
      throw new Error(
        `PKCE script failed (exit ${pkceResult.exitCode}):\n` +
          (pkceResult.stderr?.slice(0, 500) || pkceResult.stdout.slice(0, 500) || '(no output)'),
      );
    }

    progress.done('byoi_admin authenticated end-to-end via PKCE');
  }, 300_000);
});
