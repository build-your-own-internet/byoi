#!/usr/bin/env bun
// ponytail: minimal check of the pure PKCE/JWT helpers (browser flow covered by e2e, by-9td.10)
import assert from 'node:assert';
import { base64UrlEncode, decodeJWT, getUser } from '../src/lib/auth-client';

// dev-mode auto-login (by-9td.4) — in bun, import.meta.env aliases process.env
process.env.PUBLIC_AUTH_MODE = 'dev';
assert.deepStrictEqual(getUser(), { username: 'dev', groups: ['byoi-admins'] });
delete process.env.PUBLIC_AUTH_MODE;
assert.strictEqual(getUser(), null, 'no dev mode + no tokens must mean logged out');

// base64UrlEncode: URL-safe, unpadded, round-trips
const encoded = base64UrlEncode(new Uint8Array([251, 239, 190, 0, 1]));
assert(!/[+/=]/.test(encoded), 'encoding must be URL-safe and unpadded');
assert.strictEqual(
  atob(encoded.replace(/-/g, '+').replace(/_/g, '/')),
  String.fromCharCode(251, 239, 190, 0, 1)
);

// decodeJWT: extracts payload claims
const payload = btoa(JSON.stringify({ preferred_username: 'byoi_admin', groups: ['byoi-admins'] }))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const claims = decodeJWT(`header.${payload}.sig`);
assert.strictEqual(claims?.preferred_username, 'byoi_admin');
assert.deepStrictEqual(claims?.groups, ['byoi-admins']);

// decodeJWT: null on garbage
assert.strictEqual(decodeJWT('not-a-jwt'), null);

console.log('✓ auth-client checks passed');
