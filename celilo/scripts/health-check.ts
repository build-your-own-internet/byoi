import { defineHook } from '@celilo/capabilities';
import type {
  Fetcher,
  HealthCheckItem,
  HealthCheckOutput,
  HookLogger,
} from '@celilo/capabilities';
import type { ByoiConfig } from '../celilo/types';

interface IsitupResponse {
  domain: string;
  port: number;
  status_code: number;
  response_ip: string;
  response_code: number;
  response_time: number;
}

export interface RetryFetchOpts {
  fetchImpl: Fetcher;
  url: string;
  totalTimeoutMs: number;
  logger: HookLogger;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  perAttemptTimeoutMs?: number;
  attemptIntervalMs?: number;
}

export async function retryFetch(
  opts: RetryFetchOpts,
): Promise<{ ok: boolean; message: string; attempts: number }> {
  const fetchImpl = opts.fetchImpl;
  const logger = opts.logger;
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = opts.now ?? (() => Date.now());
  const perAttemptTimeoutMs = opts.perAttemptTimeoutMs ?? 5_000;
  const attemptIntervalMs = opts.attemptIntervalMs ?? 3_000;

  const start = now();
  let lastMessage = '';
  let attempt = 0;
  while (now() - start < opts.totalTimeoutMs) {
    attempt += 1;
    const elapsedSec = Math.floor((now() - start) / 1000);
    logger.info(`attempt ${attempt} (${elapsedSec}s elapsed)`);
    try {
      const response = await fetchImpl(opts.url, {
        signal: AbortSignal.timeout(perAttemptTimeoutMs),
        redirect: 'follow',
      });
      if (response.ok) {
        return { ok: true, message: `${opts.url} → ${response.status}`, attempts: attempt };
      }
      lastMessage = `${opts.url} returned ${response.status}`;
    } catch (error) {
      lastMessage = `Request failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (now() - start + attemptIntervalMs >= opts.totalTimeoutMs) break;
    await sleep(attemptIntervalMs);
  }
  return { ok: false, message: lastMessage, attempts: attempt };
}

export function evaluateIsitup(body: IsitupResponse, domain: string): HealthCheckItem {
  const isUp =
    body.status_code === 1 && body.response_code >= 200 && body.response_code < 400;
  return {
    name: 'external_reachability',
    status: isUp ? 'pass' : 'fail',
    message: isUp
      ? `isitup.org confirms ${domain} is up (${body.response_code}, ${body.response_time.toFixed(2)}s)`
      : `isitup.org reports ${domain} unreachable (status_code=${body.status_code}, response_code=${body.response_code})`,
  };
}

export interface ByoiHealthDeps {
  fetchImpl: Fetcher;
  config: ByoiConfig;
  logger: HookLogger;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Override the default 45s retry budget — intended for tests. */
  internalRetryTimeoutMs?: number;
}

export async function byoiHealthCheck(deps: ByoiHealthDeps): Promise<HealthCheckOutput> {
  const { fetchImpl, config, logger, sleep, now } = deps;
  const checks: HealthCheckItem[] = [];
  const domain = config.domain || 'www.buildyourowninternet.dev';
  const url = `https://${domain}/`;

  logger.info(`Checking ${url}`);
  const internalResult = await retryFetch({
    fetchImpl,
    url,
    totalTimeoutMs: deps.internalRetryTimeoutMs ?? 45_000,
    logger,
    sleep,
    now,
  });
  checks.push({
    name: 'internal_http',
    status: internalResult.ok ? 'pass' : 'fail',
    message: internalResult.message,
  });

  const proberUrl = `https://isitup.org/api.json?url=${encodeURIComponent(domain)}`;
  logger.info(`Checking external reachability via ${proberUrl}`);
  try {
    const response = await fetchImpl(proberUrl, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      checks.push({
        name: 'external_reachability',
        status: 'warn',
        message: `isitup.org returned ${response.status}`,
      });
    } else {
      const raw = await response.text();
      try {
        const body = JSON.parse(raw) as IsitupResponse;
        checks.push(evaluateIsitup(body, domain));
      } catch {
        checks.push({
          name: 'external_reachability',
          status: 'warn',
          message: `isitup.org returned non-JSON (${response.status}, ct=${response.headers.get('content-type')}): ${raw.slice(0, 120)}`,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({
      name: 'external_reachability',
      status: 'warn',
      message: `isitup.org prober unreachable: ${message}`,
    });
  }

  for (const c of checks) {
    const icon = c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✗';
    logger.info(`${icon} ${c.name}: ${c.message}`);
  }

  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarn = checks.some((c) => c.status === 'warn');
  const status = hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy';

  logger.success(
    `Health: ${status} (${checks.filter((c) => c.status === 'pass').length}/${checks.length} pass)`,
  );
  return { status, checks };
}

export default defineHook<ByoiConfig, [], [], 'health_check'>({
  hook: 'health_check',
  requires: [],
  handler: async ({ config, logger }) =>
    byoiHealthCheck({ fetchImpl: fetch, config, logger }),
});
