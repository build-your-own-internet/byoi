import { describe, expect, test } from 'bun:test';
import { createMockFetcher, createSilentLogger } from '@celilo/capabilities';
import { byoiHealthCheck, evaluateIsitup, retryFetch } from './health-check';
import type { ByoiConfig } from '../celilo/types';

const DOMAIN = 'www.buildyourowninternet.dev';

describe('evaluateIsitup', () => {
  test('pass on 2xx', () => {
    expect(
      evaluateIsitup(
        {
          domain: 'x.com',
          port: 443,
          status_code: 1,
          response_ip: '1.2.3.4',
          response_code: 200,
          response_time: 0.1,
        },
        'x.com',
      ).status,
    ).toBe('pass');
  });

  test('fail on 5xx', () => {
    expect(
      evaluateIsitup(
        {
          domain: 'x.com',
          port: 443,
          status_code: 1,
          response_ip: '1.2.3.4',
          response_code: 502,
          response_time: 0.1,
        },
        'x.com',
      ).status,
    ).toBe('fail');
  });
});

describe('retryFetch', () => {
  test('returns ok on first success', async () => {
    const { fetch } = createMockFetcher([{ match: 'https://x', status: 200 }]);
    const result = await retryFetch({
      fetchImpl: fetch,
      url: 'https://x',
      totalTimeoutMs: 1_000,
      logger: createSilentLogger(),
      now: (() => {
        let t = 0;
        return () => {
          t += 10;
          return t;
        };
      })(),
      sleep: async () => {},
    });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
  });

  test('gives up after timeout with last failure message', async () => {
    const { fetch } = createMockFetcher([{ match: 'https://x', status: 500 }]);
    // Simulated clock: start=0, then advance 2s per check so we get through
    // at least one attempt before the budget expires.
    let t = 0;
    const now = () => {
      const v = t;
      t += 2_000;
      return v;
    };
    const result = await retryFetch({
      fetchImpl: fetch,
      url: 'https://x',
      totalTimeoutMs: 5_000,
      logger: createSilentLogger(),
      now,
      sleep: async () => {},
      attemptIntervalMs: 100,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('returned 500');
  });
});

describe('byoiHealthCheck', () => {
  test('healthy when internal HTTP and isitup both succeed', async () => {
    const { fetch } = createMockFetcher([
      { match: `https://${DOMAIN}/`, status: 200, body: '<html>' },
      {
        match: 'isitup.org',
        status: 200,
        body: JSON.stringify({
          domain: DOMAIN,
          port: 443,
          status_code: 1,
          response_ip: '1.2.3.4',
          response_code: 200,
          response_time: 0.2,
        }),
      },
    ]);

    const result = await byoiHealthCheck({
      fetchImpl: fetch,
      config: { domain: DOMAIN } as unknown as ByoiConfig,
      logger: createSilentLogger(),
      sleep: async () => {},
      internalRetryTimeoutMs: 50,
    });

    expect(result.status).toBe('healthy');
  });

  test('unhealthy when internal HTTP fails', async () => {
    const { fetch } = createMockFetcher([
      { match: `https://${DOMAIN}/`, status: 500 },
      {
        match: 'isitup.org',
        status: 200,
        body: JSON.stringify({
          domain: DOMAIN,
          port: 443,
          status_code: 1,
          response_ip: '1.2.3.4',
          response_code: 200,
          response_time: 0.2,
        }),
      },
    ]);

    const result = await byoiHealthCheck({
      fetchImpl: fetch,
      config: { domain: DOMAIN } as unknown as ByoiConfig,
      logger: createSilentLogger(),
      sleep: async () => {},
      internalRetryTimeoutMs: 50,
    });

    expect(result.status).toBe('unhealthy');
  });

  test('degraded when internal ok but isitup returns non-JSON', async () => {
    const { fetch } = createMockFetcher([
      { match: `https://${DOMAIN}/`, status: 200 },
      { match: 'isitup.org', status: 200, body: '<html>not json' },
    ]);

    const result = await byoiHealthCheck({
      fetchImpl: fetch,
      config: { domain: DOMAIN } as unknown as ByoiConfig,
      logger: createSilentLogger(),
      sleep: async () => {},
      internalRetryTimeoutMs: 50,
    });

    expect(result.status).toBe('degraded');
    const ext = result.checks.find((c) => c.name === 'external_reachability');
    expect(ext?.status).toBe('warn');
    expect(ext?.message).toContain('non-JSON');
  });
});
