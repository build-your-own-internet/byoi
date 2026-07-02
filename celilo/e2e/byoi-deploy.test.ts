/**
 * E2E test: byoi deploys the Build Your Own Internet Astro static site via
 * Caddy's public_web capability.
 *
 * Topology: direct-internet (fw-main only, no greenwave)
 *   fw-main  192.168.0.254   iptables NAT + external routing
 *   caddy    10.0.10.10      DMZ, serves the static site
 *
 * Dependency order: namecheap → iptables → caddy → byoi
 *
 * What this verifies:
 *   - Module packages correctly (Astro build runs during publishModule)
 *   - on_install hook calls publishStaticSite with the correct domain
 *   - Static files land on the caddy host and are served over HTTPS
 *   - The home page HTML contains expected content
 */

import { afterAll, describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { assertFrontedServicePositives, network, progress } from '@celilo/e2e';
import type { NetworkHandle } from '@celilo/e2e/types';

const MODULE_DIR = join(import.meta.dir, '..');
const DOMAIN = 'iamtheinternet.org';
const PEBBLE_CERT = '/usr/local/share/ca-certificates/pebble-acme-root.crt';

describe('byoi deploy', () => {
  let net: NetworkHandle;
  let stageError: string | null = null;

  function requireStage(label: string) {
    if (stageError) throw new Error(`Skipped — prior stage failed (${stageError})`);
  }

  afterAll(async () => {
    await net?.stop();
  });

  // ── Stage 1: deploy ─────────────────────────────────────────────────────────

  test('stage 1: publish module, stand up infra, deploy byoi', async () => {
    try {
      net = await network()
        .topology('direct-internet')
        .dmz({ caddy: '10.0.10.10' })
        .observe('publicInternet')
        .start();

      progress('publishing byoi to e2e registry', 'module published');
      await net.publishModule(MODULE_DIR);

      // Honest model: the firewall provides the dmz zone before any dmz
      // service is placed.
      progress('deploying firewall (provides dmz)', 'firewall deployed');
      await net.deployFirewall({ zones: ['dmz'] });

      progress('adding machines', 'machines added');
      await net.celilo('machine add 10.0.10.10 --ssh-user root');

      progress('importing modules', 'modules imported');
      await net.celilo('module import namecheap');
      await net.celilo('module import caddy');
      await net.celilo('module import byoi');

      progress('configuring modules', 'modules configured');
      await net.celilo(
        `module secret set namecheap ddns_passwords '${JSON.stringify({ [DOMAIN]: 'test123' })}'`,
      );
      await net.celilo('module config set caddy hostname www');
      // Include both www. and apex — the website registers a route on the
      // apex, and we pre-stage caddy.hostnames here so the cross-module
      // ensure interview doesn't fire and try to extend it in-flight.
      await net.celilo(`module config set caddy hostnames '["www.${DOMAIN}","${DOMAIN}"]'`);
      await net.celilo(`module config set caddy acme_email admin@${DOMAIN}`);
      await net.configureAcme();
      await net.celilo(`module config set byoi domain ${DOMAIN}`);

      progress('deploying namecheap', 'namecheap deployed');
      await net.celilo('module deploy namecheap');

      progress('deploying caddy', 'caddy deployed');
      await net.celilo('module deploy caddy', 180_000);

      progress('deploying byoi', 'byoi deployed');
      await net.celilo('module deploy byoi', 120_000);

      progress.done('all modules deployed');
    } catch (err) {
      stageError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }, 300_000);

  // ── Stage 2: DNS and TLS ────────────────────────────────────────────────────

  test('stage 2: DNS resolves and TLS certificate is issued', async () => {
    requireStage('deploy');

    progress('verifying DNS for iamtheinternet.org', 'DNS resolves');
    await net.waitFor(
      async () => {
        const ip = await net.dig(DOMAIN);
        return ip.length > 0;
      },
      30_000,
      `DNS resolution for ${DOMAIN}`,
    );

    progress('verifying ACME certificate', 'certificate issued');
    await net.waitFor(
      async () => {
        const result = await net.exec('caddy', 'find /var/lib/caddy -name "*.crt" 2>/dev/null');
        return result.stdout.trim().length > 0;
      },
      60_000,
      'ACME certificate issuance',
    );

    progress.done('DNS resolves and TLS cert issued');
  }, 120_000);

  // ── Stage 3: content ────────────────────────────────────────────────────────

  test('stage 3: static site is served over HTTPS and contains expected content', async () => {
    requireStage('deploy');

    progress('verifying HTTPS response from internet', 'site responds over HTTPS');
    await net.waitFor(
      async () => {
        const result = await net.exec(
          'fw-ext',
          `curl -sf --max-time 5 --cacert ${PEBBLE_CERT} https://${DOMAIN}/ 2>&1`,
        );
        return result.exitCode === 0 && result.stdout.length > 0;
      },
      60_000,
      `HTTPS response from ${DOMAIN}`,
    );

    progress('verifying site content', 'content verified');
    const page = await net.exec(
      'fw-ext',
      `curl -sf --max-time 10 --cacert ${PEBBLE_CERT} https://${DOMAIN}/`,
    );
    expect(page.exitCode).toBe(0);
    expect(page.stdout.toLowerCase()).toContain('build your own internet');

    // Positive vantage assertion (ISS-0117): from the public internet, the apex resolves to
    // a public IP and serves valid HTTPS (real cert). Direct-internet topology has no home
    // LAN, so there is no internalDevice/natIp seat to assert here.
    progress('asserting public vantage', 'public vantage asserted');
    await assertFrontedServicePositives(net, { fqdn: DOMAIN });

    progress.done('static site verified');
  }, 120_000);
});
