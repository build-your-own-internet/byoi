import { describe, expect, test } from 'bun:test';
import { createSilentLogger } from '@celilo/capabilities';
import type {
  PublicWebCapability,
  PublishStaticSiteRequest,
} from '@celilo/capabilities';
import { byoiPublish } from './publish';
import type { ByoiConfig } from '../celilo/types';

const DOMAIN = 'www.buildyourowninternet.dev';

function makePublicWeb(
  result = { success: true, path: '/', filesUploaded: 42, contentHash: 'abc' },
): PublicWebCapability & { calls: PublishStaticSiteRequest[] } {
  const calls: PublishStaticSiteRequest[] = [];
  return {
    calls,
    defaultHostname: DOMAIN,
    async publishStaticSite(req: PublishStaticSiteRequest) {
      calls.push(req);
      return result;
    },
    async registerReverseProxy() {
      return { success: true, path: '/' };
    },
    async register_route() {
      return { success: true };
    },
    async upload_static_assets() {
      return { success: true, filesUploaded: 0, contentHash: '' };
    },
    async unregister_routes() {},
    async getServerIp() {
      return '10.0.20.5';
    },
  };
}

describe('byoiPublish', () => {
  test('throws when public_web is missing', async () => {
    await expect(
      byoiPublish({
        config: { domain: DOMAIN } as unknown as ByoiConfig,
        logger: createSilentLogger(),
        capabilities: {},
      }),
    ).rejects.toThrow(/public_web capability not available/);
  });

  test('publishes to config.domain with root path', async () => {
    const public_web = makePublicWeb();

    await byoiPublish({
      config: { domain: DOMAIN } as unknown as ByoiConfig,
      logger: createSilentLogger(),
      capabilities: { public_web },
      distDir: '/tmp/fake-dist',
    });

    expect(public_web.calls).toHaveLength(1);
    expect(public_web.calls[0]).toEqual({
      path: '/',
      sourceDir: '/tmp/fake-dist',
      hostname: DOMAIN,
    });
  });

  test('throws when publishStaticSite returns success=false', async () => {
    const public_web = makePublicWeb({ success: false, path: '/', filesUploaded: 0, contentHash: '' });

    await expect(
      byoiPublish({
        config: { domain: DOMAIN } as unknown as ByoiConfig,
        logger: createSilentLogger(),
        capabilities: { public_web },
        distDir: '/tmp/fake-dist',
      }),
    ).rejects.toThrow(/Failed to publish/);
  });

  test('logs files-uploaded count on success', async () => {
    const public_web = makePublicWeb({ success: true, path: '/', filesUploaded: 7, contentHash: 'x' });
    const logger = createSilentLogger();

    await byoiPublish({
      config: { domain: DOMAIN } as unknown as ByoiConfig,
      logger,
      capabilities: { public_web },
      distDir: '/tmp/x',
    });

    expect(logger.messages.some((m) => m.message.includes('Published 7 files'))).toBe(true);
  });
});
